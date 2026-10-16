import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CreateMeta,
  createAction,
  DeleteMeta,
  deleteAction,
  executeInMemory,
  UpdateMeta,
  updateAction,
  ViewMeta,
  viewAction,
} from '../atoms/actions/crud.js';
import { AssignMeta, assignAction, MessageMeta, NotifyMeta, notifyAction } from '../atoms/actions/notify.js';
import {
  ExportMeta,
  exportAction,
  FilterMeta,
  filterAction,
  SearchMeta as SearchActionMeta,
  SortMeta,
  searchAction,
  sortAction,
} from '../atoms/actions/search-filter.js';
import { AnalyzeMeta, createAnalyze } from '../atoms/intelligence/analyze.js';
import { ClassifyMeta, createClassify } from '../atoms/intelligence/classify.js';
import { createExtract, ExtractMeta } from '../atoms/intelligence/extract.js';
import { createGenerate, GenerateMeta } from '../atoms/intelligence/generate.js';
import { createPrompt, PromptMeta } from '../atoms/intelligence/prompt.js';
import { createRecommend, RecommendMeta } from '../atoms/intelligence/recommend.js';
import { createSearch, SearchMeta } from '../atoms/intelligence/search.js';
import { createSummarize, SummarizeMeta } from '../atoms/intelligence/summarize.js';
import { CalendarMeta, defineCalendar, materializeCalendar } from '../atoms/interfaces/calendar.js';
import { ChartMeta, defineChart, materializeChart } from '../atoms/interfaces/chart.js';
import { DetailMeta, defineDetail, materializeDetail } from '../atoms/interfaces/detail.js';
import { defineForm, FormMeta, materializeForm } from '../atoms/interfaces/form.js';
import { AddressMeta, formatAddress } from '../atoms/properties/address.js';
import { AiFieldMeta, isAiGenerated, markAiGenerated } from '../atoms/properties/ai-field.js';
import { BooleanMeta, parseBoolean } from '../atoms/properties/boolean.js';
import { CountMeta, isValidCount } from '../atoms/properties/count.js';
import { CommonCurrencies, CurrencyMeta } from '../atoms/properties/currency.js';
import { DateMeta, DateTimeMeta, formatDate, formatDateTime } from '../atoms/properties/date.js';
import { EndDateMeta, isValidRange, rangeDurationMs, StartDateMeta } from '../atoms/properties/date-range.js';
import { DurationMeta, daysToMs, formatDuration, hoursToMs, minutesToMs } from '../atoms/properties/duration.js';
import { EmailMeta, isValidEmail, normalizeEmail } from '../atoms/properties/email.js';
import { assertEnumValue, EnumMeta } from '../atoms/properties/enum-field.js';
import { generateId, IdMeta } from '../atoms/properties/id.js';
import { JsonMeta, parseJson } from '../atoms/properties/json.js';
import { clampNumber, NumberMeta, roundTo } from '../atoms/properties/number.js';
import { OwnerMeta } from '../atoms/properties/owner.js';
import { clampPercent, formatPercent, PercentMeta } from '../atoms/properties/percent.js';
import { normalizePhone, PhoneMeta } from '../atoms/properties/phone.js';
import { CommonPriorityValues, PriorityMeta } from '../atoms/properties/priority.js';
import { normalizeScore, ScoreMeta } from '../atoms/properties/score.js';
import { assertValidStatus, CommonStatusVocabularies, StatusMeta } from '../atoms/properties/status.js';
import { isEmptyText, TextMeta, truncateText } from '../atoms/properties/text.js';
import { CreatedAtMeta, initTimestamps, touchTimestamps, UpdatedAtMeta } from '../atoms/properties/timestamps.js';
import { isValidUrl, UrlMeta } from '../atoms/properties/url.js';
import { AuditMeta, createAuditEntry, diffObjects } from '../atoms/rules/audit.js';
import { can, defaultTaskPermissions, PermissionMeta } from '../atoms/rules/permission.js';
import { createPolicy, evaluatePolicy, PolicyMeta } from '../atoms/rules/policy.js';

describe('Intelligence atoms', () => {
  it('Search (Sr) creates a search request', () => {
    assert.equal(SearchMeta.symbol, 'Sr');
    assert.equal(SearchMeta.family, 'intelligence');
    const req = createSearch({ query: 'test', objectType: 'Task', limit: 10 });
    assert.equal(req.query, 'test');
    assert.equal(req.objectType, 'Task');
    assert.equal(req.limit, 10);
  });

  it('Summarize (Sm) creates a summarize request', () => {
    assert.equal(SummarizeMeta.symbol, 'Sm');
    assert.equal(SummarizeMeta.family, 'intelligence');
    const req = createSummarize({ content: 'long text', maxLength: 100, format: 'bullets' });
    assert.equal(req.content, 'long text');
    assert.equal(req.maxLength, 100);
    assert.equal(req.format, 'bullets');
  });

  it('Classify (Cs) creates a classify request', () => {
    assert.equal(ClassifyMeta.symbol, 'Cs');
    assert.equal(ClassifyMeta.family, 'intelligence');
    const req = createClassify({ input: 'text', categories: ['a', 'b'], multiLabel: true });
    assert.equal(req.input, 'text');
    assert.deepEqual(req.categories, ['a', 'b']);
    assert.equal(req.multiLabel, true);
  });

  it('Recommend (Rc) creates a recommend request', () => {
    assert.equal(RecommendMeta.symbol, 'Rc');
    assert.equal(RecommendMeta.family, 'intelligence');
    const req = createRecommend({ itemId: '1', objectType: 'Product', strategy: 'similar', maxResults: 5 });
    assert.equal(req.itemId, '1');
    assert.equal(req.objectType, 'Product');
    assert.equal(req.strategy, 'similar');
    assert.equal(req.maxResults, 5);
  });

  it('Analyze (An) creates an analyze request', () => {
    assert.equal(AnalyzeMeta.symbol, 'An');
    assert.equal(AnalyzeMeta.family, 'intelligence');
    const req = createAnalyze({ data: [1, 2, 3], metrics: ['sum', 'avg'], groupBy: 'category' });
    assert.deepEqual(req.data, [1, 2, 3]);
    assert.deepEqual(req.metrics, ['sum', 'avg']);
    assert.equal(req.groupBy, 'category');
  });

  it('Extract (Ec) creates an extract request', () => {
    assert.equal(ExtractMeta.symbol, 'Ec');
    assert.equal(ExtractMeta.family, 'intelligence');
    const req = createExtract({ source: 'text', schema: { name: 'string' }, sourceType: 'text' });
    assert.equal(req.source, 'text');
    assert.deepEqual(req.schema, { name: 'string' });
    assert.equal(req.sourceType, 'text');
  });

  it('Generate (Gn) creates a generate request', () => {
    assert.equal(GenerateMeta.symbol, 'Gn');
    assert.equal(GenerateMeta.family, 'intelligence');
    const req = createGenerate({ prompt: 'write code', format: 'code', temperature: 0.7, maxTokens: 1000 });
    assert.equal(req.prompt, 'write code');
    assert.equal(req.format, 'code');
    assert.equal(req.temperature, 0.7);
    assert.equal(req.maxTokens, 1000);
  });

  it('Prompt (Pt) creates a prompt request', () => {
    assert.equal(PromptMeta.symbol, 'Pt');
    assert.equal(PromptMeta.family, 'intelligence');
    const req = createPrompt({
      messages: [{ role: 'user', content: 'hello' }],
      model: 'gpt-4o',
      temperature: 0.5,
    });
    assert.equal(req.messages.length, 1);
    assert.equal(req.messages[0]?.content, 'hello');
    assert.equal(req.model, 'gpt-4o');
    assert.equal(req.temperature, 0.5);
  });
});

describe('Properties atoms', () => {
  it('Status (Ss) validates status values', () => {
    assert.equal(StatusMeta.symbol, 'Ss');
    assert.equal(StatusMeta.family, 'properties');
    assertValidStatus('active', CommonStatusVocabularies.user);
    assert.throws(() => assertValidStatus('invalid', CommonStatusVocabularies.user), /Invalid status/);
  });

  it('Text (Tx) checks emptiness and truncates', () => {
    assert.equal(TextMeta.symbol, 'Tx');
    assert.equal(TextMeta.family, 'properties');
    assert.equal(isEmptyText(''), true);
    assert.equal(isEmptyText('   '), true);
    assert.equal(isEmptyText('hello'), false);
    assert.equal(truncateText('hello', 10), 'hello');
    assert.equal(truncateText('hello world', 5), 'hell…');
  });

  it('Number (Nm) clamps and rounds', () => {
    assert.equal(NumberMeta.symbol, 'Nm');
    assert.equal(NumberMeta.family, 'properties');
    assert.equal(clampNumber(5, 0, 10), 5);
    assert.equal(clampNumber(-5, 0, 10), 0);
    assert.equal(clampNumber(15, 0, 10), 10);
    assert.equal(roundTo(Math.PI, 2), 3.14);
    assert.equal(roundTo(Math.PI, 0), 3);
  });

  it('Date (Dt) and DateTime (Dm) format dates', () => {
    assert.equal(DateMeta.symbol, 'Dt');
    assert.equal(DateTimeMeta.symbol, 'Dm');
    const date = new Date('2024-01-15T10:30:00Z');
    assert.equal(formatDate(date), '2024-01-15');
    assert.equal(formatDateTime(date), '2024-01-15T10:30:00.000Z');
  });

  it('Currency (Cu) exposes common currencies', () => {
    assert.equal(CurrencyMeta.symbol, 'Cu');
    assert.equal(CurrencyMeta.family, 'properties');
    assert.ok(CommonCurrencies.includes('USD'));
    assert.ok(CommonCurrencies.includes('EUR'));
  });

  it('Enum (En) validates enum values', () => {
    assert.equal(EnumMeta.symbol, 'En');
    assert.equal(EnumMeta.family, 'properties');
    assertEnumValue('active', ['active', 'inactive']);
    assert.throws(() => assertEnumValue('invalid', ['active', 'inactive']), /Invalid value/);
  });

  it('Boolean (Bl) parses boolean values', () => {
    assert.equal(BooleanMeta.symbol, 'Bl');
    assert.equal(BooleanMeta.family, 'properties');
    assert.equal(parseBoolean(true), true);
    assert.equal(parseBoolean(false), false);
    assert.equal(parseBoolean('true'), true);
    assert.equal(parseBoolean('yes'), true);
    assert.equal(parseBoolean('on'), true);
    assert.equal(parseBoolean('1'), true);
    assert.equal(parseBoolean('false'), false);
    assert.equal(parseBoolean('no'), false);
    assert.equal(parseBoolean('off'), false);
    assert.equal(parseBoolean('0'), false);
    assert.equal(parseBoolean(1), true);
    assert.equal(parseBoolean(0), false);
    assert.throws(() => parseBoolean('maybe'), /Cannot parse/);
  });

  it('ID (Id) generates unique identifiers', () => {
    assert.equal(IdMeta.symbol, 'Id');
    assert.equal(IdMeta.family, 'properties');
    const id1 = generateId();
    const id2 = generateId();
    assert.notEqual(id1, id2);
    assert.ok(id1.length > 0);
    const prefixed = generateId('usr');
    assert.ok(prefixed.startsWith('usr_'));
  });

  it('Owner (Ow) defines owner references', () => {
    assert.equal(OwnerMeta.symbol, 'Ow');
    assert.equal(OwnerMeta.family, 'properties');
  });

  it('Priority (Py) defines common priority values', () => {
    assert.equal(PriorityMeta.symbol, 'Py');
    assert.equal(PriorityMeta.family, 'properties');
    assert.deepEqual([...CommonPriorityValues], ['low', 'medium', 'high', 'urgent']);
  });

  it('CreatedAt (Ca) and UpdatedAt (Ua) manage timestamps', () => {
    assert.equal(CreatedAtMeta.symbol, 'Ca');
    assert.equal(UpdatedAtMeta.symbol, 'Ua');
    const now = new Date('2024-01-01T00:00:00Z');
    const ts = initTimestamps(now);
    assert.equal(ts.createdAt, '2024-01-01T00:00:00.000Z');
    assert.equal(ts.updatedAt, '2024-01-01T00:00:00.000Z');

    const later = new Date('2024-01-02T00:00:00Z');
    const touched = touchTimestamps(ts, later);
    assert.equal(touched.createdAt, '2024-01-01T00:00:00.000Z');
    assert.equal(touched.updatedAt, '2024-01-02T00:00:00.000Z');
  });

  it('Score (Sk) normalizes scores', () => {
    assert.equal(ScoreMeta.symbol, 'Sk');
    assert.equal(ScoreMeta.family, 'properties');
    assert.equal(normalizeScore(50, 0, 100), 0.5);
    assert.equal(normalizeScore(0, 0, 100), 0);
    assert.equal(normalizeScore(100, 0, 100), 1);
    assert.equal(normalizeScore(150, 0, 100), 1);
    assert.equal(normalizeScore(-10, 0, 100), 0);
  });

  it('Percent (Pc) clamps and formats percentages', () => {
    assert.equal(PercentMeta.symbol, 'Pc');
    assert.equal(PercentMeta.family, 'properties');
    assert.equal(clampPercent(50), 50);
    assert.equal(clampPercent(-10), 0);
    assert.equal(clampPercent(110), 100);
    assert.equal(formatPercent(50), '50%');
    assert.equal(formatPercent(50.5, 1), '50.5%');
  });

  it('Duration (Du) converts and formats durations', () => {
    assert.equal(DurationMeta.symbol, 'Du');
    assert.equal(DurationMeta.family, 'properties');
    assert.equal(minutesToMs(1), 60_000);
    assert.equal(hoursToMs(1), 3_600_000);
    assert.equal(daysToMs(1), 86_400_000);
    assert.equal(formatDuration(0), '0m');
    assert.equal(formatDuration(60_000), '1m');
    assert.equal(formatDuration(3_600_000), '1h');
    assert.equal(formatDuration(86_400_000), '1d');
    assert.equal(formatDuration(90_061_000), '1d 1h 1m 1s');
    assert.throws(() => formatDuration(-1), /cannot be negative/);
  });

  it('Count (Cn) validates counts', () => {
    assert.equal(CountMeta.symbol, 'Cn');
    assert.equal(CountMeta.family, 'properties');
    assert.equal(isValidCount(0), true);
    assert.equal(isValidCount(5), true);
    assert.equal(isValidCount(-1), false);
    assert.equal(isValidCount(1.5), false);
  });

  it('JSON (Js) parses JSON safely', () => {
    assert.equal(JsonMeta.symbol, 'Js');
    assert.equal(JsonMeta.family, 'properties');
    assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
    assert.deepEqual(parseJson('[1,2,3]'), [1, 2, 3]);
    assert.equal(parseJson('invalid'), undefined);
    assert.equal(parseJson(''), undefined);
  });

  it('Address (Ad) formats addresses', () => {
    assert.equal(AddressMeta.symbol, 'Ad');
    assert.equal(AddressMeta.family, 'properties');
    const addr = { line1: '123 Main St', city: 'Springfield', region: 'IL', postalCode: '62701', country: 'US' };
    assert.equal(formatAddress(addr), '123 Main St, Springfield, IL, 62701, US');
    assert.equal(formatAddress({ line1: '123 Main St' }), '123 Main St');
  });

  it('AI (Ai) marks and detects AI-generated fields', () => {
    assert.equal(AiFieldMeta.symbol, 'Ai');
    assert.equal(AiFieldMeta.family, 'properties');
    const field = markAiGenerated('summary text', { model: 'gpt-4o', confidence: 0.95 });
    assert.equal(field.value, 'summary text');
    assert.equal(field.model, 'gpt-4o');
    assert.equal(field.confidence, 0.95);
    assert.ok(typeof field.generatedAt === 'string');
    assert.equal(isAiGenerated(field), true);
    assert.equal(isAiGenerated({ value: 'text' }), false);
    assert.equal(isAiGenerated(null), false);
    assert.equal(isAiGenerated('string'), false);
  });

  it('StartDate (Sd) and EndDate (Ed) validate ranges', () => {
    assert.equal(StartDateMeta.symbol, 'Sd');
    assert.equal(EndDateMeta.symbol, 'Ed');
    const validRange = { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' };
    assert.equal(isValidRange(validRange), true);
    assert.equal(rangeDurationMs(validRange), 86_400_000);

    const invalidRange = { start: '2024-01-02T00:00:00Z', end: '2024-01-01T00:00:00Z' };
    assert.equal(isValidRange(invalidRange), false);
    assert.equal(rangeDurationMs(invalidRange), 0);
  });

  it('Email (Ea) validates and normalizes emails', () => {
    assert.equal(EmailMeta.symbol, 'Ea');
    assert.equal(EmailMeta.family, 'properties');
    assert.equal(isValidEmail('test@example.com'), true);
    assert.equal(isValidEmail('invalid'), false);
    assert.equal(isValidEmail('test@'), false);
    assert.equal(isValidEmail('@example.com'), false);
    assert.equal(normalizeEmail('  Test@Example.COM  '), 'test@example.com');
  });

  it('Phone (Ph) normalizes phone numbers', () => {
    assert.equal(PhoneMeta.symbol, 'Ph');
    assert.equal(PhoneMeta.family, 'properties');
    assert.equal(normalizePhone('+1 (555) 123-4567'), '+15551234567');
    assert.equal(normalizePhone('555-123-4567'), '5551234567');
    assert.equal(normalizePhone('  +44 20 7946 0958  '), '+442079460958');
  });

  it('URL (Ur) validates URLs', () => {
    assert.equal(UrlMeta.symbol, 'Ur');
    assert.equal(UrlMeta.family, 'properties');
    assert.equal(isValidUrl('https://example.com'), true);
    assert.equal(isValidUrl('http://localhost:3000'), true);
    assert.equal(isValidUrl('not-a-url'), false);
    assert.equal(isValidUrl(''), false);
  });
});

describe('Actions atoms', () => {
  it('Create (Cr), Update (Up), Delete (De), View (Vw) build action requests', () => {
    assert.equal(CreateMeta.symbol, 'Cr');
    assert.equal(UpdateMeta.symbol, 'Up');
    assert.equal(DeleteMeta.symbol, 'De');
    assert.equal(ViewMeta.symbol, 'Vw');

    const create = createAction('Task', { title: 'New' }, 'u1');
    assert.equal(create.action, 'Create');
    assert.equal(create.targetType, 'Task');
    assert.equal(create.actorId, 'u1');

    const update = updateAction('Task', 't1', { title: 'Updated' }, 'u1');
    assert.equal(update.action, 'Update');
    assert.equal(update.targetId, 't1');

    const del = deleteAction('Task', 't1', 'u1');
    assert.equal(del.action, 'Delete');
    assert.equal(del.targetId, 't1');

    const view = viewAction('Task', 't1', 'u1');
    assert.equal(view.action, 'View');
    assert.equal(view.targetId, 't1');
  });

  it('executeInMemory performs CRUD operations', () => {
    const store = new Map<string, Map<string, unknown>>();

    const created = executeInMemory(store, createAction('Task', { title: 'Test' }));
    assert.equal(created.success, true);
    const id = (created.data as Record<string, unknown>).id as string;
    assert.ok(id);

    const viewed = executeInMemory(store, viewAction('Task', id));
    assert.equal(viewed.success, true);
    assert.equal((viewed.data as Record<string, unknown>).title, 'Test');

    const updated = executeInMemory(store, updateAction('Task', id, { title: 'Updated' }));
    assert.equal(updated.success, true);
    assert.equal((updated.data as Record<string, unknown>).title, 'Updated');

    const deleted = executeInMemory(store, deleteAction('Task', id));
    assert.equal(deleted.success, true);

    const notFound = executeInMemory(store, viewAction('Task', id));
    assert.equal(notFound.success, false);
  });

  it('Notify (No), Message (Mg), Assign (As) build action requests', () => {
    assert.equal(NotifyMeta.symbol, 'No');
    assert.equal(MessageMeta.symbol, 'Mg');
    assert.equal(AssignMeta.symbol, 'As');

    const notify = notifyAction('User', 'u1', 'Hello', 'email', 'admin');
    assert.equal(notify.action, 'Notify');
    assert.equal(notify.targetType, 'User');
    assert.equal(notify.targetId, 'u1');
    assert.equal((notify.payload as Record<string, unknown>).message, 'Hello');
    assert.equal((notify.payload as Record<string, unknown>).channel, 'email');

    const assign = assignAction('Task', 't1', 'u1', 'admin');
    assert.equal(assign.action, 'Assign');
    assert.equal((assign.payload as Record<string, unknown>).assigneeId, 'u1');
  });

  it('Search (Se), Filter (Fi), Sort (So), Export (Ex) build action requests', () => {
    assert.equal(SearchActionMeta.symbol, 'Se');
    assert.equal(FilterMeta.symbol, 'Fi');
    assert.equal(SortMeta.symbol, 'So');
    assert.equal(ExportMeta.symbol, 'Ex');

    const search = searchAction('Task', 'test', { status: 'active' }, 'u1');
    assert.equal(search.action, 'Search');
    assert.equal((search.payload as Record<string, unknown>).query, 'test');

    const filter = filterAction('Task', { status: 'active' }, 'u1');
    assert.equal(filter.action, 'Filter');

    const sort = sortAction('Task', 'name', 'desc', 'u1');
    assert.equal(sort.action, 'Sort');
    assert.equal((sort.payload as Record<string, unknown>).direction, 'desc');

    const exp = exportAction('Task', 'csv', { status: 'active' }, 'u1');
    assert.equal(exp.action, 'Export');
    assert.equal((exp.payload as Record<string, unknown>).format, 'csv');
  });
});

describe('Interfaces atoms', () => {
  it('Calendar (Ce) defines and materializes calendar views', () => {
    assert.equal(CalendarMeta.symbol, 'Ce');
    assert.equal(CalendarMeta.family, 'interfaces');
    const spec = defineCalendar({ objectType: 'Event', dateField: 'start', titleField: 'title' });
    assert.equal(spec.kind, 'Calendar');
    assert.equal(spec.objectType, 'Event');

    const { events } = materializeCalendar(spec, [
      { id: '1', title: 'Meeting', start: '2024-01-15T10:00:00Z' },
      { id: '2', title: 'Lunch', start: '2024-01-15T12:00:00Z' },
    ]);
    assert.equal(events.length, 2);
    assert.equal(events[0]?.title, 'Meeting');
    assert.equal(events[0]?.start, '2024-01-15T10:00:00Z');
  });

  it('Chart (Ch) defines and materializes chart views', () => {
    assert.equal(ChartMeta.symbol, 'Ch');
    assert.equal(ChartMeta.family, 'interfaces');
    const spec = defineChart({
      objectType: 'Invoice',
      chartType: 'bar',
      series: [{ label: 'Amount', key: 'amount' }],
      xAxisKey: 'month',
    });
    assert.equal(spec.kind, 'Chart');
    assert.equal(spec.chartType, 'bar');

    const { data, meta } = materializeChart(spec, [
      { month: 'Jan', amount: 100 },
      { month: 'Feb', amount: 200 },
    ]);
    assert.equal(data.length, 2);
    assert.equal(meta.count, 2);
  });

  it('Detail (Di) defines and materializes detail views', () => {
    assert.equal(DetailMeta.symbol, 'Di');
    assert.equal(DetailMeta.family, 'interfaces');
    const spec = defineDetail({
      objectType: 'Task',
      sections: [{ title: 'Overview', fields: [{ key: 'title', label: 'Title' }] }],
    });
    assert.equal(spec.kind, 'Detail');
    assert.equal(spec.sections.length, 1);

    const { sections, data } = materializeDetail(spec, { title: 'Test Task' });
    assert.equal(sections.length, 1);
    assert.equal(data.title, 'Test Task');
  });

  it('Form (Fm) defines and materializes form views', () => {
    assert.equal(FormMeta.symbol, 'Fm');
    assert.equal(FormMeta.family, 'interfaces');
    const spec = defineForm({
      objectType: 'Task',
      fields: [{ key: 'title', label: 'Title', type: 'text', required: true }],
    });
    assert.equal(spec.kind, 'Form');
    assert.equal(spec.objectType, 'Task');
    assert.equal(spec.submitLabel, 'Save');
    assert.equal(spec.cancelLabel, 'Cancel');
    assert.equal(spec.layout, 'vertical');
    assert.deepEqual(spec.actions, ['Create', 'Update']);

    const { fields, values, spec: outSpec } = materializeForm(spec);
    assert.equal(fields.length, 1);
    assert.deepEqual(values, {});
    assert.equal(outSpec, spec);

    const withData = materializeForm(spec, { title: 'Test' });
    assert.deepEqual(withData.values, { title: 'Test' });
  });
});

describe('Rules atoms', () => {
  it('Audit (Au) creates audit entries and diffs objects', () => {
    assert.equal(AuditMeta.symbol, 'Au');
    assert.equal(AuditMeta.family, 'rules');
    const entry = createAuditEntry({
      id: 'a1',
      actorId: 'u1',
      action: 'Update',
      objectType: 'Task',
      objectId: 't1',
      changes: { title: { from: 'Old', to: 'New' } },
    });
    assert.equal(entry.id, 'a1');
    assert.equal(entry.actorId, 'u1');
    assert.equal(entry.action, 'Update');
    assert.ok(typeof entry.timestamp === 'string');

    const diff = diffObjects({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 });
    assert.deepEqual(diff, { b: { from: 2, to: 3 }, c: { from: undefined, to: 4 } });
  });

  it('Permission (Pn) checks permissions', () => {
    assert.equal(PermissionMeta.symbol, 'Pn');
    assert.equal(PermissionMeta.family, 'rules');
    assert.equal(can(defaultTaskPermissions, 'admin', 'Create', 'Task'), true);
    assert.equal(can(defaultTaskPermissions, 'admin', 'Delete', 'Task'), true);
    assert.equal(can(defaultTaskPermissions, 'member', 'Create', 'Task'), true);
    assert.equal(can(defaultTaskPermissions, 'member', 'Delete', 'Task'), false);
    assert.equal(can(defaultTaskPermissions, 'viewer', 'View', 'Task'), true);
    assert.equal(can(defaultTaskPermissions, 'viewer', 'Create', 'Task'), false);
  });

  it('Policy (Po) creates and evaluates policies', () => {
    assert.equal(PolicyMeta.symbol, 'Po');
    assert.equal(PolicyMeta.family, 'rules');
    const policy = createPolicy({
      id: 'pol1',
      name: 'Task Policy',
      statements: [
        { id: 's1', name: 'Deny delete', effect: 'deny', actions: ['Delete'], resources: ['Task'] },
        { id: 's2', name: 'Allow all', effect: 'allow', actions: ['*'], resources: ['*'] },
      ],
    });
    // first-match semantics: the deny statement is listed first so it wins
    assert.equal(policy.enabled, true);
    assert.equal(policy.statements.length, 2);

    const result1 = evaluatePolicy(policy, 'Create', 'Task');
    assert.equal(result1.allowed, true);
    assert.equal(result1.matchedStatement, 'Allow all');

    const result2 = evaluatePolicy(policy, 'Delete', 'Task');
    assert.equal(result2.allowed, false);
    assert.equal(result2.matchedStatement, 'Deny delete');
  });
});
