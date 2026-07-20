import type { Family } from '../atoms/core.js';

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
  expectedInterfaces: string[];
  minAtomsUsed: number;
  acceptanceCriteria: string[];
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
    expectedInterfaces: ['Kanban', 'Table'],
    minAtomsUsed: 8,
    acceptanceCriteria: [
      'Tasks can be created with title, description, priority, assignee',
      'Tasks can be moved through statuses',
      'Tasks display in both Kanban and Table views',
      'Access control restricts task creation to authorized roles',
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
    expectedInterfaces: ['Table', 'Detail'],
    minAtomsUsed: 8,
    acceptanceCriteria: [
      'Companies and Contacts can be created and linked',
      'Activities can be logged against contacts',
      'Contacts are searchable by name and company',
      'Contact list supports filtering and sorting',
      'Contact list can be exported',
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
    expectedInterfaces: ['Table'],
    minAtomsUsed: 7,
    acceptanceCriteria: [
      'Invoices can be created with number, customer, amount, dates',
      'Invoices have valid status transitions',
      'Filter by status and date range',
      'Sort by amount or date',
      'Export filtered results as CSV',
      'Admin-only access for create/update',
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
    expectedInterfaces: ['Table', 'Form'],
    minAtomsUsed: 8,
    acceptanceCriteria: [
      'Users can be created with name, email, role',
      'Users can be organized into teams',
      'Roles define permission sets',
      'User status lifecycle (active, invited, disabled)',
      'User list is filterable by role',
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
    expectedInterfaces: ['Table', 'Feed'],
    minAtomsUsed: 8,
    acceptanceCriteria: [
      'Rules can be created with trigger, condition, action',
      'Notifications fire when conditions are met',
      'Notifications can be email or in-app message',
      'Rule list is viewable in a Table',
      'Notification history is viewable in a Feed',
      'All rule firings are audited',
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
    expectedInterfaces: ['Gallery', 'Table', 'Detail'],
    minAtomsUsed: 9,
    acceptanceCriteria: [
      'Products have name, description, price, category, status',
      'Products displayed in Grid and Table views',
      'Search by name or description',
      'Filter by category and price range',
      'AI recommendations on product detail page',
      'Admin-only create/update',
    ],
  },
];
