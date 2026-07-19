/**
 * Core types shared by all atoms in the Software Periodic Table.
 *
 * Design goals:
 * - Minimal runtime surface
 * - Explicit contracts so agents can reason about composition
 * - No framework lock-in
 */

export type AtomId = number;
export type AtomSymbol = string;
export type Family =
  | "objects"
  | "properties"
  | "actions"
  | "interfaces"
  | "intelligence"
  | "rules";

export interface AtomMeta {
  id: AtomId;
  symbol: AtomSymbol;
  name: string;
  family: Family;
  description: string;
}

/**
 * Base contract every atom should satisfy.
 * Concrete atoms extend this with domain-specific shape.
 */
export interface Atom {
  meta: AtomMeta;
}

/**
 * Objects are the primary nouns. They carry identity and a bag of properties.
 */
export interface ObjectAtom extends Atom {
  id: string;
  properties: Record<string, unknown>;
}

/**
 * Properties describe the shape of data on Objects.
 */
export interface PropertyDef {
  key: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "datetime"
    | "currency"
    | "enum"
    | "json"
    | "id"
    | "reference";
  required?: boolean;
  enumValues?: string[];
  description?: string;
}

/**
 * Actions are pure descriptions of intent. Execution is left to the host.
 */
export interface ActionRequest {
  action: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  actorId?: string;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Interfaces describe how data is presented and which actions they expose.
 */
export interface InterfaceSpec {
  kind: string;
  objectType: string;
  columns?: unknown[];
  filters?: string[];
  actions?: string[];
  layout?: Record<string, unknown>;
}

/**
 * Rules bind conditions to effects.
 */
export interface Rule {
  id: string;
  name: string;
  trigger: string;
  condition?: string;
  actions: ActionRequest[];
  enabled: boolean;
}
