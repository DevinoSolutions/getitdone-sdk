import type {
    createProjectRoute,
    getProjectRoute,
    listProjectsRoute,
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

export type Project = RouteResult<typeof getProjectRoute>
export type ListProjectsQuery = RouteQuery<typeof listProjectsRoute>
export type CreateProjectBody = RouteBody<typeof createProjectRoute>

export class Projects extends ApiResource {
    list(
        query?: ListProjectsQuery,
        options?: RequestOptions,
    ): PagePromise<EnvelopeItem<RouteResult<typeof listProjectsRoute>>> {
        return requestPage(this._core, {
            method: 'GET',
            path: '/v1/projects',
            query,
            options,
        })
    }

    retrieve(projectId: string, options?: RequestOptions): Promise<Project> {
        return this._core.request({
            method: 'GET',
            path: `/v1/projects/${encodeURIComponent(projectId)}`,
            options,
        })
    }

    create(
        body: CreateProjectBody,
        options?: RequestOptions,
    ): Promise<RouteResult<typeof createProjectRoute>> {
        return this._core.request({
            method: 'POST',
            path: '/v1/projects',
            body,
            idempotent: true,
            options,
        })
    }
}
