/**
 * Pins the SDK's task-occurrence surface: the date-keyed URL shape, the
 * complete/skip convenience wrappers, and the auto-paging list — the client
 * half of the recurring-tasks contract.
 */
import { describe, expect, it } from 'vitest'

import {
    createQueuedFetch,
    listReply,
    makeTestClient,
    TEST_BASE_URL,
} from './support/mock-fetch'

const occurrence = {
    task_id: 'T-42',
    occurrence_date: '2026-08-06',
    sequence: 12,
    status: 'COMPLETED',
    completed_at: '2026-08-06T09:30:00.000Z',
}

const occurrenceReply = {
    status: 200,
    headers: {
        'content-type': 'application/json',
        'x-request-id': 'req_occurrence',
    },
    jsonBody: occurrence,
}

describe('completing one day of a repeating task through the SDK', () => {
    it('PATCHes the day-keyed occurrence URL with the COMPLETED status', async () => {
        const harness = createQueuedFetch([occurrenceReply])
        const client = makeTestClient(harness)

        const result = await client.tasks.completeOccurrence(
            'T-42',
            '2026-08-06',
        )

        expect(harness.calls[0]?.method).toBe('PATCH')
        expect(harness.calls[0]?.url).toBe(
            `${TEST_BASE_URL}/v1/tasks/T-42/occurrences/2026-08-06`,
        )
        expect(JSON.parse(harness.calls[0]?.bodyText ?? '{}')).toEqual({
            status: 'COMPLETED',
        })
        expect(result.occurrence_date).toBe('2026-08-06')
    })

    it('sends SKIPPED for a day the user is closing rather than completing', async () => {
        const harness = createQueuedFetch([
            {
                ...occurrenceReply,
                jsonBody: { ...occurrence, status: 'SKIPPED' },
            },
        ])
        const client = makeTestClient(harness)

        await client.tasks.skipOccurrence('T-42', '2026-08-06')

        expect(JSON.parse(harness.calls[0]?.bodyText ?? '{}')).toEqual({
            status: 'SKIPPED',
        })
    })

    it('sends no Idempotency-Key, because re-sending the same day is already a no-op on the server', async () => {
        const harness = createQueuedFetch([occurrenceReply])
        const client = makeTestClient(harness)

        await client.tasks.completeOccurrence('T-42', '2026-08-06')

        expect(harness.calls[0]?.headers['idempotency-key']).toBeUndefined()
    })
})

describe('paging the occurrence ledger of a repeating task through the SDK', () => {
    it('requests the ledger with its calendar-window filters and follows the cursor across pages', async () => {
        const harness = createQueuedFetch([
            listReply([occurrence], 'cursor-page-2'),
            listReply(
                [
                    {
                        ...occurrence,
                        occurrence_date: '2026-08-05',
                        sequence: 11,
                    },
                ],
                null,
            ),
        ])
        const client = makeTestClient(harness)

        const days: string[] = []
        for await (const item of client.tasks.listOccurrences('T-42', {
            status: 'COMPLETED',
            starting_on: '2026-08-01',
            ending_on: '2026-08-31',
        })) {
            days.push(item.occurrence_date)
        }

        expect(days).toEqual(['2026-08-06', '2026-08-05'])
        const firstUrl = new URL(harness.calls[0]?.url ?? '')
        expect(firstUrl.pathname).toBe('/v1/tasks/T-42/occurrences')
        expect(firstUrl.searchParams.get('status')).toBe('COMPLETED')
        expect(firstUrl.searchParams.get('starting_on')).toBe('2026-08-01')
        expect(firstUrl.searchParams.get('ending_on')).toBe('2026-08-31')
        expect(
            new URL(harness.calls[1]?.url ?? '').searchParams.get('after'),
        ).toBe('cursor-page-2')
    })
})
