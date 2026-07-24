/**
 * Pins the typed error hierarchy (open-api D3/D9): status → subclass
 * mapping, problem+json field surfacing, non-JSON fallback, and the
 * forward-compatible `code` typing.
 */
import { describe, expect, it } from 'vitest'

import {
    APIError,
    AuthenticationError,
    BadRequestError,
    ConflictError,
    InternalServerError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
    UnprocessableEntityError,
} from '../src/error'
import {
    createQueuedFetch,
    makeTestClient,
    problemReply,
} from './support/mock-fetch'

async function throwOn(reply: Parameters<typeof createQueuedFetch>[0][number]) {
    const harness = createQueuedFetch([reply])
    const client = makeTestClient(harness, { maxRetries: 0 })
    return client.tasks.retrieve('T-err').catch(e => e as unknown)
}

describe('status → error subclass mapping', () => {
    const statusCases = [
        { status: 400, code: 'validation_failed', ctor: BadRequestError },
        { status: 401, code: 'invalid_api_key', ctor: AuthenticationError },
        {
            status: 403,
            code: 'insufficient_scope',
            ctor: PermissionDeniedError,
        },
        { status: 404, code: 'resource_not_found', ctor: NotFoundError },
        { status: 409, code: 'idempotency_in_progress', ctor: ConflictError },
        {
            status: 422,
            code: 'idempotency_key_reused',
            ctor: UnprocessableEntityError,
        },
        { status: 429, code: 'rate_limited', ctor: RateLimitError },
        { status: 500, code: 'internal_error', ctor: InternalServerError },
    ] as const

    for (const { status, code, ctor } of statusCases) {
        it(`throws ${ctor.name} for an HTTP ${status} problem+json response and preserves the status field`, async () => {
            const error = await throwOn(problemReply(status, code))
            expect(error).toBeInstanceOf(ctor)
            expect((error as APIError).status).toBe(status)
            expect((error as APIError).code).toBe(code)
        })
    }

    it('throws the base APIError (no dedicated subclass) for an unmapped status like 418 carrying a problem body', async () => {
        const error = await throwOn(problemReply(418, 'internal_error'))
        expect(error).toBeInstanceOf(APIError)
        expect((error as APIError).constructor).toBe(APIError)
        expect((error as APIError).status).toBe(418)
    })
})

describe('problem+json field surfacing', () => {
    it('surfaces code, problemType URI, detail, requestId from x-request-id, and the fieldErrors array of a validation_failed response', async () => {
        const error = (await throwOn(
            problemReply(400, 'validation_failed', {
                detail: 'title must be between 1 and 500 characters',
                requestId: 'req_field_errors_1',
                errors: [
                    {
                        pointer: '/title',
                        code: 'too_small',
                        message: 'String must contain at least 1 character(s)',
                    },
                ],
            }),
        )) as BadRequestError
        expect(error).toBeInstanceOf(BadRequestError)
        expect(error.code).toBe('validation_failed')
        expect(error.problemType).toBe(
            'https://nowgetitdone.com/docs/api/problems/validation-failed',
        )
        expect(error.detail).toBe('title must be between 1 and 500 characters')
        expect(error.requestId).toBe('req_field_errors_1')
        expect(error.fieldErrors).toEqual([
            {
                pointer: '/title',
                code: 'too_small',
                message: 'String must contain at least 1 character(s)',
            },
        ])
    })

    it('falls back to a null problem with the raw body preserved and the status in the message when a 502 answers plain text instead of JSON', async () => {
        const error = (await throwOn({
            status: 502,
            textBody: 'Bad Gateway',
            headers: { 'x-request-id': 'req_gateway_text' },
        })) as APIError
        expect(error).toBeInstanceOf(APIError)
        expect(error.problem).toBeNull()
        expect(error.rawBody).toBe('Bad Gateway')
        expect(error.message).toContain('502')
        expect(error.requestId).toBe('req_gateway_text')
    })

    it('still lands a future unknown problem code string in error.code (forward-compatible ProblemCode | string typing)', async () => {
        const error = (await throwOn(
            problemReply(400, 'brand_new_code'),
        )) as APIError
        expect(error.code).toBe('brand_new_code')
    })

    it('builds error.message from the code, the detail (or title), and the request_id', async () => {
        const error = (await throwOn(
            problemReply(403, 'feature_not_enabled', {
                detail: 'Outbound webhooks require the PRO plan',
                requestId: 'req_message_parts',
            }),
        )) as APIError
        expect(error.message).toContain('feature_not_enabled')
        expect(error.message).toContain(
            'Outbound webhooks require the PRO plan',
        )
        expect(error.message).toContain('request_id: req_message_parts')
    })
})
