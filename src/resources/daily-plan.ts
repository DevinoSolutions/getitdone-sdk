import type {
    createDailyPlanEntryRoute,
    deleteDailyPlanEntryRoute,
    getDailyPlanRoute,
    moveDailyPlanEntryRoute,
    setDailyPlanStatusRoute,
} from '@getitdone/api-contracts'

import type { RouteBody, RouteQuery, RouteResult } from '../core/contract-types'
import type { RequestOptions } from '../core/http'
import { ApiResource } from './resource'

export type DailyPlan = RouteResult<typeof getDailyPlanRoute>
export type GetDailyPlanQuery = RouteQuery<typeof getDailyPlanRoute>
export type SetDailyPlanStatusBody = RouteBody<typeof setDailyPlanStatusRoute>
export type SetDailyPlanStatusQuery = RouteQuery<typeof setDailyPlanStatusRoute>
export type CreateDailyPlanEntryBody = RouteBody<
    typeof createDailyPlanEntryRoute
>
export type MoveDailyPlanEntryBody = RouteBody<typeof moveDailyPlanEntryRoute>

export class DailyPlanResource extends ApiResource {
    /** The daily board for a date (defaults to today, UTC). */
    retrieve(
        query?: GetDailyPlanQuery,
        options?: RequestOptions,
    ): Promise<DailyPlan> {
        return this._core.request({
            method: 'GET',
            path: '/v1/daily-plan',
            query,
            options,
        })
    }

    setStatus(
        body: SetDailyPlanStatusBody,
        query?: SetDailyPlanStatusQuery,
        options?: RequestOptions,
    ): Promise<RouteResult<typeof setDailyPlanStatusRoute>> {
        return this._core.request({
            method: 'PATCH',
            path: '/v1/daily-plan',
            query,
            body,
            options,
        })
    }

    createEntry(
        body: CreateDailyPlanEntryBody,
        options?: RequestOptions,
    ): Promise<RouteResult<typeof createDailyPlanEntryRoute>> {
        return this._core.request({
            method: 'POST',
            path: '/v1/daily-plan/entries',
            body,
            idempotent: true,
            options,
        })
    }

    /**
     * Move an entry to another section. NOTE: the server recreates the entry,
     * so the returned entry has a NEW id (documented Phase 2 behavior).
     */
    moveEntry(
        entryId: string,
        body: MoveDailyPlanEntryBody,
        options?: RequestOptions,
    ): Promise<RouteResult<typeof moveDailyPlanEntryRoute>> {
        return this._core.request({
            method: 'PATCH',
            path: `/v1/daily-plan/entries/${encodeURIComponent(entryId)}`,
            body,
            options,
        })
    }

    deleteEntry(
        entryId: string,
        options?: RequestOptions,
    ): Promise<RouteResult<typeof deleteDailyPlanEntryRoute>> {
        return this._core.request({
            method: 'DELETE',
            path: `/v1/daily-plan/entries/${encodeURIComponent(entryId)}`,
            options,
        })
    }
}
