import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { coerceJson, DEFAULT_MODEL, extractOutputText, isRetryableStatus, OpenAIProvider } from '../eval/llm.js';

interface FetchCall {
  url: string;
  init: RequestInit;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const requestInit = init ?? {};
    calls.push({ url, init: requestInit });
    return handler(url, requestInit);
  }) as typeof fetch;
  return calls;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const PLAN_JSON = JSON.stringify({
  objects: ['Tk'],
  properties: ['Ss'],
  actions: ['Cr'],
  interfaces: [],
  intelligence: [],
  rules: [],
  notes: 'why',
  code: 'const task = createTask();',
});

describe('coerceJson', () => {
  it('returns already-valid JSON unchanged', () => {
    assert.equal(coerceJson('{"a":1}'), '{"a":1}');
  });

  it('extracts JSON from a fenced block', () => {
    assert.equal(coerceJson('```json\n{"a":1}\n```'), '{"a":1}');
  });

  it('extracts JSON surrounded by prose', () => {
    assert.equal(coerceJson('Here is the plan:\n{"a":{"b":2}}\nThanks'), '{"a":{"b":2}}');
  });

  it('does not stop at a brace inside a JSON string', () => {
    const text = '{"code":"if (x) { return {a: 1}; }","plan":{"objects":[]}}';
    assert.equal(coerceJson(text), text);
  });

  it('rejects a response with no JSON at all', () => {
    assert.throws(() => coerceJson('no json here'), /no JSON object or array/);
  });

  it('rejects truncated JSON', () => {
    assert.throws(() => coerceJson('{"a":1'), /truncated JSON/);
  });
});

describe('extractOutputText', () => {
  it('prefers the convenience output_text field', () => {
    assert.equal(extractOutputText({ output_text: 'hello' }), 'hello');
  });

  it('joins output_text chunks from the raw output array', () => {
    assert.equal(
      extractOutputText({
        output: [
          { content: [{ type: 'output_text', text: 'one ' }] },
          { content: [{ type: 'output_text', text: 'two' }] },
        ],
      }),
      'one two',
    );
  });

  it('returns null when there is no text', () => {
    assert.equal(extractOutputText({}), null);
    assert.equal(extractOutputText({ output: [{ content: [{ type: 'refusal', text: 'no' }] }] }), null);
  });
});

describe('isRetryableStatus', () => {
  it('retries rate limits and server errors', () => {
    for (const status of [408, 409, 425, 429, 500, 503]) {
      assert.equal(isRetryableStatus(status), true, `status ${status}`);
    }
  });

  it('does not retry client errors', () => {
    for (const status of [400, 401, 403, 404, 422]) {
      assert.equal(isRetryableStatus(status), false, `status ${status}`);
    }
  });
});

describe('OpenAIProvider', () => {
  it('defaults to a current model', () => {
    assert.equal(DEFAULT_MODEL, 'gpt-4o');
  });

  it('uses the Responses API and strict JSON schema for openai.com', async () => {
    const calls = stubFetch(() => jsonResponse({ output_text: PLAN_JSON }));
    const provider = new OpenAIProvider({ apiKey: 'test', baseUrl: 'https://api.openai.com/v1' });

    const output = await provider.generateComposition('build a board', 'table context');

    assert.equal(calls[0]?.url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(String(calls[0]?.init.body)) as {
      text?: { format?: { type?: string; strict?: boolean } };
    };
    assert.equal(body.text?.format?.type, 'json_schema');
    assert.equal(body.text?.format?.strict, true);
    assert.deepEqual(output.plan.objects, ['Tk']);
    assert.equal(output.code, 'const task = createTask();');
  });

  it('uses Chat Completions for an OpenAI-compatible gateway', async () => {
    const calls = stubFetch(() => jsonResponse({ choices: [{ message: { content: PLAN_JSON } }] }));
    const provider = new OpenAIProvider({ apiKey: 'test', baseUrl: 'https://gateway.example/v1' });

    const output = await provider.generateBaseline('build a board');

    assert.equal(calls[0]?.url, 'https://gateway.example/v1/chat/completions');
    assert.deepEqual(output.plan.actions, ['Cr']);
  });

  it('honours an explicit api override', async () => {
    const calls = stubFetch(() => jsonResponse({ output_text: PLAN_JSON }));
    const provider = new OpenAIProvider({
      apiKey: 'test',
      baseUrl: 'https://gateway.example/v1',
      api: 'responses',
    });

    await provider.generateBaseline('build a board');
    assert.equal(calls[0]?.url, 'https://gateway.example/v1/responses');
  });

  it('retries retryable failures and succeeds', async () => {
    let attempts = 0;
    const calls = stubFetch(() => {
      attempts++;
      return attempts === 1 ? jsonResponse({ error: 'temporary' }, 503) : jsonResponse({ output_text: PLAN_JSON });
    });
    const provider = new OpenAIProvider({
      apiKey: 'test',
      baseUrl: 'https://api.openai.com/v1',
      maxAttempts: 2,
      retryBaseMs: 0,
    });

    const output = await provider.generateBaseline('build a board');
    assert.equal(calls.length, 2);
    assert.deepEqual(output.plan.objects, ['Tk']);
  });

  it('does not retry a non-retryable client error', async () => {
    let attempts = 0;
    const calls = stubFetch(() => {
      attempts++;
      return jsonResponse({ error: 'bad request' }, 400);
    });
    const provider = new OpenAIProvider({
      apiKey: 'test',
      baseUrl: 'https://api.openai.com/v1',
      maxAttempts: 4,
      retryBaseMs: 0,
    });

    await assert.rejects(provider.generateBaseline('build a board'), /400/);
    assert.equal(attempts, 1);
    assert.equal(calls.length, 1);
  });

  it('rejects an empty Responses payload', async () => {
    stubFetch(() => jsonResponse({ output: [] }));
    const provider = new OpenAIProvider({ apiKey: 'test', baseUrl: 'https://api.openai.com/v1' });

    await assert.rejects(provider.generateBaseline('build a board'), /No output text/);
  });
});
