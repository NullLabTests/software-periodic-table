import type { CompositionPlan } from './metrics.js';

export interface LLMProvider {
  generateCompositionPlan(
    featureRequest: string,
    ontologyContext: string,
    systemPrompt: string,
  ): Promise<CompositionPlan>;
  generateBaseline(featureRequest: string): Promise<string>;
}

export interface OpenAIConfig {
  apiKey: string;
  /** Model id. Defaults to a current, generally-available model. */
  model?: string;
  baseUrl?: string;
  /**
   * "responses" uses the OpenAI Responses API (default).
   * "chat" uses Chat Completions, for OpenAI-compatible gateways
   * (vLLM, Ollama, Together, Groq, LM Studio, ...) that do not
   * implement /responses.
   */
  api?: 'responses' | 'chat';
  /** Total attempts per request, including the first. Default 4. */
  maxAttempts?: number;
  /** Base delay for exponential backoff, in ms. Default 500. */
  retryBaseMs?: number;
  /** Per-request timeout, in ms. Default 120000. */
  timeoutMs?: number;
}

export const DEFAULT_MODEL = 'gpt-4.1';

/**
 * Strict JSON Schema for a composition plan. Sent with the request so the
 * model is constrained to emit parseable, correctly-shaped JSON instead of
 * free-form prose we then have to coax into the shape.
 */
const COMPOSITION_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['objects', 'properties', 'actions', 'interfaces', 'intelligence', 'rules'],
  properties: {
    objects: { type: 'array', items: { type: 'string' } },
    properties: { type: 'array', items: { type: 'string' } },
    actions: { type: 'array', items: { type: 'string' } },
    interfaces: { type: 'array', items: { type: 'string' } },
    intelligence: { type: 'array', items: { type: 'string' } },
    rules: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
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

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function extractOutputText(payload: ResponsesPayload): string | null {
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
 * Tolerates models that wrap JSON in a ```json fence, or prefix it with prose.
 * Only applied when the raw text fails to parse.
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
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.search(/[[{]/);
  if (start === -1) {
    throw new Error('Model response contained no JSON object or array');
  }
  const opener = candidate[start];
  const closer = opener === '{' ? '}' : ']';
  const end = candidate.lastIndexOf(closer);
  if (end <= start) {
    throw new Error('Model response contained truncated JSON');
  }
  return candidate.slice(start, end + 1);
}

export class OpenAIProvider implements LLMProvider {
  private config: OpenAIConfig;
  private baseUrl: string;

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  }

  private get api(): 'responses' | 'chat' {
    if (this.config.api) return this.config.api;
    // Only default to /responses for OpenAI itself. Gateways built around
    // Chat Completions would 404.
    return /(^|\.)openai\.com$/.test(new URL(this.baseUrl).hostname) ? 'responses' : 'chat';
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const maxAttempts = Math.max(1, this.config.maxAttempts ?? 4);
    const baseMs = this.config.retryBaseMs ?? 500;
    const timeoutMs = this.config.timeoutMs ?? 120_000;
    let lastError = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          lastError = `${response.status} ${errorText.slice(0, 500)}`;
          if (!isRetryableStatus(response.status) || attempt === maxAttempts) {
            throw new Error(`OpenAI API error: ${lastError}`);
          }
        } else {
          return (await response.json()) as T;
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('OpenAI API error:')) throw err;
        // Timeouts and transport resets are worth one more shot.
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt === maxAttempts) throw new Error(`OpenAI request failed: ${lastError}`);
      }

      const delay = baseMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new Error(`OpenAI request failed after ${maxAttempts} attempts: ${lastError}`);
  }

  private async complete(messages: { role: string; content: string }[], json: boolean): Promise<string> {
    const model = this.config.model ?? DEFAULT_MODEL;

    if (this.api === 'responses') {
      const payload = await this.post<ResponsesPayload>('/responses', {
        model,
        input: messages,
        ...(json
          ? {
              text: {
                format: {
                  type: 'json_schema',
                  name: 'composition_plan',
                  strict: true,
                  schema: COMPOSITION_PLAN_SCHEMA,
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
      model,
      messages,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    });
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error(`No output text in response: ${JSON.stringify(payload.error ?? payload).slice(0, 300)}`);
    }
    return content;
  }

  async generateCompositionPlan(
    featureRequest: string,
    ontologyContext: string,
    systemPrompt: string,
  ): Promise<CompositionPlan> {
    const text = await this.complete(
      [
        { role: 'system', content: `${systemPrompt}\n\n${ontologyContext}` },
        {
          role: 'user',
          content: `Feature request: ${featureRequest}\n\nEmit a composition plan as JSON matching the schema.`,
        },
      ],
      true,
    );
    return JSON.parse(coerceJson(text)) as CompositionPlan;
  }

  async generateBaseline(featureRequest: string): Promise<string> {
    return this.complete(
      [
        {
          role: 'system',
          content:
            'You are a software engineer. Generate code for the following feature request. Be concise but complete.',
        },
        { role: 'user', content: featureRequest },
      ],
      false,
    );
  }
}
