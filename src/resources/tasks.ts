import type {
    addTaskDependencyRoute,
    createTaskRoute,
    getTaskRoute,
    listTaskDependenciesRoute,
    listTaskHistoryRoute,
    listTaskOccurrencesRoute,
    listTasksRoute,
    setTaskOccurrenceStatusRoute,
    updateTaskRoute,
} from '@getitdone/api-contracts'

import type {
    EnvelopeItem,
    RouteBody,
    RouteQuery,
    RouteResult,
} from '../core/contract-types'
import type { RequestOptions } from '../core/http'
import { requestPage, type PagePromise } from '../core/pagination'
import { ApiResource } from './resource'

export type Task = RouteResult<typeof getTaskRoute>
export type ListTasksQuery = RouteQuery<typeof listTasksRoute>
export type CreateTaskBody = RouteBody<typeof createTaskRoute>
export type UpdateTaskBody = RouteBody<typeof updateTaskRoute>
export type TaskHistoryEntry = EnvelopeItem<
    RouteResult<typeof listTaskHistoryRoute>
>
export type ListTaskHistoryQuery = RouteQuery<typeof listTaskHistoryRoute>

/** A task's repeat schedule — null on a task that does not repeat. */
export type TaskRecurrence = NonNullable<Task['recurrence']>
/** ONE day of a repeating task, with its own completion state. */
export type TaskOccurrence = RouteResult<typeof setTaskOccurrenceStatusRoute>
export type ListTaskOccurrencesQuery = RouteQuery<
    typeof listTaskOccurrencesRoute
>
export type SetTaskOccurrenceStatusBody = RouteBody<
    typeof setTaskOccurrenceStatusRoute
>

/** Both directions of a task's blocker graph, one hop out. */
export type TaskDependencies = RouteResult<typeof listTaskDependenciesRoute>
/** One task on the other end of a dependency link. */
export type TaskDependencyRef = TaskDependencies['blocked_by'][number]
export type AddTaskDependencyBody = RouteBody<typeof addTaskDependencyRoute>

/** Task ids are the public short ids, e.g. `T-42`. */
export class Tasks extends ApiResource {
    list(query?: ListTasksQuery, options?: RequestOptions): PagePromise<Task> {
        return requestPage(this._core, {
            method: 'GET',
            path: '/v1/tasks',
            query,
            options,
        })
    }

    retrieve(taskId: string, options?: RequestOptions): Promise<Task> {
        return this._core.request({
            method: 'GET',
            path: `/v1/tasks/${encodeURIComponent(taskId)}`,
            options,
        })
    }

    create(body: CreateTaskBody, options?: RequestOptions): Promise<Task> {
        return this._core.request({
            method: 'POST',
            path: '/v1/tasks',
            body,
            idempotent: true,
            options,
        })
    }

    update(
        taskId: string,
        body: UpdateTaskBody,
        options?: RequestOptions,
    ): Promise<Task> {
        return this._core.request({
            method: 'PATCH',
            path: `/v1/tasks/${encodeURIComponent(taskId)}`,
            body,
            options,
        })
    }

    archive(taskId: string, options?: RequestOptions): Promise<Task> {
        return this._core.request({
            method: 'POST',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/archive`,
            idempotent: true,
            options,
        })
    }

    unarchive(taskId: string, options?: RequestOptions): Promise<Task> {
        return this._core.request({
            method: 'POST',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/unarchive`,
            idempotent: true,
            options,
        })
    }

    /** Version history, newest first. */
    listHistory(
        taskId: string,
        query?: ListTaskHistoryQuery,
        options?: RequestOptions,
    ): PagePromise<TaskHistoryEntry> {
        return requestPage(this._core, {
            method: 'GET',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/history`,
            query,
            options,
        })
    }

    /**
     * The per-day ledger of a repeating task, most recent day first. A task
     * that does not repeat pages empty rather than 404ing.
     */
    listOccurrences(
        taskId: string,
        query?: ListTaskOccurrencesQuery,
        options?: RequestOptions,
    ): PagePromise<TaskOccurrence> {
        return requestPage(this._core, {
            method: 'GET',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/occurrences`,
            query,
            options,
        })
    }

    /**
     * Complete or skip ONE day, addressed by its calendar day (`YYYY-MM-DD`).
     * The day may be in the past or a scheduled future day finished early —
     * neither touches any other day or the task's own status. Re-sending the
     * state a day is already in succeeds unchanged, so retries are safe.
     */
    setOccurrenceStatus(
        taskId: string,
        occurrenceDate: string,
        body: SetTaskOccurrenceStatusBody,
        options?: RequestOptions,
    ): Promise<TaskOccurrence> {
        return this._core.request({
            method: 'PATCH',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/occurrences/${encodeURIComponent(occurrenceDate)}`,
            body,
            options,
        })
    }

    /** `setOccurrenceStatus(taskId, day, { status: 'COMPLETED' })`. */
    completeOccurrence(
        taskId: string,
        occurrenceDate: string,
        options?: RequestOptions,
    ): Promise<TaskOccurrence> {
        return this.setOccurrenceStatus(
            taskId,
            occurrenceDate,
            { status: 'COMPLETED' },
            options,
        )
    }

    /** `setOccurrenceStatus(taskId, day, { status: 'SKIPPED' })`. */
    skipOccurrence(
        taskId: string,
        occurrenceDate: string,
        options?: RequestOptions,
    ): Promise<TaskOccurrence> {
        return this.setOccurrenceStatus(
            taskId,
            occurrenceDate,
            { status: 'SKIPPED' },
            options,
        )
    }

    /**
     * What this task is blocked by and what it blocks, plus the derived
     * `is_blocked`. Not paginated — it answers the task's immediate
     * neighbours; walk the chain by following each `task_id`. A task with no
     * links answers an empty view rather than throwing `NotFoundError`.
     */
    listDependencies(
        taskId: string,
        options?: RequestOptions,
    ): Promise<TaskDependencies> {
        return this._core.request({
            method: 'GET',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/dependencies`,
            options,
        })
    }

    /**
     * Record that this task is blocked by another one. Recording a link that
     * already exists succeeds unchanged. A link that would close a loop throws
     * `ConflictError` with code `dependency_cycle` — the graph you read is
     * always acyclic. Answers the task's dependencies after the link.
     */
    addDependency(
        taskId: string,
        body: AddTaskDependencyBody,
        options?: RequestOptions,
    ): Promise<TaskDependencies> {
        return this._core.request({
            method: 'POST',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/dependencies`,
            body,
            idempotent: true,
            options,
        })
    }

    /**
     * Remove one blocked-by link, addressed by both task ids — no edge id is
     * ever minted. Removing a link that is not there succeeds unchanged.
     */
    removeDependency(
        taskId: string,
        blockerTaskId: string,
        options?: RequestOptions,
    ): Promise<TaskDependencies> {
        return this._core.request({
            method: 'DELETE',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/dependencies/${encodeURIComponent(blockerTaskId)}`,
            options,
        })
    }
}
