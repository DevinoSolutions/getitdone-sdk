import type {
    getOrganizationRoute,
    listOrganizationsRoute,
} from '@getitdone/api-contracts'

import type { EnvelopeItem, RouteResult } from '../core/contract-types'
import type { RequestOptions } from '../core/http'
import { requestPage, type PagePromise } from '../core/pagination'
import { ApiResource } from './resource'

export type Organization = EnvelopeItem<
    RouteResult<typeof listOrganizationsRoute>
>

export class Organizations extends ApiResource {
    /** The organization(s) visible to this credential (always exactly one). */
    list(options?: RequestOptions): PagePromise<Organization> {
        return requestPage(this._core, {
            method: 'GET',
            path: '/v1/organizations',
            options,
        })
    }

    retrieve(
        organizationId: string,
        options?: RequestOptions,
    ): Promise<RouteResult<typeof getOrganizationRoute>> {
        return this._core.request({
            method: 'GET',
            path: `/v1/organizations/${encodeURIComponent(organizationId)}`,
            options,
        })
    }
}
