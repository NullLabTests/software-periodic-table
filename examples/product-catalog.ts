import { createAction, executeInMemory } from '../atoms/actions/crud.js';
import { createRecommend } from '../atoms/intelligence/recommend.js';
import { createSearch } from '../atoms/intelligence/search.js';
import { defineDetail, materializeDetail } from '../atoms/interfaces/detail.js';
import { defineTable, materializeTable } from '../atoms/interfaces/table.js';
import { createProduct } from '../atoms/objects/product.js';

const store = new Map<string, Map<string, unknown>>();

const products = [
  createProduct({
    id: 'p1',
    name: 'Cloud Storage',
    price: 9.99,
    category: 'Infrastructure',
    description: 'Scalable object storage.',
    tags: ['storage', 'cloud'],
  }),
  createProduct({
    id: 'p2',
    name: 'Analytics Pro',
    price: 49.99,
    category: 'Analytics',
    description: 'Advanced business analytics.',
    tags: ['analytics', 'reporting'],
  }),
  createProduct({
    id: 'p3',
    name: 'Mail Service',
    price: 4.99,
    category: 'Communication',
    description: 'Transactional email API.',
    tags: ['email', 'communication'],
  }),
  createProduct({
    id: 'p4',
    name: 'CDN Plus',
    price: 19.99,
    category: 'Infrastructure',
    description: 'Global content delivery.',
    tags: ['cdn', 'performance'],
  }),
  createProduct({
    id: 'p5',
    name: 'Data Warehouse',
    price: 99.99,
    category: 'Analytics',
    description: 'Petabyte-scale analytics.',
    tags: ['analytics', 'storage'],
  }),
];

for (const p of products) {
  const typeStore = store.get('Product') ?? new Map();
  typeStore.set(p.id, p.properties);
  store.set('Product', typeStore);
}

const catalogTable = defineTable({
  objectType: 'Product',
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'category', label: 'Category', filterable: true },
    { key: 'price', label: 'Price', sortable: true },
    { key: 'status', label: 'Status', filterable: true },
  ],
  rowActions: ['View', 'Update'],
  pageSize: 10,
});

const productDetail = defineDetail({
  objectType: 'Product',
  sections: [
    {
      title: 'Product Info',
      fields: [
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
        { key: 'category', label: 'Category' },
        { key: 'price', label: 'Price' },
      ],
    },
    {
      title: 'Classification',
      fields: [
        { key: 'status', label: 'Status' },
        { key: 'tags', label: 'Tags' },
      ],
    },
  ],
  actions: ['View', 'Update'],
});

const productStore = store.get('Product')!;
const allProducts = Array.from(productStore.values()) as Record<string, unknown>[];

const tableView = materializeTable(catalogTable, allProducts);

console.log('=== Product Catalog ===');
console.log(tableView.columns.map((c) => c.label).join(' | '));
for (const row of tableView.rows) {
  console.log([row.name, row.category, `$${row.price}`, row.status].join(' | '));
}

const detailView = materializeDetail(productDetail, allProducts[0]);
console.log('\n=== Product Detail ===');
for (const section of detailView.sections) {
  console.log(`\n[${section.title}]`);
  for (const field of section.fields) {
    const val = detailView.data[field.key];
    const display = field.key === 'price' ? `$${val}` : Array.isArray(val) ? val.join(', ') : val;
    console.log(`  ${field.label}: ${display ?? '—'}`);
  }
}

const searchReq = createSearch({ query: 'analytics', objectType: 'Product', limit: 10 });
console.log(`\n=== Search Query ===\n  Text: "${searchReq.query}" on ${searchReq.objectType}`);

const recReq = createRecommend({ itemId: 'p1', objectType: 'Product', strategy: 'similar', maxResults: 3 });
console.log(`\n=== AI Recommendations (stub) ===\n  Based on: ${recReq.itemId}`);
console.log('  Strategy:', recReq.strategy);

const createReq = createAction('Product', { id: 'p6', name: 'AI Platform', price: 199.99, category: 'AI' }, 'admin');
const createResult = executeInMemory(store, createReq);
console.log(
  '\n=== Product Created ===',
  createResult.success ? 'OK' : 'FAIL',
  '—',
  (createResult.data as Record<string, unknown>)?.name,
);

console.log('\nAtoms used: Product, Currency, Status, Table, Detail, Create, Search, Recommend.');
