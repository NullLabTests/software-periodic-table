import { executeInMemory, updateAction } from '../atoms/actions/crud.js';
import { exportAction, filterAction, sortAction } from '../atoms/actions/search-filter.js';
import { defineChart, materializeChart } from '../atoms/interfaces/chart.js';
import { defineTable, materializeTable } from '../atoms/interfaces/table.js';
import { createInvoice } from '../atoms/objects/invoice.js';
import { formatDate } from '../atoms/properties/date.js';

const store = new Map<string, Map<string, unknown>>();

const invoices = [
  createInvoice({
    id: 'inv1',
    number: 'INV-001',
    customerName: 'Acme Corp',
    amount: 1500,
    issueDate: '2026-06-01',
    dueDate: '2026-06-30',
    status: 'sent',
  }),
  createInvoice({
    id: 'inv2',
    number: 'INV-002',
    customerName: 'Globex Inc',
    amount: 3200,
    issueDate: '2026-06-05',
    dueDate: '2026-07-05',
    status: 'draft',
  }),
  createInvoice({
    id: 'inv3',
    number: 'INV-003',
    customerName: 'Acme Corp',
    amount: 750,
    issueDate: '2026-06-10',
    dueDate: '2026-07-10',
    status: 'paid',
    paidAt: '2026-06-20T10:00:00Z',
  }),
  createInvoice({
    id: 'inv4',
    number: 'INV-004',
    customerName: 'Initech',
    amount: 5000,
    issueDate: '2026-05-15',
    dueDate: '2026-06-15',
    status: 'overdue',
  }),
  createInvoice({
    id: 'inv5',
    number: 'INV-005',
    customerName: 'Globex Inc',
    amount: 890,
    issueDate: '2026-06-20',
    dueDate: '2026-07-20',
    status: 'sent',
  }),
];

for (const inv of invoices) {
  const typeStore = store.get('Invoice') ?? new Map();
  typeStore.set(inv.id, inv.properties);
  store.set('Invoice', typeStore);
}

const invoiceTable = defineTable({
  objectType: 'Invoice',
  columns: [
    { key: 'number', label: 'Number', sortable: true },
    { key: 'customerName', label: 'Customer', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true },
    { key: 'status', label: 'Status', filterable: true },
    { key: 'issueDate', label: 'Issue Date', sortable: true },
    { key: 'dueDate', label: 'Due Date', sortable: true },
  ],
  rowActions: ['View', 'Update', 'Delete'],
  bulkActions: ['Export'],
});

const revenueChart = defineChart({
  objectType: 'Invoice',
  chartType: 'bar',
  series: [{ label: 'Amount', key: 'amount' }],
  xAxisKey: 'customerName',
  xAxisLabel: 'Customer',
  yAxisLabel: 'Revenue ($)',
});

const invoiceStore = store.get('Invoice')!;
const allInvoices = Array.from(invoiceStore.values()) as Record<string, unknown>[];

const tableView = materializeTable(invoiceTable, allInvoices);

console.log('=== Invoice Dashboard ===');
console.log(tableView.columns.map((c) => c.label).join(' | '));
for (const row of tableView.rows) {
  console.log([row.number, row.customerName, `$${row.amount}`, row.status, row.issueDate, row.dueDate].join(' | '));
}

const chartView = materializeChart(revenueChart, allInvoices);
console.log(`\n=== Revenue Chart (${chartView.meta.count} invoices) ===`);
console.log(`  Type: ${revenueChart.chartType} | X: ${revenueChart.xAxisLabel} | Y: ${revenueChart.yAxisLabel}`);

const filterReq = filterAction('Invoice', { status: 'sent' });
const filterPayload = filterReq.payload as Record<string, unknown>;
console.log(
  `\n=== Filter Action ===\n  Criteria: status = ${(filterPayload.criteria as Record<string, unknown>).status}`,
);

const sortReq = sortAction('Invoice', 'amount', 'desc');
const sortPayload = sortReq.payload as Record<string, unknown>;
console.log(`  Sort: by ${sortPayload.by} ${sortPayload.direction}`);

const exportReq = exportAction('Invoice', 'csv', { status: 'overdue' });
const exportPayload = exportReq.payload as Record<string, unknown>;
console.log(`  Export: ${exportPayload.format} (filter: overdue)`);

const markPaid = updateAction('Invoice', 'inv4', { status: 'paid', paidAt: new Date().toISOString() }, 'admin');
const result = executeInMemory(store, markPaid);
console.log(`\n=== Mark Overdue as Paid === ${result.success ? 'OK' : 'FAIL'}`);

if (result.success) {
  const updated = result.data as Record<string, unknown>;
  console.log(
    `  Invoice ${updated.number} now ${updated.status}, paid ${formatDate(new Date(String(updated.paidAt)))}`,
  );
}

console.log('\nAtoms used: Invoice, Status, Currency, Date, Table, Chart, Create, Update, Filter, Sort, Export.');
