import type { Family } from '../atoms/core.js';

export interface AcceptanceCriterion {
  /** Human-readable statement of what the scenario must satisfy. */
  text: string;
  /**
   * Atom symbols of which at least one must appear in the produced plan for the
   * criterion to pass. Keeping this explicit is what makes the check meaningful:
   * a free-text criterion matched by keyword search can be satisfied by an
   * unrelated atom, so every criterion names the atoms that satisfy it.
   */
  requires: string[];
}

export interface EvalScenario {
  id: string;
  title: string;
  description: string;
  featureRequest: string;
  expectedAtoms: {
    family: Family;
    symbols: string[];
    description: string;
  }[];
  /** Ground-truth atom set. Fidelity is scored against this. */
  groundTruthAtoms: string[];
  minAtomsUsed: number;
  acceptanceCriteria: AcceptanceCriterion[];
}

export const SCENARIOS: EvalScenario[] = [
  {
    id: 'task-board',
    title: 'Task Board with Status and Assignees',
    description: 'A project-management board where users can create, assign, and track tasks across status columns.',
    featureRequest: `Build a task board application. Users should be able to create tasks with a title, description, priority, and assignee. Tasks move through statuses: backlog, todo, in_progress, done. Users can view tasks in a Kanban board or a Table view. Only authenticated users with appropriate roles can create or update tasks.`,
    expectedAtoms: [
      { family: 'objects', symbols: ['Tk', 'Us'], description: 'Task and User objects' },
      { family: 'properties', symbols: ['Ss', 'Py', 'Ow'], description: 'Status, Priority, Owner' },
      { family: 'actions', symbols: ['Cr', 'Up', 'Vw', 'As'], description: 'CRUD + Assign actions' },
      { family: 'interfaces', symbols: ['Kb', 'Tb'], description: 'Kanban + Table views' },
      { family: 'rules', symbols: ['Pn'], description: 'Permission rules' },
    ],
    groundTruthAtoms: ['Tk', 'Us', 'Ss', 'Py', 'Ow', 'Cr', 'Up', 'Vw', 'As', 'Kb', 'Tb', 'Pn'],
    minAtomsUsed: 8,
    acceptanceCriteria: [
      { text: 'Tasks and users are modeled as entities', requires: ['Tk', 'Us'] },
      { text: 'Tasks can be created with priority and an assignee', requires: ['Cr', 'Py', 'Ow'] },
      { text: 'Tasks can be moved through statuses', requires: ['Ss', 'Up'] },
      { text: 'Tasks can be assigned to a user', requires: ['As'] },
      { text: 'Tasks display in both Kanban and Table views', requires: ['Kb', 'Tb'] },
      { text: 'Tasks can be viewed', requires: ['Vw'] },
      { text: 'Access control restricts task creation to authorized roles', requires: ['Pn'] },
    ],
  },
  {
    id: 'crm-contacts',
    title: 'Simple CRM Contact Management',
    description: 'A contact management system with companies, people, activity logging, and search.',
    featureRequest: `Build a CRM contact manager. Users manage Companies and Contacts. Each contact has name, email, phone, company association. Log activities (calls, emails, meetings) against contacts. Search contacts by name or company. View contacts in a Table with filtering and sorting. Export the contact list.`,
    expectedAtoms: [
      { family: 'objects', symbols: ['Co', 'Ct', 'Ay'], description: 'Company, Contact, Activity' },
      { family: 'properties', symbols: ['Ss', 'Dt'], description: 'Status, Date' },
      {
        family: 'actions',
        symbols: ['Cr', 'Up', 'De', 'Vw', 'Se', 'Fi', 'So', 'Ex'],
        description: 'CRUD + Search/Filter/Sort/Export',
      },
      { family: 'interfaces', symbols: ['Tb', 'Di'], description: 'Table + Detail views' },
    ],
    groundTruthAtoms: ['Co', 'Ct', 'Ay', 'Ss', 'Dt', 'Cr', 'Up', 'De', 'Vw', 'Se', 'Fi', 'So', 'Ex', 'Tb', 'Di'],
    minAtomsUsed: 8,
    acceptanceCriteria: [
      { text: 'Companies and contacts are modeled and linked', requires: ['Co', 'Ct'] },
      { text: 'Activities are logged against contacts', requires: ['Ay', 'Cr'] },
      { text: 'Activities carry a date', requires: ['Dt'] },
      { text: 'Contacts are searchable', requires: ['Se'] },
      { text: 'Contact list supports filtering and sorting', requires: ['Fi', 'So'] },
      { text: 'Contact list can be exported', requires: ['Ex'] },
      { text: 'Contacts display in a Table with a Detail view', requires: ['Tb', 'Di'] },
      { text: 'Records can be updated, deleted and viewed', requires: ['Up', 'De', 'Vw'] },
      { text: 'Records carry a status', requires: ['Ss'] },
    ],
  },
  {
    id: 'invoice-list',
    title: 'Invoice List with Filters and Export',
    description: 'A billing dashboard showing invoices with status tracking, filtering, and export capabilities.',
    featureRequest: `Build an invoice management dashboard. Invoices have a number, customer name, amount (currency), issue date, due date, and status (draft, sent, paid, overdue, void). Users can filter by status and date range, sort by amount or date, and export the filtered list as CSV. Users with admin role can create and update invoices.`,
    expectedAtoms: [
      { family: 'objects', symbols: ['In'], description: 'Invoice object' },
      {
        family: 'properties',
        symbols: ['Ss', 'Cu', 'Dt', 'Sd', 'Ed', 'Nm'],
        description: 'Status, Currency, Date, Start/End dates, Number',
      },
      {
        family: 'actions',
        symbols: ['Cr', 'Up', 'Fi', 'So', 'Ex'],
        description: 'Create, Update, Filter, Sort, Export',
      },
      { family: 'interfaces', symbols: ['Tb'], description: 'Table view' },
      { family: 'rules', symbols: ['Pn'], description: 'Permission rules' },
    ],
    groundTruthAtoms: ['In', 'Ss', 'Cu', 'Dt', 'Sd', 'Ed', 'Nm', 'Cr', 'Up', 'Fi', 'So', 'Ex', 'Tb', 'Pn'],
    minAtomsUsed: 7,
    acceptanceCriteria: [
      { text: 'Invoices are modeled as an entity', requires: ['In'] },
      { text: 'Invoices have a number and an amount in currency', requires: ['Nm', 'Cu'] },
      { text: 'Invoices have issue, start and end dates', requires: ['Dt', 'Sd', 'Ed'] },
      { text: 'Invoices have a status', requires: ['Ss'] },
      { text: 'Invoices can be created and updated', requires: ['Cr', 'Up'] },
      { text: 'Users can filter and sort invoices', requires: ['Fi', 'So'] },
      { text: 'Filtered results can be exported', requires: ['Ex'] },
      { text: 'Invoices display in a Table', requires: ['Tb'] },
      { text: 'Admin-only access for create/update', requires: ['Pn'] },
    ],
  },
  {
    id: 'user-role-management',
    title: 'User and Role Management',
    description: 'Admin panel for managing users, roles, and permissions with team organization.',
    featureRequest: `Build a user and role management system. Admins can create users, assign them to roles (admin, member, viewer), and organize users into teams. Each role has a set of permissions. Users can be activated, invited, or disabled. View all users in a Table with role filtering.`,
    expectedAtoms: [
      { family: 'objects', symbols: ['Us', 'Ro', 'Tm'], description: 'User, Role, Team objects' },
      { family: 'properties', symbols: ['Ss'], description: 'Status property' },
      { family: 'actions', symbols: ['Cr', 'Up', 'De', 'Vw', 'Fi'], description: 'CRUD + Filter' },
      { family: 'interfaces', symbols: ['Tb', 'Fm'], description: 'Table + Form views' },
      { family: 'rules', symbols: ['Pn', 'Po'], description: 'Permission + Policy rules' },
    ],
    groundTruthAtoms: ['Us', 'Ro', 'Tm', 'Ss', 'Cr', 'Up', 'De', 'Vw', 'Fi', 'Tb', 'Fm', 'Pn', 'Po'],
    minAtomsUsed: 8,
    acceptanceCriteria: [
      { text: 'Users, roles and teams are modeled', requires: ['Us', 'Ro', 'Tm'] },
      { text: 'Users have a status lifecycle', requires: ['Ss'] },
      { text: 'Users can be created, updated and deleted', requires: ['Cr', 'Up', 'De'] },
      { text: 'Users can be viewed and the list filtered', requires: ['Vw', 'Fi'] },
      { text: 'Users display in a Table and are edited via a Form', requires: ['Tb', 'Fm'] },
      { text: 'Roles define permission sets', requires: ['Ro', 'Pn'] },
      { text: 'Governing policy is enforced', requires: ['Po'] },
    ],
  },
  {
    id: 'notification-rules',
    title: 'Notification Rules Engine',
    description: 'A configurable notification system where triggers fire notifications based on conditions.',
    featureRequest: `Build a notification rules engine. Admins create rules that fire notifications when certain conditions are met (e.g. "when a task status changes to done, notify the owner"). Notifications can be email or in-app messages. Rules have a trigger (event), optional conditions, and an action (notification). View all rules in a Table and see notification history in a Feed.`,
    expectedAtoms: [
      { family: 'objects', symbols: ['Wf', 'Ms', 'Em'], description: 'Workflow, Message, Email' },
      { family: 'properties', symbols: ['Ss', 'Bl'], description: 'Status, Boolean' },
      { family: 'actions', symbols: ['Tr', 'No', 'Mg'], description: 'Trigger, Notify, Message' },
      { family: 'interfaces', symbols: ['Tb', 'Fd'], description: 'Table + Feed views' },
      { family: 'rules', symbols: ['Ti', 'Cv', 'At', 'Au'], description: 'Trigger, Condition, Action, Audit' },
    ],
    groundTruthAtoms: ['Wf', 'Ms', 'Em', 'Ss', 'Bl', 'Tr', 'No', 'Mg', 'Tb', 'Fd', 'Ti', 'Cv', 'At', 'Au'],
    minAtomsUsed: 8,
    acceptanceCriteria: [
      { text: 'Rules are modeled as workflows carrying messages', requires: ['Wf', 'Ms'] },
      { text: 'Email notifications are supported', requires: ['Em', 'No'] },
      { text: 'In-app messages are sent', requires: ['Mg'] },
      { text: 'Rules have a status and an enable flag', requires: ['Ss', 'Bl'] },
      { text: 'Triggers fire notifications', requires: ['Tr', 'Ti'] },
      { text: 'Conditions gate notification delivery', requires: ['Cv'] },
      { text: 'Rules bind to a notification action', requires: ['At'] },
      { text: 'Rule firings are audited', requires: ['Au'] },
      { text: 'Rules display in a Table, history in a Feed', requires: ['Tb', 'Fd'] },
    ],
  },
  {
    id: 'product-catalog',
    title: 'Product Catalog with Search and Recommendations',
    description: 'A product catalog with categories, search, and AI-powered recommendations.',
    featureRequest: `Build a product catalog. Products have name, description, price (currency), category, and status (active, inactive). Users can browse products in a Grid or Table view, search by name or description, and filter by category and price range. An AI Recommend atom suggests related products based on the currently viewed product. Admins can create and update products.`,
    expectedAtoms: [
      { family: 'objects', symbols: ['Pr', 'Tg'], description: 'Product, Tag' },
      { family: 'properties', symbols: ['Cu', 'Ss', 'Tx'], description: 'Currency, Status, Text' },
      { family: 'actions', symbols: ['Cr', 'Up', 'Vw', 'Se', 'Fi'], description: 'CRUD + Search, Filter' },
      { family: 'interfaces', symbols: ['Gy', 'Tb', 'Di'], description: 'Gallery, Table, Detail views' },
      { family: 'intelligence', symbols: ['Sr', 'Rc'], description: 'Search, Recommend' },
    ],
    groundTruthAtoms: ['Pr', 'Tg', 'Cu', 'Ss', 'Tx', 'Cr', 'Up', 'Vw', 'Se', 'Fi', 'Gy', 'Tb', 'Di', 'Sr', 'Rc'],
    minAtomsUsed: 9,
    acceptanceCriteria: [
      { text: 'Products and tags are modeled', requires: ['Pr', 'Tg'] },
      { text: 'Products carry currency, status and description', requires: ['Cu', 'Ss', 'Tx'] },
      { text: 'Products can be created and updated', requires: ['Cr', 'Up'] },
      { text: 'Products can be browsed', requires: ['Vw'] },
      { text: 'Products are searchable', requires: ['Se', 'Sr'] },
      { text: 'Products can be filtered', requires: ['Fi'] },
      { text: 'Products display in Gallery, Table and Detail views', requires: ['Gy', 'Tb', 'Di'] },
      { text: 'AI recommendations are applied', requires: ['Rc'] },
    ],
  },
];
