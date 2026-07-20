import { executeInMemory, updateAction } from '../atoms/actions/crud.js';
import { defineDetail, materializeDetail } from '../atoms/interfaces/detail.js';
import { defineTable, materializeTable } from '../atoms/interfaces/table.js';
import { createActivity } from '../atoms/objects/activity.js';
import { createCompany } from '../atoms/objects/company.js';
import { createContact } from '../atoms/objects/contact.js';

const store = new Map<string, Map<string, unknown>>();

const acme = createCompany({ id: 'c1', name: 'Acme Corp', industry: 'Technology' });
const globex = createCompany({ id: 'c2', name: 'Globex Inc', industry: 'Finance' });

const alice = createContact({
  id: 'ct1',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@acme.com',
  companyId: 'c1',
  role: 'Engineer',
});
const bob = createContact({
  id: 'ct2',
  firstName: 'Bob',
  lastName: 'Jones',
  email: 'bob@globex.com',
  companyId: 'c2',
  role: 'Manager',
});

const activity = createActivity({
  id: 'a1',
  type: 'call',
  subject: 'Intro call with Alice',
  contactId: 'ct1',
  performedBy: 'u1',
});

for (const obj of [acme, globex, alice, bob, activity]) {
  const typeStore = store.get(obj.meta.name) ?? new Map();
  typeStore.set(obj.id, obj.properties);
  store.set(obj.meta.name, typeStore);
}

const contactTable = defineTable({
  objectType: 'Contact',
  columns: [
    { key: 'firstName', label: 'First Name', sortable: true },
    { key: 'lastName', label: 'Last Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'companyId', label: 'Company' },
    { key: 'role', label: 'Role', filterable: true },
    { key: 'status', label: 'Status', filterable: true },
  ],
  rowActions: ['View', 'Update'],
});

const contactDetail = defineDetail({
  objectType: 'Contact',
  sections: [
    {
      title: 'Basic Info',
      fields: [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
      ],
    },
    {
      title: 'Organization',
      fields: [
        { key: 'companyId', label: 'Company' },
        { key: 'role', label: 'Role' },
      ],
    },
  ],
});

const contactStore = store.get('Contact')!;
const contacts = Array.from(contactStore.values()) as Record<string, unknown>[];
const tableView = materializeTable(contactTable, contacts);
const detailView = materializeDetail(contactDetail, contacts[0]);

console.log('=== CRM Contact List ===');
console.log(tableView.columns.map((c) => c.label).join(' | '));
for (const row of tableView.rows) {
  console.log([row.firstName, row.lastName, row.email, row.companyId, row.role, row.status].join(' | '));
}

console.log('\n=== Contact Detail ===');
for (const section of detailView.sections) {
  console.log(`\n[${section.title}]`);
  for (const field of section.fields) {
    console.log(`  ${field.label}: ${detailView.data[field.key] ?? '—'}`);
  }
}

console.log('\n=== Activity Feed ===');
const activityStore = store.get('Activity')!;
for (const a of Array.from(activityStore.values()) as Record<string, unknown>[]) {
  console.log(`  [${a.type}] ${a.subject} — ${a.performedAt}`);
}

const updateReq = updateAction('Contact', 'ct1', { role: 'Senior Engineer' }, 'u1');
const result = executeInMemory(store, updateReq);
console.log('\n=== Role Updated ===', result.success ? 'OK' : 'FAIL');

console.log('\nAtoms used: Company, Contact, Activity, Status, Table, Detail, Create, Update.');
