import type { ActionRequest, AtomMeta } from '../core.js';

export const ScheduleActionMeta: AtomMeta = {
  id: 82,
  symbol: 'Sc',
  name: 'Schedule',
  family: 'actions',
  description: 'Plan for future execution.',
};

export const RunMeta: AtomMeta = {
  id: 83,
  symbol: 'Rn',
  name: 'Run',
  family: 'actions',
  description: 'Execute immediately.',
};

export const StopMeta: AtomMeta = {
  id: 84,
  symbol: 'Sp',
  name: 'Stop',
  family: 'actions',
  description: 'Halt execution.',
};

export const CancelMeta: AtomMeta = {
  id: 85,
  symbol: 'Cc',
  name: 'Cancel',
  family: 'actions',
  description: 'Abort a planned or running action.',
};

export const RemindMeta: AtomMeta = {
  id: 74,
  symbol: 'Rm',
  name: 'Remind',
  family: 'actions',
  description: 'Schedule a reminder.',
};

/**
 * Lifecycle states for a job.
 *
 * `scheduled` is the only state a `Run` or `Cancel` accepts, and `cancelled` is
 * terminal: a cancelled job that later runs is the bug these guards exist to
 * catch. `stopped` is separate from `cancelled` because stopping is an
 * interruption of work already under way, while cancelling means it never was
 * meant to proceed.
 */
export type JobState = 'scheduled' | 'running' | 'completed' | 'stopped' | 'cancelled';

export interface ScheduledJob {
  id: string;
  action: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  /** ISO-8601 instant the job becomes eligible to run. */
  runAt: string;
  state: JobState;
  actorId?: string;
}

export function scheduleAction(
  runAt: string,
  action: string,
  target?: { type?: string; id?: string; payload?: Record<string, unknown> },
  actorId?: string,
): ActionRequest {
  if (Number.isNaN(Date.parse(runAt))) {
    throw new Error(`runAt is not a parseable instant: ${runAt}`);
  }
  return {
    action: 'Schedule',
    targetType: target?.type,
    targetId: target?.id,
    payload: { scheduledAction: action, runAt, targetPayload: target?.payload },
    actorId,
  };
}

export function runAction(targetType: string, targetId: string, action: string, actorId?: string): ActionRequest {
  return {
    action: 'Run',
    targetType,
    targetId,
    payload: { runningAction: action, startedAt: new Date().toISOString() },
    actorId,
  };
}

export function stopAction(targetType: string, targetId: string, reason?: string, actorId?: string): ActionRequest {
  return {
    action: 'Stop',
    targetType,
    targetId,
    payload: { reason, stoppedAt: new Date().toISOString() },
    actorId,
  };
}

export function cancelAction(targetType: string, targetId: string, reason?: string, actorId?: string): ActionRequest {
  return {
    action: 'Cancel',
    targetType,
    targetId,
    payload: { reason, cancelledAt: new Date().toISOString() },
    actorId,
  };
}

export function remindAction(
  targetType: string,
  targetId: string,
  remindAt: string,
  message: string,
  actorId?: string,
): ActionRequest {
  if (Number.isNaN(Date.parse(remindAt))) {
    throw new Error(`remindAt is not a parseable instant: ${remindAt}`);
  }
  return {
    action: 'Remind',
    targetType,
    targetId,
    payload: { remindAt, message },
    actorId,
  };
}

export function createJob(opts: {
  id: string;
  action: string;
  runAt: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  actorId?: string;
}): ScheduledJob {
  if (Number.isNaN(Date.parse(opts.runAt))) {
    throw new Error(`runAt is not a parseable instant: ${opts.runAt}`);
  }
  return {
    id: opts.id,
    action: opts.action,
    targetType: opts.targetType,
    targetId: opts.targetId,
    payload: opts.payload,
    runAt: opts.runAt,
    state: 'scheduled',
    actorId: opts.actorId,
  };
}

/** Jobs eligible to run at `now`, oldest first so a backlog drains in order. */
export function dueJobs(jobs: ScheduledJob[], now: string): ScheduledJob[] {
  const at = Date.parse(now);
  return jobs
    .filter((job) => job.state === 'scheduled' && Date.parse(job.runAt) <= at)
    .sort((a, b) => Date.parse(a.runAt) - Date.parse(b.runAt));
}

/**
 * Advance a job to `running`.
 *
 * Only a scheduled job can start, so a job that is already running, completed,
 * stopped or cancelled is refused. Refusing rather than reassigning is what
 * stops two workers from picking up the same job after a retry.
 */
export function startJob(job: ScheduledJob): { ok: true; job: ScheduledJob } | { ok: false; reason: string } {
  if (job.state !== 'scheduled') {
    return { ok: false, reason: `job is ${job.state}, not scheduled` };
  }
  return { ok: true, job: { ...job, state: 'running' } };
}

/** Halt a running job. A scheduled job cannot be stopped because it is not running. */
export function stopJob(job: ScheduledJob): { ok: true; job: ScheduledJob } | { ok: false; reason: string } {
  if (job.state !== 'running') {
    return { ok: false, reason: `job is ${job.state}, not running` };
  }
  return { ok: true, job: { ...job, state: 'stopped' } };
}

/**
 * Abort a job that has not finished.
 *
 * Both a scheduled and a running job may be cancelled; a job that has already
 * reached a terminal state may not, because there is nothing left to abort.
 */
export function cancelJob(job: ScheduledJob): { ok: true; job: ScheduledJob } | { ok: false; reason: string } {
  if (job.state === 'completed' || job.state === 'cancelled') {
    return { ok: false, reason: `job is already ${job.state}` };
  }
  return { ok: true, job: { ...job, state: 'cancelled' } };
}
