/**
 * Pins the logging contract (open-api D9): the injected logger receives
 * request/response/retry events with metadata ONLY — credentials are
 * redacted before they reach any logger, and request/response bodies are
 * never logged at all.
 */
import { beforeAll, describe, expect, it } from 'vitest'

import type { SdkLogger } from '../src/core/logger'
import {
    createQueuedFetch,
    makeTestClient,
    problemReply,
} from './support/mock-fetch'

interface LoggedEvent {
    level: 'debug' | 'warn' | 'error'
    message: string
    data: Record<string, unknown> | undefined
}

function createCapturingLogger(): { logger: SdkLogger; events: LoggedEvent[] } {
    const events: LoggedEvent[] = []
    const logger: SdkLogger = {
        debug: (message, data) => {
            events.push({ level: 'debug', message, data })
        },
        warn: (message, data) => {
            events.push({ level: 'warn', message, data })
        },
        error: (message, data) => {
            events.push({ level: 'error', message, data })
        },
    }
    return { logger, events }
}

const SECRET_API_KEY = 'gid_test_unit_super_secret_credential'
const REQUEST_BODY_MARKER = 'request-body-marker-task-title'
const ERROR_BODY_MARKER = 'error-body-marker-detail-text'
const RESPONSE_BODY_MARKER = 'response-body-marker-created-title'

describe('logger events and secret redaction on a retried request', () => {
    const captured = createCapturingLogger()

    beforeAll(async () => {
        const harness = createQueuedFetch([
            problemReply(500, 'internal_error', {
                headers: { 'retry-after': '0' },
                detail: ERROR_BODY_MARKER,
            }),
            {
                status: 201,
                jsonBody: { id: 'T-20', title: RESPONSE_BODY_MARKER },
                headers: { 'x-request-id': 'req_logged_success' },
            },
        ])
        const client = makeTestClient(harness, {
            apiKey: SECRET_API_KEY,
            logger: captured.logger,
        })
        await client.tasks.create({ title: REQUEST_BODY_MARKER })
    })

    it('emits a debug request event per attempt, a debug response event carrying status and requestId, and a warn retry event', () => {
        const requestEvents = captured.events.filter(
            e =>
                e.level === 'debug' && e.message === 'nowgetitdone-sdk request',
        )
        expect(requestEvents.length).toBeGreaterThanOrEqual(2)

        const successResponse = captured.events.find(
            e =>
                e.level === 'debug' &&
                e.message === 'nowgetitdone-sdk response' &&
                e.data?.status === 201,
        )
        expect(successResponse).toBeDefined()
        expect(successResponse?.data?.requestId).toBe('req_logged_success')

        const retryEvent = captured.events.find(
            e =>
                e.level === 'warn' &&
                e.message === 'nowgetitdone-sdk retrying request',
        )
        expect(retryEvent).toBeDefined()
        expect(retryEvent?.data?.status).toBe(500)
    })

    it('never lets the API key reach the logger in any message or data, and presents the authorization header only as [REDACTED]', () => {
        const serialized = JSON.stringify(captured.events)
        expect(serialized).not.toContain(SECRET_API_KEY)

        const requestEvents = captured.events.filter(
            e => e.message === 'nowgetitdone-sdk request',
        )
        for (const event of requestEvents) {
            const headers = event.data?.headers as Record<string, string>
            expect(headers['authorization']).toBe('[REDACTED]')
        }
    })

    it('never logs the request body, the error response body, or the success response body text', () => {
        const serialized = JSON.stringify(captured.events)
        expect(serialized).not.toContain(REQUEST_BODY_MARKER)
        expect(serialized).not.toContain(ERROR_BODY_MARKER)
        expect(serialized).not.toContain(RESPONSE_BODY_MARKER)
    })
})

describe('redaction of a caller-supplied x-api-key header', () => {
    it('presents an x-api-key default header only as [REDACTED] in request events, even though /v1 itself is Bearer-only', async () => {
        const { logger, events } = createCapturingLogger()
        const harness = createQueuedFetch([
            { status: 200, jsonBody: { id: 'T-21', title: 'Fixture' } },
        ])
        const client = makeTestClient(harness, {
            apiKey: SECRET_API_KEY,
            defaultHeaders: { 'x-api-key': SECRET_API_KEY },
            logger,
        })
        await client.tasks.retrieve('T-21')

        const requestEvent = events.find(
            e => e.message === 'nowgetitdone-sdk request',
        )
        expect(requestEvent).toBeDefined()
        const headers = requestEvent?.data?.headers as Record<string, string>
        expect(headers['x-api-key']).toBe('[REDACTED]')
        expect(JSON.stringify(events)).not.toContain(SECRET_API_KEY)
    })
})
