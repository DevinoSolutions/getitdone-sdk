/**
 * Pins the SDK's task-dependency surface: the subresource URL shape, the
 * both-ids DELETE, the auto-generated idempotency key on the link write, and
 * the cycle refusal arriving as a typed `ConflictError` a caller can branch on.
 */
import { describe, expect, it } from 'vitest'

import { ConflictError } from '../src/error'
import {
    createQueuedFetch,
    makeTestClient,
    problemReply,
    TEST_BASE_URL,
} from './support/mock-fetch'

const dependencies = {
    task_id: 'T-42',
    is_blocked: true,
    blocked_by_count: 1,
    blocking_count: 1,
    blocked_by: [
        {
            task_id: 'T-7',
            title: 'Write the migration',
            status: 'IN_PROGRESS',
            open: true,
        },
    ],
    blocking: [
        {
            task_id: 'T-99',
            title: 'Announce the release',
            status: 'TODO',
            open: true,
        },
    ],
}

const dependenciesReply = {
    status: 200,
    headers: {
        'content-type': 'application/json',
        'x-request-id': 'req_dependencies',
    },
    jsonBody: dependencies,
}

describe('reading a task blocker graph through the SDK', () => {
    it('GETs the dependencies subresource and returns both directions in one object, not a page', async () => {
        const harness = createQueuedFetch([dependenciesReply])
        const client = makeTestClient(harness)

        const result = await client.tasks.listDependencies('T-42')

        expect(harness.calls[0]?.method).toBe('GET')
        expect(harness.calls[0]?.url).toBe(
            `${TEST_BASE_URL}/v1/tasks/T-42/dependencies`,
        )
        expect(result.is_blocked).toBe(true)
        expect(result.blocked_by[0]?.task_id).toBe('T-7')
        expect(result.blocking[0]?.task_id).toBe('T-99')
    })
})

describe('linking and unlinking blockers through the SDK', () => {
    it('POSTs the blocker id to the subresource and sends an Idempotency-Key, because a retried link must not double-record', async () => {
        const harness = createQueuedFetch([dependenciesReply])
        const client = makeTestClient(harness)

        await client.tasks.addDependency('T-42', { blocker_task_id: 'T-7' })

        expect(harness.calls[0]?.method).toBe('POST')
        expect(harness.calls[0]?.url).toBe(
            `${TEST_BASE_URL}/v1/tasks/T-42/dependencies`,
        )
        expect(JSON.parse(harness.calls[0]?.bodyText ?? '{}')).toEqual({
            blocker_task_id: 'T-7',
        })
        expect(harness.calls[0]?.headers['idempotency-key']).toBeTruthy()
    })

    it('DELETEs the edge by BOTH task ids, so a caller never has to have stored an edge id', async () => {
        const harness = createQueuedFetch([
            {
                ...dependenciesReply,
                jsonBody: {
                    ...dependencies,
                    is_blocked: false,
                    blocked_by_count: 0,
                    blocked_by: [],
                },
            },
        ])
        const client = makeTestClient(harness)

        const result = await client.tasks.removeDependency('T-42', 'T-7')

        expect(harness.calls[0]?.method).toBe('DELETE')
        expect(harness.calls[0]?.url).toBe(
            `${TEST_BASE_URL}/v1/tasks/T-42/dependencies/T-7`,
        )
        expect(result.is_blocked).toBe(false)
    })

    it('surfaces a refused loop as ConflictError carrying the dependency_cycle code, distinguishable from an idempotency conflict', async () => {
        const harness = createQueuedFetch([
            problemReply(409, 'dependency_cycle', {
                detail: 'T-7 already blocks T-42 (directly or through other tasks), so T-42 cannot also block it.',
            }),
        ])
        const client = makeTestClient(harness)

        const error = await client.tasks
            .addDependency('T-7', { blocker_task_id: 'T-42' })
            .then(
                () => null,
                (err: unknown) => err,
            )

        expect(error).toBeInstanceOf(ConflictError)
        expect((error as ConflictError).code).toBe('dependency_cycle')
        expect((error as ConflictError).status).toBe(409)
    })
})
