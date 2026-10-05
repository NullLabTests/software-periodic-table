/**
 * LLM providers for the evaluation harness.
 *
 * Both arms are asked for the same two things — a component breakdown and the
 * code that realises it — so that token counts, fidelity and acceptance are
 * measured over comparable artefacts. The arms differ only in what they are
 * told: the composition arm receives the ontology and the composition prompt,
 * the baseline arm is given a plain software-engineering instruction.
 */

import type { CompositionPlan } from './metrics.js';

export interface ArmOutput {
  plan: CompositionPlan;
  code: string;
}

export interface LLMProvider {
  generateComposition(featureRequest: string, ontologyContext: string): Promise<ArmOutput>;
  generateBaseline(featureRequest: string): Promise<ArmOutput>;
}

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface ChatResponse {
  choices: { message: { content: string } }[];
}

/** Every family a plan must carry, so the model cannot omit a bucket. */
const PLAN_FIELDS = 'objects, properties, actions, interfaces, intelligence, rules';

const PLAN_SHAPE = `{
  "objects": [], "properties": [], "actions": [], "interfaces": [], "intelligence": [], "rules": [],
  "notes": "optional short rationale"
}`;

export class OpenAIProvider implements LLMProvider {
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  private get model(): string {
    return this.config.model ?? 'gpt-4o';
  }

  private get endpoint(): string {
    return `${this.config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`;
  }

  private async complete(messages: { role: string; content: string }[], jsonMode: boolean): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      // `json_object` mode rather than strict `json_schema`: strict mode demands
      // `additionalProperties: false` and every property required, and is not
      // available on every OpenAI-compatible endpoint this harness supports
      // (see LLM_BASE_URL). The plan shape is described in the prompt and
      // `parseArm` below is defensive about what it accepts, so the looser mode
      // costs little and works more widely. Switching to strict mode is a
      // worthwhile improvement once it can be tested against a live endpoint.
      body: JSON.stringify({
        model: this.model,
        messages,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${this.model} API error ${response.status}: ${error.slice(0, 500)}`);
    }

    const data = (await response.json()) as ChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('provider returned an empty completion');
    return content;
  }

  /**
   * Pull a plan and a code block out of a model response. The plan may be the
   * whole object or nested under `plan`; code may be a `code` field or fenced
   * in the text. Models drift between these shapes, so accept the common ones
   * rather than failing the run.
   */
  private parseArm(raw: string): ArmOutput {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const body = fenced?.[1]?.trim();
      if (!body) throw new Error('response was not JSON and had no fenced block');
      parsed = JSON.parse(body) as Record<string, unknown>;
    }

    const planSource = (parsed.plan ?? parsed) as Record<string, unknown>;
    const plan: CompositionPlan = {
      objects: [],
      properties: [],
      actions: [],
      interfaces: [],
      intelligence: [],
      rules: [],
    };
    for (const family of ['objects', 'properties', 'actions', 'interfaces', 'intelligence', 'rules'] as const) {
      const value = planSource[family];
      if (Array.isArray(value)) {
        plan[family] = value.map((item) =>
          String(typeof item === 'string' ? item : ((item as { name?: string })?.name ?? '')),
        );
      }
    }
    if (typeof planSource.notes === 'string') plan.notes = planSource.notes;

    const code = typeof parsed.code === 'string' ? parsed.code : (/```[\s\S]*?```/.exec(raw)?.[0] ?? '');

    return { plan, code };
  }

  async generateComposition(featureRequest: string, ontologyContext: string): Promise<ArmOutput> {
    const content = await this.complete(
      [
        {
          role: 'system',
          content:
            'You are a software composition agent. Select and wire existing software elements instead of reinventing them. ' +
            `Every element you use must come from the table below. Respond with JSON only. Fields: ${PLAN_FIELDS}, plus "code" with the wiring code. Plan shape: ${PLAN_SHAPE}`,
        },
        { role: 'user', content: `${ontologyContext}\n\nFeature request: ${featureRequest}` },
      ],
      true,
    );
    return this.parseArm(content);
  }

  async generateBaseline(featureRequest: string): Promise<ArmOutput> {
    const content = await this.complete(
      [
        {
          role: 'system',
          content:
            'You are a software engineer. Plan and implement the feature below. Break the design into entities, fields, operations, views, AI features and governance rules. ' +
            'Use ordinary descriptive names for the components you create. ' +
            `Respond with JSON only. Fields: ${PLAN_FIELDS}, plus "code" with the implementation. Plan shape: ${PLAN_SHAPE}`,
        },
        { role: 'user', content: `Feature request: ${featureRequest}` },
      ],
      true,
    );
    return this.parseArm(content);
  }
}
