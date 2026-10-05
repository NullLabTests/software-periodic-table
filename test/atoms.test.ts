import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { triggerAction, triggerMatches } from '../atoms/actions/trigger.js';
import { defineFeed, materializeFeed } from '../atoms/interfaces/feed.js';
import { defineGallery, materializeGallery } from '../atoms/interfaces/gallery.js';
import { defineKanban, materializeKanban } from '../atoms/interfaces/kanban.js';
import { defineTable, materializeTable } from '../atoms/interfaces/table.js';
import { bindRuleAction } from '../atoms/rules/action.js';
import { createTriggerRule, evaluateConditions } from '../atoms/rules/trigger.js';

describe('Trigger action atom (Tr)', () => {
  const event = {
    name: 'task.status_changed',
    objectType: 'Task',
    objectId: 't1',
    data: { status: 'done' },
    previous: { status: 'in_progress' },
    actorId: 'u1',
  };

  it('builds a declarative action carrying the event and its effects', () => {
    const request = triggerAction(event, [{ action: 'Notify', targetType: 'User', targetId: 'u1' }]);
    assert.equal(request.action, 'Trigger');
    assert.equal(request.targetType, 'Task');
    assert.equal(request.targetId, 't1');
    assert.equal(request.actorId, 'u1');
    const payload = request.payload as Record<string, unknown>;
    assert.equal(payload.event, 'task.status_changed');
    assert.equal((payload.effects as unknown[]).length, 1);
  });

  it('lets an explicit actor override the event actor', () => {
    assert.equal(triggerAction(event, [], 'admin').actorId, 'admin');
  });

  it('matches on event name and object type', () => {
    assert.equal(triggerMatches(event, { event: 'task.status_changed' }), true);
    assert.equal(triggerMatches(event, { event: 'task.status_changed', objectType: 'Task' }), true);
    assert.equal(triggerMatches(event, { event: 'task.status_changed', objectType: 'Invoice' }), false);
    assert.equal(triggerMatches(event, { event: 'task.deleted' }), false);
  });
});

describe('Rule Action atom (At)', () => {
  it('resolves the target from the triggering record', () => {
    const bound = bindRuleAction({ action: 'Notify', targetType: 'User', targetIdField: 'ownerId' }, { ownerId: 'u9' });
    assert.equal(bound.ok, true);
    if (bound.ok) {
      assert.equal(bound.request.targetId, 'u9');
      assert.equal(bound.request.targetType, 'User');
    }
  });

  // A rule whose target field is missing would otherwise broadcast to nobody.
  it('fails loudly when the target field is absent rather than broadcasting', () => {
    const bound = bindRuleAction({ action: 'Notify', targetIdField: 'ownerId' }, {});
    assert.equal(bound.ok, false);
    if (!bound.ok) assert.match(bound.reason, /ownerId/);
  });

  it('fails when the target field is present but empty', () => {
    assert.equal(bindRuleAction({ action: 'Notify', targetIdField: 'ownerId' }, { ownerId: '' }).ok, false);
  });

  it('allows a targetless action when no field is declared', () => {
    const bound = bindRuleAction({ action: 'Recalculate' }, {});
    assert.equal(bound.ok, true);
    if (bound.ok) assert.equal(bound.request.targetId, undefined);
  });

  it('carries a run cap through when set', () => {
    const bound = bindRuleAction({ action: 'Notify', maxRunsPerTarget: 1 }, {});
    assert.equal(bound.ok, true);
    if (bound.ok) assert.equal((bound.request.payload as Record<string, unknown>).maxRunsPerTarget, 1);
  });
});

describe('Condition atom (Cv) and rule Trigger (Ti)', () => {
  it('passes when every condition holds', () => {
    assert.equal(evaluateConditions([{ field: 'status', operator: 'eq', value: 'done' }], { status: 'done' }), true);
  });

  it('fails as soon as one condition fails', () => {
    const conditions = [
      { field: 'status', operator: 'eq' as const, value: 'done' },
      { field: 'amount', operator: 'gt' as const, value: 100 },
    ];
    assert.equal(evaluateConditions(conditions, { status: 'done', amount: 50 }), false);
  });

  it('is vacuously true with no conditions', () => {
    assert.equal(evaluateConditions([], {}), true);
  });

  it('evaluates membership and substring operators', () => {
    assert.equal(evaluateConditions([{ field: 'r', operator: 'in', value: ['a', 'b'] }], { r: 'b' }), true);
    assert.equal(evaluateConditions([{ field: 't', operator: 'contains', value: 'kan' }], { t: 'kanban' }), true);
    assert.equal(evaluateConditions([{ field: 't', operator: 'contains', value: 'zzz' }], { t: 'kanban' }), false);
  });

  it('creates an enabled rule by default', () => {
    const rule = createTriggerRule({
      id: 'r1',
      name: 'notify owner',
      event: 'task.status_changed',
      objectType: 'Task',
      actions: [],
    });
    assert.equal(rule.enabled, true);
  });
});

describe('Gallery interface (Gy)', () => {
  const spec = defineGallery({
    objectType: 'Product',
    imageKey: 'imageUrl',
    columnsPerRow: 3,
    tiles: [
      { id: 'p1', title: 'name' },
      { id: 'p2', title: 'name' },
      { id: 'p3', title: 'name' },
    ],
  });

  it('projects records in tile order', () => {
    const tiles = materializeGallery(spec, [
      { id: 'p3', name: 'C' },
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
    ]);
    assert.deepEqual(
      tiles.map((t) => t.title),
      ['A', 'B', 'C'],
    );
  });

  it('omits records the tile list does not mention', () => {
    const tiles = materializeGallery(spec, [{ id: 'p1', name: 'A' }]);
    assert.equal(tiles.length, 1);
  });

  it('resolves the image key from the record', () => {
    const [tile] = materializeGallery(spec, [{ id: 'p1', name: 'A', imageUrl: 'u' }]);
    assert.equal(tile?.imageKey, 'imageUrl');
    const [bare] = materializeGallery(spec, [{ id: 'p1', name: 'A' }]);
    assert.equal(bare?.imageKey, undefined);
  });
});

describe('Feed interface (Fd)', () => {
  const spec = defineFeed({
    objectType: 'Activity',
    entries: [
      { id: 'a1', verb: 'task.created' },
      { id: 'a2', verb: 'invoice.paid' },
      { id: 'a3', verb: 'contact.updated' },
    ],
    summaryKey: 'summary',
    timestampKey: 'at',
  });

  it('orders newest first by default', () => {
    const feed = materializeFeed(spec, [
      { id: 'a1', summary: 'one', at: '2024-01-01' },
      { id: 'a2', summary: 'two', at: '2024-03-01' },
      { id: 'a3', summary: 'three', at: '2024-02-01' },
    ]);
    assert.deepEqual(
      feed.map((f) => f.id),
      ['a2', 'a3', 'a1'],
    );
  });

  it('orders oldest first when asked', () => {
    const asc = defineFeed({ objectType: 'Activity', entries: spec.entries, descending: false });
    const feed = materializeFeed(asc, [
      { id: 'a1', at: '2024-01-01' },
      { id: 'a2', at: '2024-03-01' },
    ]);
    assert.deepEqual(
      feed.map((f) => f.id),
      ['a1', 'a2'],
    );
  });

  // An undated record is still history; dropping it would make the feed look
  // complete when it is not.
  it('keeps undated records but sorts them last', () => {
    const feed = materializeFeed(spec, [
      { id: 'a1', summary: 'undated' },
      { id: 'a2', summary: 'dated', at: '2024-01-01' },
    ]);
    assert.deepEqual(
      feed.map((f) => f.id),
      ['a2', 'a1'],
    );
  });

  it('omits records the feed does not list', () => {
    assert.equal(materializeFeed(spec, [{ id: 'zz', at: '2024-01-01' }]).length, 0);
  });
});

describe('existing interface atoms still behave', () => {
  it('materializes a table with its columns and row count', () => {
    const spec = defineTable({
      objectType: 'Task',
      columns: [
        { key: 'title', label: 'Title' },
        { key: 'priority', label: 'Priority' },
      ],
    });
    const out = materializeTable(spec, [
      { title: 'b', priority: 2 },
      { title: 'a', priority: 1 },
    ]);
    assert.equal(out.columns.length, 2);
    assert.equal(out.rows.length, 2);
    assert.equal(out.meta.total, 2);
    assert.equal(out.meta.pageSize, 25);
  });

  it('groups a kanban board by status column', () => {
    const spec = defineKanban({
      objectType: 'Task',
      columns: [
        { id: 'todo', title: 'Todo', statusValue: 'todo' },
        { id: 'done', title: 'Done', statusValue: 'done' },
      ],
    });
    const board = materializeKanban(spec, [
      { status: 'done', title: 'a' },
      { status: 'todo', title: 'b' },
      { status: 'unknown', title: 'c' },
    ]);
    assert.equal(board.done?.length, 1);
    assert.equal(board.todo?.length, 1);
  });
});
