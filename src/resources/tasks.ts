import type {
    createTaskRoute,
    getTaskRoute,
    listTaskHistoryRoute,
    listTasksRoute,
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
}
