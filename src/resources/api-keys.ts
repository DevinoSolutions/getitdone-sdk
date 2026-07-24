import type {
    createApiKeyRoute,
    deleteApiKeyRoute,
    listApiKeysRoute,
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

export type ApiKey = EnvelopeItem<RouteResult<typeof listApiKeysRoute>>
export type ListApiKeysQuery = RouteQuery<typeof listApiKeysRoute>
export type CreateApiKeyBody = RouteBody<typeof createApiKeyRoute>
/** Includes the plaintext key — shown ONCE at creation, store it securely. */
export type CreatedApiKey = RouteResult<typeof createApiKeyRoute>
export type RevokedApiKey = RouteResult<typeof deleteApiKeyRoute>

export class ApiKeys extends ApiResource {
    list(
        query?: ListApiKeysQuery,
        options?: RequestOptions,
    ): PagePromise<ApiKey> {
        return requestPage(this._core, {
            method: 'GET',
            path: '/v1/api-keys',
            query,
            options,
        })
    }

    create(
        body: CreateApiKeyBody,
        options?: RequestOptions,
    ): Promise<CreatedApiKey> {
        return this._core.request({
            method: 'POST',
            path: '/v1/api-keys',
            body,
            idempotent: true,
            options,
        })
    }

    /** Revoke a key. Requires the `api-keys:manage` scope. */
    delete(keyId: string, options?: RequestOptions): Promise<RevokedApiKey> {
        return this._core.request({
            method: 'DELETE',
            path: `/v1/api-keys/${encodeURIComponent(keyId)}`,
            options,
        })
    }
}
