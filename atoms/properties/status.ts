import type { AtomMeta } from "../core.js";

export const StatusMeta: AtomMeta = {
  id: 36,
  symbol: "Ss",
  name: "Status",
  family: "properties",
  description: "Lifecycle or state value. Almost every Object needs one.",
};

/**
 * Common status vocabularies. Prefer these over inventing new ones.
 */
export const CommonStatusVocabularies = {
  task: ["backlog", "todo", "in_progress", "done", "cancelled"] as const,
  user: ["active", "invited", "disabled"] as const,
  invoice: ["draft", "sent", "paid", "overdue", "void"] as const,
  subscription: ["trialing", "active", "past_due", "cancelled", "paused"] as const,
  generic: ["active", "inactive", "archived"] as const,
};

export type StatusValue = string;

export function assertValidStatus(
  value: string,
  allowed: readonly string[]
): asserts value is string {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid status "${value}". Allowed: ${allowed.join(", ")}`);
  }
}
