import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyDecision, approveAction, escalateAction, rejectAction } from '../atoms/actions/approval.js';
import { groupAction, importAction, materializeGroups, validateImport } from '../atoms/actions/data.js';
import {
  applyRestore,
  archiveAction,
  DUPLICATE_RESET_FIELDS,
  duplicateAction,
  isRestorable,
  partitionRestorable,
  restoreAction,
} from '../atoms/actions/lifecycle.js';
import {
  cancelAction,
  cancelJob,
  createJob,
  dueJobs,
  remindAction,
  runAction,
  scheduleAction,
  startJob,
  stopAction,
  stopJob,
} from '../atoms/actions/scheduling.js';
import { defineBoard, materializeBoard } from '../atoms/interfaces/board.js';
import { defineCard, findCard, materializeCards } from '../atoms/interfaces/card.js';
import { defineGrid, materializeGrid } from '../atoms/interfaces/grid.js';
import { defineList, materializeList } from '../atoms/interfaces/list.js';
import { defineMap, materializeMap } from '../atoms/interfaces/map.js';
import { defineTimeline, materializeTimeline } from '../atoms/interfaces/timeline.js';
import { defineTree, materializeTree } from '../atoms/interfaces/tree.js';
import { createTimeSchedule, dueSchedules, matchesRecurrence } from '../atoms/rules/schedule.js';

describe('Duplicate / Archive / Restore actions (Dp, Ar, Rs)', () => {
  it('marks the identity and timestamp fields for reset on a copy', () => {
    const request = duplicateAction('Task', 'task-1', { title: 'Copy' }, 'u1');
    assert.equal(request.action, 'Duplicate');
    assert.equal(request.targetId, 'task-1');
    assert.deepEqual(request.payload?.resetFields, [...DUPLICATE_RESET_FIELDS]);
    assert.deepEqual(DUPLICATE_RESET_FIELDS, ['id', 'createdAt', 'updatedAt']);
    assert.deepEqual(request.payload?.overrides, { title: 'Copy' });
  });

  it('stamps archive time and leaves restore unstamped', () => {
    assert.ok(typeof archiveAction('Task', 'task-1').payload?.archivedAt === 'string');
    assert.equal(restoreAction('Task', 'task-1').payload, undefined);
  });

  it('treats an archived record as restorable and a live one as not', () => {
    assert.equal(isRestorable({ archivedAt: '2024-01-01T00:00:00Z' }), true);
    assert.equal(isRestorable({ deletedAt: '2024-01-01T00:00:00Z' }), true);
    assert.equal(isRestorable({ title: 'live' }), false);
    assert.equal(isRestorable({ archivedAt: null }), false);
  });

  it('clears both archive and deletion markers on restore', () => {
    const restored = applyRestore({ id: '1', archivedAt: 'a', deletedAt: 'd', title: 'keep' });
    assert.equal('archivedAt' in restored, false);
    assert.equal('deletedAt' in restored, false);
    assert.equal(restored.title, 'keep');
  });

  it('reports why each record in a bulk restore was skipped', () => {
    const { restored, skipped } = partitionRestorable([{ id: '1', archivedAt: 'a' }, { id: '2' }]);
    assert.equal(restored.length, 1);
    assert.deepEqual(restored[0], { id: '1' });
    assert.equal(skipped.length, 1);
    assert.equal(skipped[0]?.reason, 'record is neither archived nor deleted');
  });
});

describe('Approve / Reject / Escalate actions (Ap, Rj, Es)', () => {
  it('builds a terminal decision for each action', () => {
    assert.equal(approveAction('Invoice', 'i1', 'looks right').payload?.decision, 'approved');
    assert.equal(rejectAction('Invoice', 'i1', 'wrong amount').payload?.decision, 'rejected');
    assert.equal(
      escalateAction('Invoice', 'i1', { reason: 'over budget', newPriority: 'high' }).payload?.decision,
      'escalated',
    );
  });

  it('accepts a decision on a pending request', () => {
    const result = applyDecision({ id: '1' }, { decision: 'approved', targetType: 'Invoice', targetId: '1' });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.record.approvalState, 'approved');
  });

  it('refuses a second decision on an already decided request', () => {
    for (const state of ['approved', 'rejected', 'escalated']) {
      const result = applyDecision({ approvalState: state }, { decision: 'approved', targetType: 'I', targetId: '1' });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, `request is already ${state}`);
    }
  });

  it('refuses a rejection with no reason', () => {
    const result = applyDecision({ id: '1' }, { decision: 'rejected', targetType: 'Invoice', targetId: '1' });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'a rejection must state a reason');
  });
});

describe('Schedule / Run / Stop / Cancel / Remind actions (Sc, Rn, Sp, Cc, Rm)', () => {
  it('rejects an unparseable instant rather than scheduling nothing', () => {
    assert.throws(() => scheduleAction('not-a-date', 'Export'), /parseable instant/);
    assert.throws(() => remindAction('Task', 't1', 'soon', 'hi'), /parseable instant/);
    assert.throws(() => createJob({ id: 'j', action: 'Export', runAt: 'soon' }), /parseable instant/);
  });

  it('builds a scheduled job in the scheduled state', () => {
    const job = createJob({ id: 'j1', action: 'Export', runAt: '2024-06-01T00:00:00Z' });
    assert.equal(job.state, 'scheduled');
    assert.equal(job.runAt, '2024-06-01T00:00:00Z');
  });

  it('returns only due scheduled jobs, oldest first', () => {
    const jobs = [
      createJob({ id: 'later', action: 'A', runAt: '2024-06-02T00:00:00Z' }),
      createJob({ id: 'earlier', action: 'B', runAt: '2024-05-01T00:00:00Z' }),
      { ...createJob({ id: 'done', action: 'C', runAt: '2024-05-01T00:00:00Z' }), state: 'completed' as const },
    ];
    assert.deepEqual(
      dueJobs(jobs, '2024-06-01T00:00:00Z').map((j) => j.id),
      ['earlier'],
    );
  });

  it('will not start a job that is not scheduled', () => {
    for (const state of ['running', 'completed', 'stopped', 'cancelled'] as const) {
      const job = { ...createJob({ id: 'j', action: 'A', runAt: '2024-06-01T00:00:00Z' }), state };
      const result = startJob(job);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, `job is ${state}, not scheduled`);
    }
  });

  it('will not stop a job that is not running', () => {
    const job = createJob({ id: 'j', action: 'A', runAt: '2024-06-01T00:00:00Z' });
    const result = stopJob(job);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'job is scheduled, not running');
  });

  it('cancels a scheduled or running job but not a finished one', () => {
    const scheduled = createJob({ id: 'j', action: 'A', runAt: '2024-06-01T00:00:00Z' });
    assert.equal(cancelJob(scheduled).ok, true);

    const running = { ...scheduled, state: 'running' as const };
    assert.equal(cancelJob(running).ok, true);

    for (const state of ['completed', 'cancelled'] as const) {
      const result = cancelJob({ ...scheduled, state });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, `job is already ${state}`);
    }
  });

  it('does not mutate the job it transitions', () => {
    const job = createJob({ id: 'j', action: 'A', runAt: '2024-06-01T00:00:00Z' });
    const started = startJob(job);
    assert.equal(job.state, 'scheduled');
    if (started.ok) assert.equal(started.job.state, 'running');
  });

  it('distinguishes stop from cancel on the wire', () => {
    assert.ok(typeof stopAction('Job', 'j1', 'too slow').payload?.stoppedAt === 'string');
    assert.ok(typeof cancelAction('Job', 'j1').payload?.cancelledAt === 'string');
    assert.ok(typeof runAction('Job', 'j1', 'Export').payload?.startedAt === 'string');
  });
});

describe('Group / Import actions (Gr, Im)', () => {
  it('buckets records by a property in key order', () => {
    const buckets = materializeGroups(
      [
        { id: '1', status: 'open' },
        { id: '2', status: 'done' },
        { id: '3', status: 'open' },
      ],
      'status',
    );
    assert.deepEqual(
      buckets.map((b) => [b.key, b.count]),
      [
        ['done', 1],
        ['open', 2],
      ],
    );
  });

  it('keeps records missing the grouping key in their own bucket', () => {
    const buckets = materializeGroups([{ id: '1' }, { id: '2', status: 'open' }], 'status');
    assert.equal(buckets.length, 2);
    assert.deepEqual(buckets.find((b) => b.key === '')?.records, [{ id: '1' }]);
  });

  it('requires an import to have a source', () => {
    assert.throws(() => importAction('Contact', { format: 'csv' }), /uri or inline rows/);
  });

  it('defaults an import to skipping conflicts', () => {
    assert.equal(importAction('Contact', { format: 'csv', uri: 'c.csv' }).payload?.onConflict, 'skip');
    assert.equal(
      importAction('Contact', { format: 'json', rows: [] }, { onConflict: 'update' }).payload?.onConflict,
      'update',
    );
    assert.equal(groupAction('Task', 'status').payload?.by, 'status');
  });

  it('reports every bad row rather than only the first', () => {
    const result = validateImport(
      [{ name: 'ok', age: 1 }, { age: 'old' }, { name: 'no-age' }],
      [
        { key: 'name', type: 'string', required: true },
        { key: 'age', type: 'number' },
      ],
    );
    assert.equal(result.valid, false);
    assert.deepEqual(
      result.rows.map((r) => r.index),
      [1],
    );
    assert.equal(result.rows[0]?.errors.length, 2, 'missing name and wrong-typed age are both reported');
    assert.match(result.rows[0]?.errors.join(' ') ?? '', /name is required/);
    assert.match(result.rows[0]?.errors.join(' ') ?? '', /age is not a number/);
  });

  it('flags a field name the schema does not know, since that is usually a typo', () => {
    const result = validateImport([{ name: 'a', emial: 'b@c.d' }], [{ key: 'name', type: 'string' }]);
    assert.deepEqual(result.unknownFields, ['emial']);
    assert.equal(result.valid, false);
  });

  it('accepts a clean import', () => {
    const result = validateImport(
      [{ name: 'a', joined: '2024-01-01' }],
      [
        { key: 'name', type: 'string', required: true },
        { key: 'joined', type: 'date' },
      ],
    );
    assert.deepEqual(result, { valid: true, rows: [], unknownFields: [] });
  });
});

describe('Grid interface (Gd)', () => {
  const spec = defineGrid({
    objectType: 'Invoice',
    columns: [
      { key: 'number', label: 'Number' },
      { key: 'amount', label: 'Amount', cell: 'currency' },
      { key: 'paid', label: 'Paid', cell: 'boolean' },
    ],
  });

  it('projects one cell per column', () => {
    const page = materializeGrid(spec, [{ id: 'i1', number: 'INV-1', amount: 10, paid: true }]);
    assert.deepEqual(
      page.rows[0]?.cells.map((c) => c.key),
      ['number', 'amount', 'paid'],
    );
    assert.equal(page.meta.total, 1);
  });

  it('right-aligns currency and centres booleans without being told to', () => {
    const page = materializeGrid(spec, [{ id: 'i1', number: 'INV-1', amount: 10, paid: true }]);
    assert.deepEqual(
      page.rows[0]?.cells.map((c) => c.align),
      ['left', 'right', 'center'],
    );
  });

  it('honours an explicit alignment over the default', () => {
    const left = defineGrid({
      objectType: 'Invoice',
      columns: [{ key: 'amount', label: 'Amount', cell: 'currency', align: 'left' }],
    });
    assert.equal(materializeGrid(left, [{ id: '1', amount: 1 }]).rows[0]?.cells[0]?.align, 'left');
  });

  it('renders a missing value as blank rather than the text null', () => {
    const page = materializeGrid(spec, [{ id: 'i1', number: null, amount: undefined, paid: false }]);
    assert.deepEqual(
      page.rows[0]?.cells.map((c) => c.display),
      ['', '', 'false'],
    );
  });

  it('pages without going out of range or below one', () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({ id: String(i) }));
    const paged = defineGrid({ objectType: 'Invoice', columns: [{ key: 'id', label: 'ID' }], pageSize: 3 });
    assert.equal(materializeGrid(paged, rows, 3).rows.length, 1);
    assert.equal(materializeGrid(paged, rows, 99).meta.page, 3, 'a page past the end clamps to the last page');
    assert.equal(materializeGrid(paged, rows, 0).meta.page, 1);
    assert.equal(materializeGrid(paged, rows).meta.pageCount, 3);
  });
});

describe('List interface (Ls)', () => {
  it('reports truncation instead of quietly shortening', () => {
    const spec = defineList({ objectType: 'Contact', primaryKey: 'name', limit: 2 });
    const result = materializeList(spec, [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
      { id: '3', name: 'c' },
    ]);
    assert.deepEqual(result.meta, { total: 3, shown: 2, truncated: true });
    assert.deepEqual(
      result.items.map((i) => i.position),
      [1, 2],
    );
  });

  it('renders a row whose primary text is missing', () => {
    const result = materializeList(defineList({ objectType: 'C', primaryKey: 'name' }), [{ id: '1' }]);
    assert.equal(result.items[0]?.primary, '');
  });
});

describe('Map interface (Mp)', () => {
  const spec = defineMap({ objectType: 'Office', latKey: 'lat', lngKey: 'lng', labelKey: 'name' });

  it('places records with usable coordinates', () => {
    const { markers, unplaceable } = materializeMap(spec, [{ id: '1', lat: 51.5, lng: -0.1, name: 'London' }]);
    assert.equal(markers[0]?.label, 'London');
    assert.deepEqual(unplaceable, []);
  });

  it('reports unplaceable records instead of dropping them or pinning them at zero', () => {
    const { markers, unplaceable } = materializeMap(spec, [
      { id: '1' },
      { id: '2', lat: 'abc', lng: '5' },
      { id: '3', lat: 91, lng: 0 },
      { id: '4', lat: 0, lng: 181 },
    ]);
    assert.deepEqual(markers, []);
    assert.equal(unplaceable.length, 4);
    assert.match(unplaceable[2]?.reason ?? '', /latitude 91 is outside/);
    assert.match(unplaceable[3]?.reason ?? '', /longitude 181 is outside/);
  });

  it('accepts numeric strings', () => {
    const { markers } = materializeMap(spec, [{ id: '1', lat: '51.5', lng: '-0.1' }]);
    assert.equal(markers[0]?.lat, 51.5);
  });
});

describe('Timeline interface (Tl)', () => {
  const spec = defineTimeline({
    objectType: 'Event',
    entries: [
      { id: 'e1', timestampKey: 'at', titleKey: 'label', groupBy: 'day' },
      { id: 'e2', timestampKey: 'at', titleKey: 'label', groupBy: 'day' },
    ],
  });

  it('sorts chronologically and groups consecutive entries', () => {
    const { items, groups } = materializeTimeline(spec, [
      { id: 'e2', at: '2024-03-02T00:00:00Z', label: 'second' },
      { id: 'e1', at: '2024-03-01T00:00:00Z', label: 'first' },
    ]);
    assert.deepEqual(
      items.map((i) => i.id),
      ['e1', 'e2'],
    );
    assert.deepEqual(
      groups.map((g) => g.label),
      ['2024-03-01', '2024-03-02'],
    );
  });

  it('sorts an undated entry last instead of dropping it', () => {
    const { items } = materializeTimeline(spec, [
      { id: 'e1' },
      { id: 'e2', at: '2024-03-01T00:00:00Z', label: 'dated' },
    ]);
    assert.deepEqual(
      items.map((i) => i.id),
      ['e2', 'e1'],
    );
  });

  it('omits groups entirely when grouping is off', () => {
    const flat = defineTimeline({
      objectType: 'Event',
      entries: [{ id: 'e1', timestampKey: 'at', titleKey: 'label' }],
      showGroups: false,
    });
    assert.deepEqual(materializeTimeline(flat, [{ id: 'e1', at: '2024-03-01T00:00:00Z' }]).groups, []);
  });

  it('can sort newest first', () => {
    const desc = defineTimeline({
      objectType: 'Event',
      entries: [
        { id: 'e1', timestampKey: 'at', titleKey: 'label' },
        { id: 'e2', timestampKey: 'at', titleKey: 'label' },
      ],
      ascending: false,
    });
    const { items } = materializeTimeline(desc, [
      { id: 'e1', at: '2024-03-01T00:00:00Z' },
      { id: 'e2', at: '2024-03-02T00:00:00Z' },
    ]);
    assert.deepEqual(
      items.map((i) => i.id),
      ['e2', 'e1'],
    );
  });
});

describe('Board interface (Bd)', () => {
  const spec = defineBoard({
    objectType: 'Task',
    slots: [
      { id: 'todo', title: 'To do', matchKey: 'status', matchValue: 'open' },
      { id: 'done', title: 'Done', matchKey: 'status', matchValue: 'done' },
    ],
    titleKey: 'title',
  });

  it('routes each card to the slot its record matches', () => {
    const { columns, unplaced } = materializeBoard(spec, [
      { id: '1', status: 'open', title: 'a' },
      { id: '2', status: 'done', title: 'b' },
    ]);
    assert.deepEqual(
      columns.map((c) => [c.id, c.cards.length]),
      [
        ['todo', 1],
        ['done', 1],
      ],
    );
    assert.deepEqual(unplaced, []);
  });

  it('reports cards no slot matched instead of losing them', () => {
    const { unplaced } = materializeBoard(spec, [{ id: '1', status: 'blocked', title: 'a' }]);
    assert.equal(unplaced.length, 1);
    assert.match(unplaced[0]?.reason ?? '', /no slot matched/);
  });

  it('sends unmatched cards to a configured fallback slot', () => {
    const withFallback = defineBoard({
      objectType: 'Task',
      slots: [
        { id: 'todo', title: 'To do', matchKey: 'status', matchValue: 'open' },
        { id: 'rest', title: 'Rest' },
      ],
      fallbackSlotId: 'rest',
      titleKey: 'title',
    });
    const { columns, unplaced } = materializeBoard(withFallback, [{ id: '1', status: 'blocked', title: 'a' }]);
    assert.deepEqual(unplaced, []);
    assert.equal(columns.find((c) => c.id === 'rest')?.cards.length, 1);
  });

  it('marks per-slot overflow rather than truncating silently', () => {
    const limited = defineBoard({
      objectType: 'Task',
      slots: [{ id: 'todo', title: 'To do', matchKey: 'status', matchValue: 'open', limit: 1 }],
      titleKey: 'title',
    });
    const column = materializeBoard(limited, [
      { id: '1', status: 'open', title: 'a' },
      { id: '2', status: 'open', title: 'b' },
    ]).columns[0];
    assert.deepEqual(column?.meta, { total: 2, shown: 1, overflow: true });
  });
});

describe('Card interface (Cd)', () => {
  const spec = defineCard({
    objectType: 'Contact',
    titleKey: 'name',
    fields: [{ key: 'email', label: 'Email', maxLength: 5 }],
    badges: ['status'],
  });

  it('truncates an over-long field and flags it', () => {
    const [card] = materializeCards(spec, [{ id: '1', name: 'Ada', email: 'ada@example.com' }]);
    assert.equal(card?.fields[0]?.display, 'ada@…');
    assert.equal(card?.fields[0]?.display.length, 5, 'maxLength bounds the value including the ellipsis');
    assert.equal(card?.fields[0]?.truncated, true);
  });

  it('renders a missing field as blank and untruncated', () => {
    const [card] = materializeCards(spec, [{ id: '1', name: 'Ada' }]);
    assert.deepEqual(card?.fields[0], {
      key: 'email',
      label: 'Email',
      value: undefined,
      display: '',
      truncated: false,
    });
  });

  it('collects only the badges that carry a value', () => {
    const [card] = materializeCards(spec, [{ id: '1', name: 'Ada', status: 'active' }]);
    assert.deepEqual(card?.badges, ['active']);
  });

  it('finds one card by id', () => {
    const cards = materializeCards(spec, [{ id: '1', name: 'Ada' }]);
    assert.equal(findCard(cards, '1')?.title, 'Ada');
    assert.equal(findCard(cards, 'nope'), undefined);
  });
});

describe('Tree interface (Te)', () => {
  const spec = defineTree({
    objectType: 'Category',
    node: { parentKey: 'parentId', titleKey: 'name', expandedByDefault: true },
    sortKey: 'name',
  });

  it('annotates depth and child flags', () => {
    const { rows } = materializeTree(spec, [
      { id: '1', parentId: null, name: 'root' },
      { id: '2', parentId: '1', name: 'child' },
    ]);
    assert.deepEqual(
      rows.map((r) => [r.id, r.depth, r.hasChildren]),
      [
        ['1', 0, true],
        ['2', 1, false],
      ],
    );
    assert.equal(rows[0]?.expanded, true);
  });

  it('treats a record whose parent is absent as a root and reports it', () => {
    const { rows, orphans } = materializeTree(spec, [{ id: '2', parentId: 'ghost', name: 'child' }]);
    assert.equal(rows[0]?.depth, 0);
    assert.equal(orphans.length, 1);
    assert.equal(orphans[0]?.missingParent, 'ghost');
  });

  it('reports a parent cycle instead of recursing forever', () => {
    const { rows, cycles } = materializeTree(spec, [
      { id: 'a', parentId: 'b', name: 'a' },
      { id: 'b', parentId: 'a', name: 'b' },
    ]);
    assert.equal(cycles.length, 1);
    assert.deepEqual(cycles[0]?.slice().sort(), ['a', 'b']);
    assert.deepEqual(rows, []);
  });

  it('reports a node whose ancestry runs into a cycle instead of dropping it', () => {
    const { rows, detached } = materializeTree(spec, [
      { id: 'a', parentId: 'b', name: 'a' },
      { id: 'b', parentId: 'a', name: 'b' },
      { id: 'child', parentId: 'a', name: 'child' },
    ]);
    assert.deepEqual(rows, []);
    assert.deepEqual(detached, ['child']);
  });

  it('stops descending at the depth cap', () => {
    const chain = Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      parentId: i === 0 ? null : String(i - 1),
      name: `n${i}`,
    }));
    const { rows } = materializeTree(spec, chain, 2);
    assert.deepEqual(
      rows.map((r) => r.id),
      ['0', '1', '2'],
    );
    assert.deepEqual(
      rows.map((r) => r.depth),
      [0, 1, 2],
    );
  });

  it('sorts siblings by the configured key', () => {
    const { rows } = materializeTree(spec, [
      { id: '1', parentId: null, name: 'r' },
      { id: '2', parentId: '1', name: 'zebra' },
      { id: '3', parentId: '1', name: 'apple' },
    ]);
    assert.deepEqual(
      rows.map((r) => r.id),
      ['1', '3', '2'],
    );
  });
});

describe('Schedule rule (Sa)', () => {
  const actions = [{ action: 'Export', targetType: 'Invoice' }];

  it('requires exactly one of an instant or a recurrence rule', () => {
    assert.throws(
      () =>
        createTimeSchedule({
          id: 's',
          name: 's',
          objectType: 'Invoice',
          at: '2024-06-01T00:00:00Z',
          rrule: 'FREQ=DAILY',
          actions,
        }),
      /either an instant or a recurrence rule, not both/,
    );
    assert.throws(
      () => createTimeSchedule({ id: 's', name: 's', objectType: 'Invoice', actions }),
      /needs either an instant or a recurrence rule/,
    );
  });

  it('rejects a recurrence rule that does not declare a frequency', () => {
    assert.throws(
      () => createTimeSchedule({ id: 's', name: 's', objectType: 'Invoice', rrule: 'BYHOUR=9', actions }),
      /must start with FREQ=/,
    );
  });

  it('defaults to enabled and UTC', () => {
    const schedule = createTimeSchedule({
      id: 's',
      name: 's',
      objectType: 'Invoice',
      at: '2024-06-01T00:00:00Z',
      actions,
    });
    assert.equal(schedule.enabled, true);
    assert.equal(schedule.timezone, 'UTC');
  });

  it('returns only enabled schedules that are due', () => {
    const due = createTimeSchedule({ id: 'a', name: 'a', objectType: 'I', at: '2024-06-01T00:00:00Z', actions });
    const future = createTimeSchedule({ id: 'b', name: 'b', objectType: 'I', at: '2024-07-01T00:00:00Z', actions });
    const disabled = createTimeSchedule({
      id: 'c',
      name: 'c',
      objectType: 'I',
      at: '2024-06-01T00:00:00Z',
      actions,
      enabled: false,
    });
    assert.deepEqual(
      dueSchedules([due, future, disabled], '2024-06-02T00:00:00Z').map((s) => s.id),
      ['a'],
    );
  });

  it('matches a daily rule and honours BYHOUR', () => {
    assert.equal(matchesRecurrence('FREQ=DAILY', '2024-06-01T13:00:00Z'), true);
    assert.equal(matchesRecurrence('FREQ=DAILY;BYHOUR=9', '2024-06-01T13:00:00Z'), false);
    assert.equal(matchesRecurrence('FREQ=DAILY;BYHOUR=9', '2024-06-01T09:00:00Z'), true);
  });

  it('matches a weekly rule only on the named days', () => {
    const sunday = '2024-06-02T09:00:00Z';
    assert.equal(matchesRecurrence('FREQ=WEEKLY;BYDAY=SU', sunday), true);
    assert.equal(matchesRecurrence('FREQ=WEEKLY;BYDAY=MO', sunday), false);
  });

  it('refuses a rule it cannot interpret', () => {
    assert.equal(matchesRecurrence('FREQ=FORTNIGHTLY', '2024-06-01T00:00:00Z'), false);
    assert.equal(matchesRecurrence('BYHOUR=9', '2024-06-01T00:00:00Z'), false);
    assert.equal(matchesRecurrence('FREQ=DAILY;INTERVAL=0', '2024-06-01T00:00:00Z'), false);
  });
});
