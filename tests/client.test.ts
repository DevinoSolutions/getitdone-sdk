/**
 * Pins the GetItDone client constructor contract (open-api D9): key
 * sourcing, browser guard, base-URL normalization, the Bearer-only auth
 * header (plus the deprecated `x-api-key` style's warn-and-ignore behavior),
 * user-agent versioning, default-header merging, the raw-request escape
 * hatch, and query serialization.
 */
import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import {
    GetItDone,
    X_API_KEY_AUTH_STYLE_DEPRECATION_MESSAGE,
} from '../src/client'
import { GetItDoneError } from '../src/error'
import { VERSION } from '../src/version'
import {
    createQueuedFetch,
    makeTestClient,
    TEST_API_KEY,
    TEST_BASE_URL,
} from './support/mock-fetch'

const taskReply = {
    status: 200,
    jsonBody: { id: 'T-1', title: 'Fixture task' },
    headers: { 'x-request-id': 'req_client_test' },
}

describe('API key sourcing', () => {
    it('throws a GetItDoneError naming GETITDONE_API_KEY when constructed without an apiKey option and without the environment variable', () => {
        const saved = process.env.GETITDONE_API_KEY
        delete process.env.GETITDONE_API_KEY
        try {
            const { fetchFn } = createQueuedFetch([])
            expect(() => new GetItDone({ fetch: fetchFn })).toThrowError(
                GetItDoneError,
            )
            expect(() => new GetItDone({ fetch: fetchFn })).toThrowError(
                /GETITDONE_API_KEY/,
            )
        } finally {
            if (saved !== undefined) process.env.GETITDONE_API_KEY = saved
        }
    })

    it('falls back to the GETITDONE_API_KEY environment variable and sends that key as the Bearer credential', async () => {
        const saved = process.env.GETITDONE_API_KEY
        process.env.GETITDONE_API_KEY = 'gid_test_env_fallback'
        try {
            const harness = createQueuedFetch([taskReply])
            const client = new GetItDone({
                baseUrl: TEST_BASE_URL,
                fetch: harness.fetchFn,
            })
            await client.tasks.retrieve('T-1')
            expect(harness.calls[0]?.headers['authorization']).toBe(
                'Bearer gid_test_env_fallback',
            )
        } finally {
            if (saved === undefined) delete process.env.GETITDONE_API_KEY
            else process.env.GETITDONE_API_KEY = saved
        }
    })
})

describe('base URL normalization', () => {
    it('trims trailing slashes from baseUrl so the request URL contains a single slash before the path', async () => {
        const harness = createQueuedFetch([taskReply])
        const client = new GetItDone({
            apiKey: TEST_API_KEY,
            baseUrl: `${TEST_BASE_URL}///`,
            fetch: harness.fetchFn,
        })
        expect(client.baseUrl).toBe(TEST_BASE_URL)
        await client.tasks.retrieve('T-1')
        expect(harness.calls[0]?.url).toBe(`${TEST_BASE_URL}/v1/tasks/T-1`)
    })
})

describe('auth header scheme', () => {
    it('sends authorization: Bearer <key> and no x-api-key header, the only scheme /v1 accepts', async () => {
        const harness = createQueuedFetch([taskReply])
        const client = makeTestClient(harness)
        await client.tasks.retrieve('T-1')
        expect(harness.calls[0]?.headers['authorization']).toBe(
            `Bearer ${TEST_API_KEY}`,
        )
        expect(harness.calls[0]?.headers).not.toHaveProperty('x-api-key')
    })

    it("still sends Bearer and never an x-api-key header when the deprecated authStyle 'x-api-key' is passed, because /v1 answers 401 missing_credentials to that header", async () => {
        const harness = createQueuedFetch([taskReply])
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
            const client = makeTestClient(harness, { authStyle: 'x-api-key' })
            await client.tasks.retrieve('T-1')
        } finally {
            warn.mockRestore()
        }
        expect(harness.calls[0]?.headers['authorization']).toBe(
            `Bearer ${TEST_API_KEY}`,
        )
        expect(harness.calls[0]?.headers).not.toHaveProperty('x-api-key')
    })

    it("warns at construction that authStyle 'x-api-key' is deprecated and ignored, and stays silent under the default scheme", () => {
        const { fetchFn } = createQueuedFetch([])
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
            new GetItDone({
                apiKey: TEST_API_KEY,
                baseUrl: TEST_BASE_URL,
                fetch: fetchFn,
                authStyle: 'x-api-key',
            })
            expect(warn).toHaveBeenCalledTimes(1)
            expect(warn).toHaveBeenCalledWith(
                X_API_KEY_AUTH_STYLE_DEPRECATION_MESSAGE,
            )
            warn.mockClear()

            new GetItDone({
                apiKey: TEST_API_KEY,
                baseUrl: TEST_BASE_URL,
                fetch: fetchFn,
                authStyle: 'authorization',
            })
            new GetItDone({
                apiKey: TEST_API_KEY,
                baseUrl: TEST_BASE_URL,
                fetch: fetchFn,
            })
            expect(warn).not.toHaveBeenCalled()
        } finally {
            warn.mockRestore()
        }
    })
})

describe('user-agent versioning', () => {
    it('sends user-agent nowgetitdone-sdk/<VERSION> where VERSION equals the version field of package.json', async () => {
        const packageJson = JSON.parse(
            readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
        ) as { version: string }
        expect(VERSION).toBe(packageJson.version)

        const harness = createQueuedFetch([taskReply])
        const client = makeTestClient(harness)
        await client.tasks.retrieve('T-1')
        expect(harness.calls[0]?.headers['user-agent']).toBe(
            `nowgetitdone-sdk/${VERSION}`,
        )
    })
})

describe('default and per-request header merging', () => {
    it('merges defaultHeaders into every request but refuses to let them override the authorization header', async () => {
        const harness = createQueuedFetch([taskReply])
        const client = makeTestClient(harness, {
            defaultHeaders: {
                'x-integration': 'sdk-unit-suite',
                authorization: 'Bearer attacker-supplied-default',
            },
        })
        await client.tasks.retrieve('T-1')
        expect(harness.calls[0]?.headers['x-integration']).toBe(
            'sdk-unit-suite',
        )
        expect(harness.calls[0]?.headers['authorization']).toBe(
            `Bearer ${TEST_API_KEY}`,
        )
    })

    it('refuses to let per-request options.headers override the authorization header either', async () => {
        const harness = createQueuedFetch([taskReply])
        const client = makeTestClient(harness)
        await client.tasks.retrieve('T-1', {
            headers: {
                authorization: 'Bearer attacker-supplied-per-request',
                'x-per-request': 'still-merged',
            },
        })
        expect(harness.calls[0]?.headers['x-per-request']).toBe('still-merged')
        expect(harness.calls[0]?.headers['authorization']).toBe(
            `Bearer ${TEST_API_KEY}`,
        )
    })
})

describe('browser environment guard', () => {
    it('throws at construction in a browser-like environment unless dangerouslyAllowBrowser is true', () => {
        const globals = globalThis as { window?: unknown; document?: unknown }
        globals.window = {}
        globals.document = {}
        try {
            const { fetchFn } = createQueuedFetch([])
            expect(
                () => new GetItDone({ apiKey: TEST_API_KEY, fetch: fetchFn }),
            ).toThrowError(GetItDoneError)
            expect(
                () =>
                    new GetItDone({
                        apiKey: TEST_API_KEY,
                        fetch: fetchFn,
                        dangerouslyAllowBrowser: true,
                    }),
            ).not.toThrow()
        } finally {
            delete globals.window
            delete globals.document
        }
    })
})

describe('raw-request escape hatch', () => {
    it('returns the parsed data alongside the raw Response and the x-request-id via client.request()', async () => {
        const harness = createQueuedFetch([
            {
                status: 200,
                jsonBody: { hello: 'world' },
                headers: { 'x-request-id': 'req_escape_hatch' },
            },
        ])
        const client = makeTestClient(harness)
        const result = await client.request<{ hello: string }>({
            method: 'GET',
            path: '/v1/organizations/me',
        })
        expect(result.data).toEqual({ hello: 'world' })
        expect(result.requestId).toBe('req_escape_hatch')
        expect(result.response).toBeInstanceOf(Response)
        expect(result.response.status).toBe(200)
    })
})

describe('query serialization', () => {
    it('skips undefined and null params, repeats arrays, ISO-formats Dates, and stringifies numbers and booleans', async () => {
        const harness = createQueuedFetch([
            { status: 200, jsonBody: { data: [] } },
        ])
        const client = makeTestClient(harness)
        await client.request({
            method: 'GET',
            path: '/v1/tasks',
            query: {
                status: ['TODO', 'IN_PROGRESS'],
                skipped: undefined,
                alsoSkipped: null,
                due_before: new Date('2026-07-24T12:00:00.000Z'),
                limit: 25,
                archived: false,
                search: 'ship the sdk',
            },
        })
        const url = harness.calls[0]?.url
        expect(url).toBeDefined()
        const params = new URL(url ?? '').searchParams
        expect(params.getAll('status')).toEqual(['TODO', 'IN_PROGRESS'])
        expect(params.has('skipped')).toBe(false)
        expect(params.has('alsoSkipped')).toBe(false)
        expect(params.get('due_before')).toBe('2026-07-24T12:00:00.000Z')
        expect(params.get('limit')).toBe('25')
        expect(params.get('archived')).toBe('false')
        expect(params.get('search')).toBe('ship the sdk')
    })
})
