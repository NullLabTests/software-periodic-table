import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AtomMeta, ObjectAtom, PropertyDef } from '../atoms/core.js';
import { AccountMeta, AccountProperties, createAccount } from '../atoms/objects/account.js';
import { ActivityMeta, ActivityProperties, createActivity } from '../atoms/objects/activity.js';
import { CallMeta, CallProperties, createCall } from '../atoms/objects/call.js';
import { CampaignMeta, CampaignProperties, createCampaign } from '../atoms/objects/campaign.js';
import { CompanyMeta, CompanyProperties, createCompany } from '../atoms/objects/company.js';
import { ContactMeta, ContactProperties, createContact } from '../atoms/objects/contact.js';
import { createDeal, DealMeta, DealProperties } from '../atoms/objects/deal.js';
import { createDoc, DocMeta, DocProperties } from '../atoms/objects/doc.js';
import { createEmail, EmailMeta, EmailProperties } from '../atoms/objects/email.js';
import { createEvent, EventMeta, EventProperties } from '../atoms/objects/event.js';
import { createFile, FileMeta, FileProperties } from '../atoms/objects/file.js';
import { createInvoice, InvoiceMeta, InvoiceProperties } from '../atoms/objects/invoice.js';
import { createLead, LeadMeta, LeadProperties } from '../atoms/objects/lead.js';
import { createLocation, LocationMeta, LocationProperties } from '../atoms/objects/location.js';
import { createMeeting, MeetingMeta, MeetingProperties } from '../atoms/objects/meeting.js';
import { createMessage, MessageMeta, MessageProperties } from '../atoms/objects/message.js';
import { createNote, NoteMeta, NoteProperties } from '../atoms/objects/note.js';
import { createOpportunity, OpportunityMeta, OpportunityProperties } from '../atoms/objects/opportunity.js';
import { createPayment, PaymentMeta, PaymentProperties } from '../atoms/objects/payment.js';
import { createPerson, PersonMeta, PersonProperties } from '../atoms/objects/person.js';
import { createPlan, PlanMeta, PlanProperties } from '../atoms/objects/plan.js';
import { createPrice, PriceMeta, PriceProperties } from '../atoms/objects/price.js';
import { createProduct, ProductMeta, ProductProperties } from '../atoms/objects/product.js';
import { createProject, ProjectMeta, ProjectProperties } from '../atoms/objects/project.js';
import { createRole, RoleMeta, RoleProperties } from '../atoms/objects/role.js';
import { createService, ServiceMeta, ServiceProperties } from '../atoms/objects/service.js';
import { createSubscription, SubscriptionMeta, SubscriptionProperties } from '../atoms/objects/subscription.js';
import { createSubtask, SubtaskMeta, SubtaskProperties } from '../atoms/objects/subtask.js';
import { createTag, TagMeta, TagProperties } from '../atoms/objects/tag.js';
import { createTask, TaskMeta, TaskProperties } from '../atoms/objects/task.js';
import { createTeam, TeamMeta, TeamProperties } from '../atoms/objects/team.js';
import { createTemplate, TemplateMeta, TemplateProperties } from '../atoms/objects/template.js';
import { createUser, UserMeta, UserProperties } from '../atoms/objects/user.js';
import { createVendor, VendorMeta, VendorProperties } from '../atoms/objects/vendor.js';
import { createWorkflow, WorkflowMeta, WorkflowProperties } from '../atoms/objects/workflow.js';
import { loadOntology } from '../src/ontology.js';

interface ObjectCase {
  symbol: string;
  meta: AtomMeta;
  properties: PropertyDef[];
  create: (input: Record<string, unknown>) => ObjectAtom;
  /** Smallest valid input: only the fields the factory requires. */
  input: Record<string, unknown>;
  /** Optional fields, supplied to prove the factory does not drop them. */
  extra: Record<string, unknown>;
  /** Values the factory must supply when the caller omits the field. */
  defaults: Record<string, unknown>;
}

/**
 * Register one object atom with a minimal input, optional inputs to round-trip,
 * and the defaults it promises. Keeping this generic is what lets a single set
 * of assertions cover all 35 object atoms instead of 35 near-identical tests.
 */
function objectCase<I extends object>(
  meta: AtomMeta,
  properties: PropertyDef[],
  create: (input: I) => ObjectAtom,
  input: I,
  extra: Record<string, unknown>,
  defaults: Record<string, unknown>,
): ObjectCase {
  return {
    symbol: meta.symbol,
    meta,
    properties,
    create: (raw) => create(raw as unknown as I),
    input: { ...input } as Record<string, unknown>,
    extra,
    defaults,
  };
}

const objectCases: ObjectCase[] = [
  objectCase(
    CompanyMeta,
    CompanyProperties,
    createCompany,
    { id: 'co_1', name: 'Acme' },
    { industry: 'Software', website: 'https://acme.test', phone: '+1-555-0100', address: '1 Main St', status: 'lead' },
    { status: 'active' },
  ),
  objectCase(
    PersonMeta,
    PersonProperties,
    createPerson,
    { id: 'pe_1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test' },
    { phone: '+1-555-0101', title: 'Engineer', companyId: 'co_1' },
    {},
  ),
  objectCase(
    ContactMeta,
    ContactProperties,
    createContact,
    { id: 'ct_1', firstName: 'Grace', lastName: 'Hopper' },
    { email: 'grace@example.test', phone: '+1-555-0102', companyId: 'co_1', role: 'CTO', status: 'lead' },
    { status: 'active' },
  ),
  objectCase(
    LeadMeta,
    LeadProperties,
    createLead,
    { id: 'ld_1', name: 'Linus', email: 'linus@example.test' },
    { phone: '+1-555-0103', company: 'Kernel Co', source: 'referral', owner: 'us_1', score: 87 },
    { source: 'web', status: 'new' },
  ),
  objectCase(
    DealMeta,
    DealProperties,
    createDeal,
    { id: 'dl_1', title: 'Enterprise', amount: 12_000 },
    {
      currency: 'EUR',
      stage: 'proposal',
      owner: 'us_1',
      accountId: 'ac_1',
      contactId: 'ct_1',
      expectedCloseDate: '2026-12-01',
      probability: 60,
    },
    { stage: 'prospecting' },
  ),
  objectCase(
    AccountMeta,
    AccountProperties,
    createAccount,
    { id: 'ac_1', name: 'Acme' },
    {
      type: 'partner',
      industry: 'Software',
      website: 'https://acme.test',
      phone: '+1-555-0100',
      billingAddress: '1 Main St',
      owner: 'us_1',
    },
    { type: 'customer', status: 'active' },
  ),
  objectCase(
    UserMeta,
    UserProperties,
    createUser,
    { id: 'us_1', email: 'user@example.test', name: 'Test User' },
    { role: 'admin' },
    { status: 'active' },
  ),
  objectCase(
    TeamMeta,
    TeamProperties,
    createTeam,
    { id: 'tm_1', name: 'Core' },
    { description: 'Platform team', memberIds: ['us_1'], owner: 'us_1' },
    {},
  ),
  objectCase(
    RoleMeta,
    RoleProperties,
    createRole,
    { id: 'ro_1', name: 'Admin' },
    { description: 'Administrators', permissions: ['task:read'], isSystem: true },
    {},
  ),
  objectCase(
    OpportunityMeta,
    OpportunityProperties,
    createOpportunity,
    { id: 'op_1', title: 'Expansion', value: 5_000 },
    {
      currency: 'EUR',
      stage: 'proposal',
      owner: 'us_1',
      accountId: 'ac_1',
      source: 'inbound',
      closeDate: '2026-12-31',
    },
    { stage: 'discovery' },
  ),
  objectCase(
    ProductMeta,
    ProductProperties,
    createProduct,
    { id: 'pr_1', name: 'Widget', price: 19.99 },
    {
      description: 'A widget',
      currency: 'EUR',
      category: 'hardware',
      status: 'inactive',
      imageUrl: 'https://acme.test/widget.png',
      tags: ['new'],
    },
    { currency: 'USD', status: 'active' },
  ),
  objectCase(
    ServiceMeta,
    ServiceProperties,
    createService,
    { id: 'sv_1', name: 'Installation' },
    { description: 'On-site install', category: 'field', price: 100, currency: 'EUR', durationMinutes: 90 },
    { status: 'active' },
  ),
  objectCase(
    ProjectMeta,
    ProjectProperties,
    createProject,
    { id: 'pj_1', name: 'Launch' },
    {
      description: 'Q4 launch',
      status: 'active',
      priority: 'high',
      owner: 'us_1',
      startDate: '2026-11-01',
      endDate: '2026-12-01',
      budget: 5_000,
    },
    { status: 'planning' },
  ),
  objectCase(
    TaskMeta,
    TaskProperties,
    createTask,
    { id: 'tk_1', title: 'Write tests' },
    {
      description: 'Cover the object family',
      status: 'in_progress',
      priority: 'urgent',
      owner: 'us_1',
      projectId: 'pj_1',
      dueDate: '2026-11-01',
    },
    { status: 'todo', priority: 'medium' },
  ),
  objectCase(
    SubtaskMeta,
    SubtaskProperties,
    createSubtask,
    { id: 'st_1', title: 'Review', parentTaskId: 'tk_1' },
    { assignee: 'us_1', dueDate: '2026-11-01' },
    { status: 'todo' },
  ),
  objectCase(
    DocMeta,
    DocProperties,
    createDoc,
    { id: 'dc_1', title: 'Spec' },
    { body: '# Spec', format: 'html', authorId: 'us_1', folderId: 'dc_0' },
    { format: 'markdown', status: 'draft' },
  ),
  objectCase(
    FileMeta,
    FileProperties,
    createFile,
    { id: 'fl_1', name: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 1024, storageKey: 's3://bucket/a' },
    { uploadedBy: 'us_1', parentId: 'fl_0', metadata: { pages: 2 } },
    {},
  ),
  objectCase(
    NoteMeta,
    NoteProperties,
    createNote,
    { id: 'nt_1', body: 'Note' },
    { authorId: 'us_1', entityType: 'Task', entityId: 'tk_1', pinned: true },
    {},
  ),
  objectCase(
    EventMeta,
    EventProperties,
    createEvent,
    { id: 'ev_1', title: 'Launch', startsAt: '2026-11-01T10:00:00.000Z' },
    {
      endsAt: '2026-11-01T11:00:00.000Z',
      type: 'deadline',
      calendarId: 'cal_1',
      attendeeIds: ['us_1'],
      location: 'HQ',
    },
    { type: 'appointment' },
  ),
  objectCase(
    MeetingMeta,
    MeetingProperties,
    createMeeting,
    { id: 'mt_1', title: 'Standup', startsAt: '2026-11-01T09:00:00.000Z' },
    {
      endsAt: '2026-11-01T09:15:00.000Z',
      organizerId: 'us_1',
      attendeeIds: ['us_2'],
      location: 'Room 1',
      conferenceUrl: 'https://meet.test/1',
      agenda: 'Status',
    },
    { status: 'scheduled' },
  ),
  objectCase(
    InvoiceMeta,
    InvoiceProperties,
    createInvoice,
    {
      id: 'in_1',
      number: 'INV-1',
      customerName: 'Acme',
      amount: 100,
      issueDate: '2026-10-01',
      dueDate: '2026-10-31',
    },
    {
      customerId: 'ac_1',
      currency: 'EUR',
      status: 'sent',
      paidAt: '2026-10-15T12:00:00.000Z',
      notes: 'Thanks',
    },
    { currency: 'USD', status: 'draft' },
  ),
  objectCase(
    PaymentMeta,
    PaymentProperties,
    createPayment,
    { id: 'pm_1', amount: 100 },
    {
      currency: 'EUR',
      method: 'bank_transfer',
      invoiceId: 'in_1',
      customerId: 'ac_1',
      receivedAt: '2026-10-15T12:00:00.000Z',
      reference: 'REF-1',
    },
    { method: 'card', status: 'pending' },
  ),
  objectCase(
    SubscriptionMeta,
    SubscriptionProperties,
    createSubscription,
    { id: 'su_1', customerId: 'ac_1', planId: 'pl_1' },
    {
      billingInterval: 'yearly',
      startDate: '2026-01-01',
      renewalDate: '2027-01-01',
      cancelAt: '2026-12-01T00:00:00.000Z',
    },
    { status: 'active', billingInterval: 'monthly' },
  ),
  objectCase(
    PlanMeta,
    PlanProperties,
    createPlan,
    { id: 'pl_1', name: 'Pro', price: 49 },
    { description: 'Pro tier', currency: 'EUR', interval: 'yearly', features: ['a'], limits: { seats: 10 } },
    { interval: 'monthly', status: 'active' },
  ),
  objectCase(
    PriceMeta,
    PriceProperties,
    createPrice,
    { id: 'px_1', amount: 49, currency: 'USD', objectType: 'Plan', objectId: 'pl_1' },
    { tier: 'sale', validFrom: '2026-01-01', validTo: '2026-12-31' },
    { tier: 'list' },
  ),
  objectCase(
    CampaignMeta,
    CampaignProperties,
    createCampaign,
    { id: 'cp_1', name: 'Promo' },
    {
      description: 'Launch promo',
      type: 'social',
      owner: 'us_1',
      budget: 1_000,
      startsAt: '2026-11-01T00:00:00.000Z',
      endsAt: '2026-11-30T00:00:00.000Z',
    },
    { type: 'email', status: 'draft' },
  ),
  objectCase(
    MessageMeta,
    MessageProperties,
    createMessage,
    { id: 'ms_1', body: 'Hi', senderId: 'us_1' },
    {
      channel: 'sms',
      threadId: 'th_1',
      recipientIds: ['us_2'],
      readBy: ['us_2'],
      sentAt: '2026-11-01T10:00:00.000Z',
    },
    { channel: 'in_app' },
  ),
  objectCase(
    EmailMeta,
    EmailProperties,
    createEmail,
    { id: 'em_1', to: 'a@example.test', from: 'b@example.test', subject: 'Hi' },
    {
      body: 'Hello',
      cc: ['c@example.test'],
      bcc: ['d@example.test'],
      attachments: ['f.pdf'],
      status: 'sent',
      sentAt: '2026-11-01T10:00:00.000Z',
    },
    { status: 'draft' },
  ),
  objectCase(
    CallMeta,
    CallProperties,
    createCall,
    { id: 'cl_1' },
    {
      participantIds: ['us_1', 'us_2'],
      direction: 'inbound',
      kind: 'video',
      startedAt: '2026-11-01T10:00:00.000Z',
      endedAt: '2026-11-01T10:02:00.000Z',
      durationSeconds: 120,
      recordingUrl: 'https://rec.test/1',
      summary: 'Sync',
    },
    { direction: 'outbound', kind: 'voice' },
  ),
  objectCase(
    ActivityMeta,
    ActivityProperties,
    createActivity,
    { id: 'ay_1', type: 'call', subject: 'Intro' },
    {
      description: 'Intro call',
      contactId: 'ct_1',
      performedBy: 'us_1',
      performedAt: '2026-11-01T10:00:00.000Z',
    },
    {},
  ),
  objectCase(
    WorkflowMeta,
    WorkflowProperties,
    createWorkflow,
    { id: 'wf_1', name: 'Onboarding', steps: [{ action: 'notify' }] },
    { description: 'Onboard a user', trigger: { on: 'create' }, version: 3 },
    { status: 'draft', version: 1 },
  ),
  objectCase(
    TemplateMeta,
    TemplateProperties,
    createTemplate,
    { id: 'tp_1', name: 'Welcome', entityType: 'Email', content: { body: 'Hi' } },
    { description: 'Welcome email', variables: ['name'], isSystem: true },
    {},
  ),
  objectCase(
    TagMeta,
    TagProperties,
    createTag,
    { id: 'tg_1', name: 'urgent' },
    { color: '#ff0000', entityType: 'Task' },
    {},
  ),
  objectCase(
    LocationMeta,
    LocationProperties,
    createLocation,
    { id: 'lc_1', name: 'HQ' },
    {
      address: '1 Main St',
      latitude: 1.5,
      longitude: -2.5,
      city: 'Springfield',
      country: 'US',
      timezone: 'America/New_York',
    },
    {},
  ),
  objectCase(
    VendorMeta,
    VendorProperties,
    createVendor,
    { id: 'vn_1', name: 'Supplier' },
    {
      contactName: 'Sam',
      email: 'sam@supplier.test',
      phone: '+1-555-0104',
      website: 'https://supplier.test',
      paymentTerms: 'net30',
    },
    { status: 'active' },
  ),
];

const ontology = loadOntology();

/** Fail with the element and field in the message, not just "expected true". */
function assertMatchesType(def: PropertyDef, value: unknown, label: string): void {
  if (value === undefined) return;
  switch (def.type) {
    case 'string':
    case 'date':
    case 'datetime':
    case 'id':
    case 'reference':
      assert.equal(typeof value, 'string', `${label} is not a string`);
      break;
    case 'number':
    case 'currency':
      assert.equal(typeof value, 'number', `${label} is not a number`);
      assert.ok(Number.isFinite(value as number), `${label} is not finite`);
      break;
    case 'boolean':
      assert.equal(typeof value, 'boolean', `${label} is not a boolean`);
      break;
    case 'enum':
      assert.ok(
        def.enumValues?.includes(value as string),
        `${label} = ${String(value)} is not in ${def.enumValues?.join(', ')}`,
      );
      break;
    case 'json':
      assert.ok(typeof value === 'object' && value !== null, `${label} is not an object`);
      break;
  }
}

describe('object atoms', () => {
  it('registers every object element in the ontology', () => {
    const declared = ontology.elements.filter((element) => element.family === 'objects');
    assert.equal(objectCases.length, declared.length);
    assert.deepEqual(objectCases.map((c) => c.symbol).sort(), declared.map((element) => element.symbol).sort());
  });

  it('declares metadata that matches the ontology', () => {
    for (const testCase of objectCases) {
      const element = ontology.elements.find((candidate) => candidate.symbol === testCase.symbol);
      assert.ok(element, `${testCase.symbol} is not in the ontology`);
      assert.equal(testCase.meta.id, element.id, `${testCase.symbol} id`);
      assert.equal(testCase.meta.symbol, element.symbol, `${testCase.symbol} symbol`);
      assert.equal(testCase.meta.name, element.name, `${testCase.symbol} name`);
      assert.equal(testCase.meta.family, 'objects', `${testCase.symbol} family`);
      assert.ok(testCase.meta.description.length > 0, `${testCase.symbol} description`);
    }
  });

  for (const testCase of objectCases) {
    describe(`${testCase.meta.name} (${testCase.symbol})`, () => {
      it('materializes every declared property and nothing undeclared', () => {
        const created = testCase.create(testCase.input);
        const declared = new Set(testCase.properties.map((def) => def.key));

        for (const def of testCase.properties) {
          assert.ok(
            Object.hasOwn(created.properties, def.key),
            `${testCase.symbol} declares ${def.key} but the factory does not set it`,
          );
          assertMatchesType(def, created.properties[def.key], `${testCase.symbol}.${def.key}`);
        }

        const undeclared = Object.keys(created.properties).filter((key) => !declared.has(key));
        assert.deepEqual(undeclared, [], `${testCase.symbol} writes properties it never declares`);
      });

      it('fills required properties and applies defaults', () => {
        const created = testCase.create(testCase.input);
        assert.equal(created.meta, testCase.meta);
        assert.equal(created.id, testCase.input.id);

        for (const def of testCase.properties.filter((property) => property.required)) {
          const value = created.properties[def.key];
          assert.notEqual(value, undefined, `${testCase.symbol}.${def.key} is required but unset`);
          assert.notEqual(value, null, `${testCase.symbol}.${def.key} is required but null`);
        }

        for (const [key, expected] of Object.entries(testCase.defaults)) {
          assert.deepEqual(created.properties[key], expected, `${testCase.symbol}.${key} default`);
        }
      });

      it('round-trips optional inputs instead of dropping them', () => {
        const input = { ...testCase.input, ...testCase.extra };
        const created = testCase.create(input);
        for (const [key, value] of Object.entries(input)) {
          assert.deepEqual(created.properties[key], value, `${testCase.symbol}.${key} was not copied through`);
        }
      });
    });
  }
});
