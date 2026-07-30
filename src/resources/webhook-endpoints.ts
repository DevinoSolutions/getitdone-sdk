import type {
    createWebhookEndpointRoute,
    deleteWebhookEndpointRoute,
    getWebhookEndpointRoute,
    listWebhookEndpointDeliveriesRoute,
    listWebhookEndpointsRoute,
    replayFailedWebhookDeliveriesRoute,
    replayWebhookDeliveryRoute,
    rotateWebhookEndpointSecretRoute,
    testWebhookEndpointEventRoute,
    updateWebhookEndpointRoute,
    verifyWebhookEndpointRoute,
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

export type WebhookEndpoint = RouteResult<typeof getWebhookEndpointRoute>
export type ListWebhookEndpointsQuery = RouteQuery<
    typeof listWebhookEndpointsRoute
>
export type CreateWebhookEndpointBody = RouteBody<
    typeof createWebhookEndpointRoute
>
/** Includes the `whsec_` signing secret — shown ONCE, store it securely. */
export type CreatedWebhookEndpoint = RouteResult<
    typeof createWebhookEndpointRoute
>
export type UpdateWebhookEndpointBody = RouteBody<
    typeof updateWebhookEndpointRoute
>
export type RotatedWebhookEndpointSecret = RouteResult<
    typeof rotateWebhookEndpointSecretRoute
>
export type WebhookEndpointVerification = RouteResult<
    typeof verifyWebhookEndpointRoute
>
export type WebhookTestEventBody = RouteBody<
    typeof testWebhookEndpointEventRoute
>
export type WebhookTestEventResult = RouteResult<
    typeof testWebhookEndpointEventRoute
>
export type WebhookDelivery = EnvelopeItem<
    RouteResult<typeof listWebhookEndpointDeliveriesRoute>
>
export type ListWebhookDeliveriesQuery = RouteQuery<
    typeof listWebhookEndpointDeliveriesRoute
>
/** A single freshly-enqueued replay delivery (same shape as a log row). */
export type ReplayedWebhookDelivery = RouteResult<
    typeof replayWebhookDeliveryRoute
>
export type ReplayFailedWebhookDeliveriesBody = RouteBody<
    typeof replayFailedWebhookDeliveriesRoute
>
export type ReplayedWebhookDeliveries = RouteResult<
    typeof replayFailedWebhookDeliveriesRoute
>

/** Outbound webhooks are PRO+ (403 `feature_not_enabled` on FREE). */
export class WebhookEndpoints extends ApiResource {
    list(
        query?: ListWebhookEndpointsQuery,
        options?: RequestOptions,
    ): PagePromise<WebhookEndpoint> {
        return requestPage(this._core, {
            method: 'GET',
            path: '/v1/webhook-endpoints',
            query,
            options,
        })
    }

    retrieve(
        endpointId: string,
        options?: RequestOptions,
    ): Promise<WebhookEndpoint> {
        return this._core.request({
            method: 'GET',
            path: `/v1/webhook-endpoints/${encodeURIComponent(endpointId)}`,
            options,
        })
    }

    create(
        body: CreateWebhookEndpointBody,
        options?: RequestOptions,
    ): Promise<CreatedWebhookEndpoint> {
        return this._core.request({
            method: 'POST',
            path: '/v1/webhook-endpoints',
            body,
            idempotent: true,
            options,
        })
    }

    update(
        endpointId: string,
        body: UpdateWebhookEndpointBody,
        options?: RequestOptions,
    ): Promise<WebhookEndpoint> {
        return this._core.request({
            method: 'PATCH',
            path: `/v1/webhook-endpoints/${encodeURIComponent(endpointId)}`,
            body,
            options,
        })
    }

    delete(
        endpointId: string,
        options?: RequestOptions,
    ): Promise<RouteResult<typeof deleteWebhookEndpointRoute>> {
        return this._core.request({
            method: 'DELETE',
            path: `/v1/webhook-endpoints/${encodeURIComponent(endpointId)}`,
            options,
        })
    }

    /**
     * Rotate the signing secret. The previous secret keeps signing during
     * the grace window, so mid-rotation deliveries carry two signatures.
     */
    rotateSecret(
        endpointId: string,
        options?: RequestOptions,
    ): Promise<RotatedWebhookEndpointSecret> {
        return this._core.request({
            method: 'POST',
            path: `/v1/webhook-endpoints/${encodeURIComponent(endpointId)}/rotate-secret`,
            idempotent: true,
            options,
        })
    }

    /**
     * Live signed probe through the SSRF gauntlet — NOT idempotent-declared
     * and never retried by the SDK (each call is a fresh probe).
     */
    verify(
        endpointId: string,
        options?: RequestOptions,
    ): Promise<WebhookEndpointVerification> {
        return this._core.request({
            method: 'POST',
            path: `/v1/webhook-endpoints/${encodeURIComponent(endpointId)}/verify`,
            options,
        })
    }

    /** Send a signed test event (live probe — never retried by the SDK). */
    testEvent(
        endpointId: string,
        body: WebhookTestEventBody,
        options?: RequestOptions,
    ): Promise<WebhookTestEventResult> {
        return this._core.request({
            method: 'POST',
            path: `/v1/webhook-endpoints/${encodeURIComponent(endpointId)}/test-event`,
            body,
            options,
        })
    }

    listDeliveries(
        endpointId: string,
        query?: ListWebhookDeliveriesQuery,
        options?: RequestOptions,
    ): PagePromise<WebhookDelivery> {
        return requestPage(this._core, {
            method: 'GET',
            path: `/v1/webhook-endpoints/${encodeURIComponent(endpointId)}/deliveries`,
            query,
            options,
        })
    }

    /**
     * Replay ONE terminal (FAILED/SUCCEEDED/DISABLED) delivery — creates a
     * FRESH PENDING delivery for the same event. 409 `delivery_already_pending`
     * when one is already queued (which also makes a double-click safe), so
     * this is NOT declared idempotent and never carries an Idempotency-Key.
     */
    replayDelivery(
        endpointId: string,
        deliveryId: string,
        options?: RequestOptions,
    ): Promise<ReplayedWebhookDelivery> {
        return this._core.request({
            method: 'POST',
            path: `/v1/webhook-endpoints/${encodeURIComponent(endpointId)}/deliveries/${encodeURIComponent(deliveryId)}/replay`,
            options,
        })
    }

    /**
     * Bulk-replay every FAILED/DISABLED delivery on the endpoint created at or
     * after `since` (skips events already queued, capped at 1000/call).
     * Naturally near-idempotent for the same reason as `replayDelivery`, so it
     * carries no Idempotency-Key.
     */
    replayFailed(
        endpointId: string,
        body: ReplayFailedWebhookDeliveriesBody,
        options?: RequestOptions,
    ): Promise<ReplayedWebhookDeliveries> {
        return this._core.request({
            method: 'POST',
            path: `/v1/webhook-endpoints/${encodeURIComponent(endpointId)}/replay-failed`,
            body,
            options,
        })
    }
}
