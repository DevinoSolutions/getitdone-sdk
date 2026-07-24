/**
 * Pins the `@getitdone/sdk/webhooks` verification helper against the REAL
 * signer: `signWebhookPayload` from `@getitdone/api-contracts` is the exact
 * code the GetItDone delivery worker signs with, so a round-trip here proves
 * customer-side verification accepts genuine deliveries.
 */
import { describe, expect, it } from 'vitest'

import {
    verifyWebhookSignature as contractVerifyWebhookSignature,
    signWebhookPayload,
} from '@getitdone/api-contracts/webhooks/signing'

import { verifyWebhook, verifyWebhookSignature } from '../src/webhooks'

const SECRET = `whsec_${Buffer.from('sdk-webhook-unit-test-secret-32-bytes!').toString('base64url')}`
const ROTATED_SECRET = `whsec_${Buffer.from('sdk-webhook-rotated-secret-32-bytes!!').toString('base64url')}`

const RAW_BODY = JSON.stringify({
    id: 'evt_unit_1',
    type: 'task.created',
    data: { id: 'T-1', title: 'Signed task' },
})

function signedHeaders(overrides?: {
    timestampSeconds?: number
    secrets?: readonly string[]
    rawBody?: string
}): Record<string, string> {
    // Spread into a plain record: the signer returns the
    // `WebhookSignatureHeaders` interface, which has no index signature and
    // therefore is not directly assignable to `VerifyWebhookInput['headers']`
    // (reported as a DX wart — see the suite's final report).
    return {
        ...signWebhookPayload({
            id: 'msg_unit_round_trip',
            timestampSeconds:
                overrides?.timestampSeconds ?? Math.floor(Date.now() / 1000),
            rawBody: overrides?.rawBody ?? RAW_BODY,
            secrets: overrides?.secrets ?? [SECRET],
        }),
    }
}

describe('sign → verify round trip across header container shapes', () => {
    it('verifies a genuine signed payload as valid when the headers arrive as a Fetch Headers instance', () => {
        const headers = signedHeaders()
        expect(
            verifyWebhook({
                headers: new Headers(headers),
                rawBody: RAW_BODY,
                secret: SECRET,
            }),
        ).toEqual({ valid: true })
    })

    it('verifies a genuine signed payload as valid when the headers arrive as a plain lower-case record', () => {
        const headers = signedHeaders()
        expect(
            verifyWebhook({ headers, rawBody: RAW_BODY, secret: SECRET }),
        ).toEqual({ valid: true })
    })

    it('verifies a genuine signed payload as valid when the headers arrive as a node-style record with string[] values', () => {
        const headers = signedHeaders()
        const nodeStyleHeaders: Record<string, string[]> = {
            'webhook-id': [headers['webhook-id']],
            'webhook-timestamp': [headers['webhook-timestamp']],
            'webhook-signature': [headers['webhook-signature']],
        }
        expect(
            verifyWebhook({
                headers: nodeStyleHeaders,
                rawBody: RAW_BODY,
                secret: SECRET,
            }),
        ).toEqual({ valid: true })
    })
})

describe('rejection paths', () => {
    it('rejects a tampered raw body with signature_mismatch', () => {
        const headers = signedHeaders()
        expect(
            verifyWebhook({
                headers,
                rawBody: RAW_BODY.replace('Signed task', 'Tampered task'),
                secret: SECRET,
            }),
        ).toEqual({ valid: false, reason: 'signature_mismatch' })
    })

    it('rejects a timestamp ten minutes old with timestamp_out_of_tolerance under the default five-minute tolerance', () => {
        const headers = signedHeaders({
            timestampSeconds: Math.floor(Date.now() / 1000) - 600,
        })
        expect(
            verifyWebhook({ headers, rawBody: RAW_BODY, secret: SECRET }),
        ).toEqual({ valid: false, reason: 'timestamp_out_of_tolerance' })
    })

    it('rejects a request missing the webhook-id header with malformed_signature_header', () => {
        const headers = signedHeaders()
        const withoutId: Record<string, string> = {
            'webhook-timestamp': headers['webhook-timestamp'],
            'webhook-signature': headers['webhook-signature'],
        }
        expect(
            verifyWebhook({
                headers: withoutId,
                rawBody: RAW_BODY,
                secret: SECRET,
            }),
        ).toEqual({ valid: false, reason: 'malformed_signature_header' })
    })
})

describe('secret rotation', () => {
    it('verifies a delivery signed with two rotation-window secrets using either secret alone', () => {
        const headers = signedHeaders({ secrets: [SECRET, ROTATED_SECRET] })
        expect(
            verifyWebhook({ headers, rawBody: RAW_BODY, secret: SECRET }),
        ).toEqual({ valid: true })
        expect(
            verifyWebhook({
                headers,
                rawBody: RAW_BODY,
                secret: ROTATED_SECRET,
            }),
        ).toEqual({ valid: true })
    })
})

describe('re-export identity', () => {
    it('re-exports verifyWebhookSignature from the SDK webhooks entry as the SAME function object as the api-contracts implementation', () => {
        expect(verifyWebhookSignature).toBe(contractVerifyWebhookSignature)
    })
})
