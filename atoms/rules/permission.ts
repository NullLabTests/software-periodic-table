import type { AtomMeta } from "../core.js";

export const PermissionMeta: AtomMeta = {
  id: 109,
  symbol: "Pn",
  name: "Permission",
  family: "rules",
  description: "Access control statement. Who can perform which Action on which Object.",
};

export interface Permission {
  id: string;
  role: string;           // Role name or id
  action: string;         // Action name (Create, Update, Delete, View, ...)
  objectType: string;     // Object atom name
  condition?: string;     // Optional predicate (e.g. "owner == actor")
}

export function can(
  permissions: Permission[],
  role: string,
  action: string,
  objectType: string
): boolean {
  return permissions.some(
    (p) =>
      p.role === role &&
      p.action === action &&
      p.objectType === objectType
  );
}

/** Minimal default policy for a typical multi-user app. */
export const defaultTaskPermissions: Permission[] = [
  { id: "p1", role: "admin", action: "Create", objectType: "Task" },
  { id: "p2", role: "admin", action: "Update", objectType: "Task" },
  { id: "p3", role: "admin", action: "Delete", objectType: "Task" },
  { id: "p4", role: "admin", action: "View", objectType: "Task" },
  { id: "p5", role: "member", action: "Create", objectType: "Task" },
  { id: "p6", role: "member", action: "Update", objectType: "Task" },
  { id: "p7", role: "member", action: "View", objectType: "Task" },
  { id: "p8", role: "viewer", action: "View", objectType: "Task" },
];
