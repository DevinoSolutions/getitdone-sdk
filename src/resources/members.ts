import type { listMembersRoute } from '@getitdone/api-contracts'

import type {
    EnvelopeItem,
    RouteQuery,
    RouteResult,
} from '../core/contract-types'
import type { RequestOptions } from '../core/http'
import { requestPage, type PagePromise } from '../core/pagination'
import { ApiResource } from './resource'

export type Member = EnvelopeItem<RouteResult<typeof listMembersRoute>>
export type ListMembersQuery = RouteQuery<typeof listMembersRoute>

export class Members extends ApiResource {
    list(
        query?: ListMembersQuery,
        options?: RequestOptions,
    ): PagePromise<Member> {
        return requestPage(this._core, {
            method: 'GET',
            path: '/v1/members',
            query,
            options,
        })
    }
}
