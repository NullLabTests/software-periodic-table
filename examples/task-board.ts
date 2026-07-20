/**
 * Minimal end-to-end example: a Task board composed from atoms.
 *
 * Demonstrates:
 * - Object: Task, User
 * - Property: Status, Priority, Owner
 * - Actions: Create, Update, View
 * - Interface: Kanban + Table
 */

import { executeInMemory, updateAction } from '../atoms/actions/crud.js';
import { defineKanban, materializeKanban } from '../atoms/interfaces/kanban.js';
import { defineTable, materializeTable } from '../atoms/interfaces/table.js';
import { createTask } from '../atoms/objects/task.js';
import { createUser } from '../atoms/objects/user.js';

// ---------------------------------------------------------------------------
// 1. Seed data using Object atoms
// ---------------------------------------------------------------------------

const alice = createUser({
  id: 'u_alice',
  email: 'alice@example.com',
  name: 'Alice',
});

const bob = createUser({
  id: 'u_bob',
  email: 'bob@example.com',
  name: 'Bob',
});

const tasks = [
  createTask({
    id: 't1',
    title: 'Define ontology',
    status: 'done',
    priority: 'high',
    owner: alice.id,
  }),
  createTask({
    id: 't2',
    title: 'Implement core atoms',
    status: 'in_progress',
    priority: 'high',
    owner: alice.id,
  }),
  createTask({
    id: 't3',
    title: 'Write composition prompts',
    status: 'todo',
    priority: 'medium',
    owner: bob.id,
  }),
  createTask({
    id: 't4',
    title: 'Add evaluation harness',
    status: 'backlog',
    priority: 'low',
    owner: bob.id,
  }),
];

// ---------------------------------------------------------------------------
// 2. Interfaces
// ---------------------------------------------------------------------------

const kanban = defineKanban({
  objectType: 'Task',
  columns: [
    { id: 'backlog', title: 'Backlog', statusValue: 'backlog' },
    { id: 'todo', title: 'Todo', statusValue: 'todo' },
    { id: 'in_progress', title: 'In Progress', statusValue: 'in_progress' },
    { id: 'done', title: 'Done', statusValue: 'done' },
  ],
  cardTitleKey: 'title',
  cardSubtitleKey: 'priority',
});

const table = defineTable({
  objectType: 'Task',
  columns: [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'status', label: 'Status', filterable: true },
    { key: 'priority', label: 'Priority', sortable: true },
    { key: 'owner', label: 'Owner' },
  ],
  rowActions: ['View', 'Update', 'Delete'],
});

// ---------------------------------------------------------------------------
// 3. Simple in-memory store + action execution
// ---------------------------------------------------------------------------

const store = new Map<string, Map<string, unknown>>();
const taskStore = new Map<string, unknown>();
for (const t of tasks) {
  taskStore.set(t.id, t.properties);
}
store.set('Task', taskStore);

// Move a task
const moveReq = updateAction('Task', 't3', { status: 'in_progress' }, bob.id);
const moveResult = executeInMemory(store, moveReq);
console.log('Move result:', moveResult);

// ---------------------------------------------------------------------------
// 4. Materialize views
// ---------------------------------------------------------------------------

const currentTasks = Array.from(taskStore.values()) as Record<string, unknown>[];

const board = materializeKanban(kanban, currentTasks);
const tableView = materializeTable(table, currentTasks);

console.log('\n=== Kanban Board ===');
for (const [colId, cards] of Object.entries(board)) {
  console.log(`\n[${colId}] (${cards.length})`);
  for (const card of cards) {
    console.log(`  - ${card.title} (${card.priority})`);
  }
}

console.log('\n=== Table View ===');
console.log(tableView.columns.map((c) => c.label).join(' | '));
for (const row of tableView.rows) {
  console.log([row.title, row.status, row.priority, row.owner].join(' | '));
}

console.log('\nComposition complete. Atoms used: User, Task, Status, Priority, Owner, Create/Update, Kanban, Table.');
