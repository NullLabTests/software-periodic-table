import type { ActionRequest, ActionResult, AtomMeta } from "../core.js";

export const CreateMeta: AtomMeta = {
  id: 61,
  symbol: "Cr",
  name: "Create",
  family: "actions",
  description: "Instantiate a new object.",
};

export const UpdateMeta: AtomMeta = {
  id: 62,
  symbol: "Up",
  name: "Update",
  family: "actions",
  description: "Modify an existing object.",
};

export const DeleteMeta: AtomMeta = {
  id: 64,
  symbol: "De",
  name: "Delete",
  family: "actions",
  description: "Remove or soft-delete an object.",
};

export const ViewMeta: AtomMeta = {
  id: 65,
  symbol: "Vw",
  name: "View",
  family: "actions",
  description: "Retrieve or display an object.",
};

/**
 * Declarative action builders. The host runtime decides how to execute them.
 */
export function createAction(
  targetType: string,
  payload: Record<string, unknown>,
  actorId?: string
): ActionRequest {
  return {
    action: "Create",
    targetType,
    payload,
    actorId,
  };
}

export function updateAction(
  targetType: string,
  targetId: string,
  payload: Record<string, unknown>,
  actorId?: string
): ActionRequest {
  return {
    action: "Update",
    targetType,
    targetId,
    payload,
    actorId,
  };
}

export function deleteAction(
  targetType: string,
  targetId: string,
  actorId?: string
): ActionRequest {
  return {
    action: "Delete",
    targetType,
    targetId,
    actorId,
  };
}

export function viewAction(
  targetType: string,
  targetId: string,
  actorId?: string
): ActionRequest {
  return {
    action: "View",
    targetType,
    targetId,
    actorId,
  };
}

/** Simple in-memory executor for examples and tests. */
export function executeInMemory(
  store: Map<string, Map<string, unknown>>,
  req: ActionRequest
): ActionResult {
  const typeStore = store.get(req.targetType ?? "") ?? new Map();
  store.set(req.targetType ?? "", typeStore);

  switch (req.action) {
    case "Create": {
      const id = (req.payload?.id as string) ?? crypto.randomUUID();
      const record = { ...req.payload, id };
      typeStore.set(id, record);
      return { success: true, data: record };
    }
    case "Update": {
      if (!req.targetId || !typeStore.has(req.targetId)) {
        return { success: false, error: "Not found" };
      }
      const existing = typeStore.get(req.targetId) as Record<string, unknown>;
      const updated = { ...existing, ...req.payload, id: req.targetId };
      typeStore.set(req.targetId, updated);
      return { success: true, data: updated };
    }
    case "Delete": {
      if (!req.targetId) return { success: false, error: "Missing targetId" };
      const existed = typeStore.delete(req.targetId);
      return { success: existed, data: { deleted: existed } };
    }
    case "View": {
      if (!req.targetId) return { success: false, error: "Missing targetId" };
      const data = typeStore.get(req.targetId);
      return data
        ? { success: true, data }
        : { success: false, error: "Not found" };
    }
    default:
      return { success: false, error: `Unknown action ${req.action}` };
  }
}
