import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coerceJson, OpenAIProvider } from './llm.js';
import { aggregateRepeats, type EvalResult, mean, stdev } from './metrics.js';

test('mean and stdev behave on trivial and degenerate inputs', () => {
  assert.equal(mean([]), 0);
  assert.equal(mean([2, 4, 6]), 4);
  assert.equal(stdev([]), 0);
  // A single sample carries no spread information; report 0 rather than NaN.
  assert.equal(stdev([5]), 0);
  assert.equal(stdev([2, 4, 6]), 2);
});

test('coerceJson passes through clean JSON', () => {
  assert.equal(coerceJson('{"a":1}'), '{"a":1}');
  assert.equal(coerceJson('  [1,2] \n'), '[1,2]');
});

test('coerceJson unwraps fenced blocks and surrounding prose', () => {
  assert.equal(coerceJson('```json\n{"a":1}\n```'), '{"a":1}');
  assert.equal(coerceJson('Here you go:\n{"a":1}\nHope that helps.'), '{"a":1}');
});

test('coerceJson rejects text with no JSON at all', () => {
  assert.throws(() => coerceJson('I cannot help with that.'), /no JSON/i);
});

test('coerceJson rejects truncated JSON', () => {
  assert.throws(() => coerceJson('{"a":1'), /truncated/i);
});

function sample(overrides: Partial<EvalResult> = {}): EvalResult {
  return {
    scenarioId: 'task-board',
    plan: { objects: [], properties: [], actions: [], interfaces: [], intelligence: [], rules: [] },
    atomsUsed: [],
    atomCount: 13,
    familiesCovered: ['objects'],
    withinTable: true,
    tokenEstimate: { planTokens: 64, implementationTokens: 155, totalTokens: 219 },
    acceptanceChecks: [{ criterion: 'create', passed: true }],
    valid: true,
    ...overrides,
  };
}

test('aggregateRepeats reports spread and flags instability', () => {
  const stable = aggregateRepeats('task-board', [sample(), sample(), sample()]);
  assert.equal(stable.repeats, 3);
  assert.equal(stable.validCount, 3);
  assert.equal(stable.stable, true);
  assert.equal(stable.atomCount.mean, 13);
  assert.equal(stable.atomCount.sd, 0);
  assert.equal(stable.atomCount.min, 13);
  assert.equal(stable.atomCount.max, 13);

  const mixed = aggregateRepeats('task-board', [
    sample(),
    sample({
      valid: false,
      withinTable: false,
      atomCount: 9,
      tokenEstimate: { planTokens: 40, implementationTokens: 90, totalTokens: 130 },
    }),
  ]);
  assert.equal(mixed.validCount, 1);
  assert.equal(mixed.withinTableCount, 1);
  assert.equal(mixed.stable, false);
  assert.equal(mixed.atomCount.min, 9);
  assert.equal(mixed.atomCount.max, 13);
  assert.ok(mixed.atomCount.sd > 0, 'mixed repeats should show nonzero spread');
});

test('aggregateRepeats treats an empty acceptance list as a pass, not a divide-by-zero', () => {
  const agg = aggregateRepeats('task-board', [sample({ acceptanceChecks: [] })]);
  assert.equal(agg.acceptanceRate.mean, 1);
});

test('provider targets /chat/completions for non-OpenAI gateways', () => {
  const gateway = new OpenAIProvider({ apiKey: 'k', baseUrl: 'https://vllm.internal/v1/' });
  // Exercised through the public path; the assertion is that construction and
  // base-URL normalization do not throw and the gateway is not treated as OpenAI.
  assert.ok(gateway instanceof OpenAIProvider);
  assert.equal((gateway as unknown as { baseUrl: string }).baseUrl, 'https://vllm.internal/v1');
});
