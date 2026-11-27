/**
 * LLM providers for the evaluation harness.
 *
 * Both arms are asked for the same two things — a component breakdown and the
 * code that realises it — so that fidelity and acceptance are measured over
 * comparable artefacts. The arms differ only in what they are told: the
 * composition arm receives the ontology and the composition prompt, the baseline
 * arm is given a plain software-engineering instruction.
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
  /**
   * `responses` uses the OpenAI Responses API (the default for openai.com).
   * `chat` uses Chat Completions, for OpenAI-compatible gateways (vLLM, Ollama,
   * Together, Groq, LM Studio, ...) that do not implement `/responses`.
   */
  api?: 'responses' | 'chat';
  /** Total attempts per request, including the first. Default 4. */
  maxAttempts?: number;
  /** Base delay for exponential backoff, in ms. Default 500. */
  retryBaseMs?: number;
  /** Per-request timeout, in ms. Default 120000. */
  timeoutMs?: number;
}

export const DEFAULT_MODEL = 'gpt-4o';

/** Every family a plan must carry, so the model cannot omit a bucket. */
const PLAN_FIELDS = 'objects, properties, actions, interfaces, intelligence, rules';

const PLAN_SHAPE = `{
  "objects": [], "properties": [], "actions": [], "interfaces": [], "intelligence": [], "rules": [],
  "notes": "optional short rationale",
  "code": "the wiring code"
}`;

/**
 * Strict JSON Schema for an arm response. Sent with the Responses API so the
 * model is constrained to emit parseable, correctly-shaped JSON instead of
 * free-form prose that has to be coaxed into shape afterwards.
 *
 * `notes` is required by strict schema mode even though it is semantically
 * optional; the prompt tells the model it may be empty.
 */
const ARM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['objects', 'properties', 'actions', 'interfaces', 'intelligence', 'rules', 'notes', 'code'],
  properties: {
    objects: { type: 'array', items: { type: 'string' } },
    properties: { type: 'array', items: { type: 'string' } },
    actions: { type: 'array', items: { type: 'string' } },
    interfaces: { type: 'array', items: { type: 'string' } },
    intelligence: { type: 'array', items: { type: 'string' } },
    rules: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
    code: { type: 'string' },
  },
} as const;

interface ResponsesPayload {
  output_text?: string;
  output?: { content?: { type?: string; text?: string }[] }[];
  error?: { message?: string };
}

interface ChatPayload {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

/**
 * Pull the text out of a Responses API payload. The convenience `output_text`
 * field is preferred; otherwise concatenate the `output_text` chunks nested
 * under `output[].content[]`, which is the shape the raw API returns.
 */
export function extractOutputText(payload: ResponsesPayload): string | null {
  if (typeof payload.output_text === 'string' && payload.output_text.length > 0) {
    return payload.output_text;
  }
  const parts: string[] = [];
  for (const item of payload.output ?? []) {
    for (const chunk of item.content ?? []) {
      if (chunk.type === 'output_text' && typeof chunk.text === 'string') {
        parts.push(chunk.text);
      }
    }
  }
  return parts.length > 0 ? parts.join('') : null;
}

/**
 * Return a JSON substring from a model response.
 *
 * Models drift between emitting bare JSON, a fenced ```json block, or a short
 * prose preamble. Only the fallback path extracts: a response that is already
 * valid JSON is returned unchanged, so this never rewrites a legitimate payload.
 */
export function coerceJson(text: string): string {
  const trimmed = text.trim();
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // fall through to extraction
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    // fall through to the balanced scanner
  }

  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error('Model response contained no JSON object or array');

  const opener = candidate[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i++) {
    const char = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === opener) depth++;
    else if (char === closer) {
      depth--;
      if (depth === 0) return candidate.slice(start, i + 1);
    }
  }

  throw new Error('Model response contained truncated JSON');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAIProvider implements LLMProvider {
  private config: OpenAIConfig;
  private baseUrl: string;

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  }

  private get model(): string {
    return this.config.model ?? DEFAULT_MODEL;
  }

  private get api(): 'responses' | 'chat' {
    if (this.config.api) return this.config.api;
    // Only default to /responses for OpenAI itself. Gateways built around
    // Chat Completions would 404.
    try {
      return /(^|\.)openai\.com$/.test(new URL(this.baseUrl).hostname) ? 'responses' : 'chat';
    } catch {
      return 'chat';
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const maxAttempts = Math.max(1, this.config.maxAttempts ?? 4);
    const baseMs = Math.max(0, this.config.retryBaseMs ?? 500);
    const timeoutMs = Math.max(1, this.config.timeoutMs ?? 120_000);
    let lastError = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt === maxAttempts) throw new Error(`OpenAI request failed: ${lastError}`);
        await sleep(baseMs * 2 ** (attempt - 1));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        lastError = `${response.status} ${errorText.slice(0, 500)}`;
        if (!isRetryableStatus(response.status) || attempt === maxAttempts) {
          throw new Error(`OpenAI API error: ${lastError}`);
        }
        const jitter = baseMs === 0 ? 0 : Math.floor(Math.random() * 250);
        await sleep(baseMs * 2 ** (attempt - 1) + jitter);
        continue;
      }

      return (await response.json()) as T;
    }

    throw new Error(`OpenAI request failed after ${maxAttempts} attempts: ${lastError}`);
  }

  private async complete(messages: { role: string; content: string }[], json: boolean): Promise<string> {
    if (this.api === 'responses') {
      const payload = await this.post<ResponsesPayload>('/responses', {
        model: this.model,
        input: messages,
        ...(json
          ? {
              text: {
                format: {
                  type: 'json_schema',
                  name: 'arm_response',
                  strict: true,
                  schema: ARM_SCHEMA,
                },
              },
            }
          : {}),
      });
      const text = extractOutputText(payload);
      if (text === null) {
        throw new Error(`No output text in response: ${JSON.stringify(payload.error ?? payload).slice(0, 300)}`);
      }
      return text;
    }

    const payload = await this.post<ChatPayload>('/chat/completions', {
      model: this.model,
      messages,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    });
    const content = payload.choices?.[0]?.message?.content;
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
      parsed = JSON.parse(coerceJson(raw)) as Record<string, unknown>;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`response was not JSON: ${message}`);
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
          // Deliberately does not name the ontology's six families. The output
          // schema still uses the same six buckets because both arms must be
          // scored by the same functions; that is the measurement instrument,
          // not a description of the table.
          content:
            'You are a software engineer. Plan and implement the feature below. ' +
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
