# @nowgetitdone/sdk

## 0.2.0

### Minor Changes

- fb714a5: Task dependencies (blockers). Three new task methods reach the blocker graph:
  `tasks.listDependencies(taskId)` answers both directions one hop out
  (`blocked_by`, `blocking`) plus the derived `is_blocked`,
  `tasks.addDependency(taskId, { blocker_task_id })` records a link, and
  `tasks.removeDependency(taskId, blockerTaskId)` removes one — each answering
  the task's full dependency view, and each safe to retry. A link that would
  close a loop throws `ConflictError` with the new `dependency_cycle` code. That
  409 is now excluded from the retry policy: only `idempotency_in_progress` is
  retried, so a permanent conflict no longer costs three calls of your burst
  allowance. New exported types: `TaskDependencies`, `TaskDependencyRef`,
  `AddTaskDependencyBody`.
- 42489cd: Tasks now carry a `start_date` (defer-until). `Task` and `TaskHistoryEntry`
  gain a nullable `start_date`, and `CreateTaskBody` / `UpdateTaskBody` accept an
  optional `start_date` as `YYYY-MM-DD` (interpreted as UTC). Like `due_date`, it
  cannot be cleared through an update — an omitted field keeps its current value.
- bb12183: Recurring tasks. `Task` gains a nullable `recurrence` (the repeat rule plus its
  derived `rrule` projection), and two new task methods reach the per-day
  occurrence ledger: `tasks.listOccurrences(taskId, query)` pages the days a task
  is due (filterable by `status`, `starting_on` and `ending_on`), and
  `tasks.setOccurrenceStatus(taskId, 'YYYY-MM-DD', { status })` — with
  `completeOccurrence` / `skipOccurrence` shorthands — closes ONE day. The day may
  be in the past or a scheduled future day finished early; neither touches any
  other day or the task's own status. New exported types: `TaskRecurrence`,
  `TaskOccurrence`, `ListTaskOccurrencesQuery`, `SetTaskOccurrenceStatusBody`.

### Patch Changes

- b8fa274: Deprecate `authStyle`: the /v1 API is Bearer-only, so `authStyle: 'x-api-key'`
  could never authenticate — it answered `401 missing_credentials` before the key
  was read (DevinoSolutions/getitdone-sdk#1). Every request now sends
  `Authorization: Bearer …`; passing `'x-api-key'` logs a deprecation warning and
  is ignored, turning a guaranteed failure into a working call. The option is
  removed in 0.2.0.

## 0.1.0

### Minor Changes

- 91c9ed2: Initial release of the official GetItDone TypeScript SDK: typed clients for
  every /v1 operation (organizations, members, projects, tasks, daily plan,
  attachments, API keys, webhook endpoints, usage), RFC 9457 problem+json error
  hierarchy with stable `code` branching, rate-limit-aware retries honoring
  `Retry-After`, automatic Idempotency-Key generation on consequential POSTs,
  cursor auto-pagination, and Standard Webhooks signature verification via
  `@nowgetitdone/sdk/webhooks`.
