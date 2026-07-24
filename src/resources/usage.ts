import type { getUsageRoute } from '@getitdone/api-contracts'

import type { RouteResult } from '../core/contract-types'
import type { RequestOptions } from '../core/http'
import { ApiResource } from './resource'

export type Usage = RouteResult<typeof getUsageRoute>

export class UsageResource extends ApiResource {
    /** Current billing-period usage per meter, plan id and burst policy. */
    retrieve(options?: RequestOptions): Promise<Usage> {
        return this._core.request({
            method: 'GET',
            path: '/v1/usage',
            options,
        })
    }
}
