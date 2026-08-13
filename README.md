# @nowgetitdone/sdk

Official TypeScript SDK for the [GetItDone](https://nowgetitdone.com) public
API — AI-native task management for people and agents.

- Typed clients for every `/v1` operation: organizations, members, projects,
  tasks, daily plan, attachments, API keys, webhook endpoints, usage.
- RFC 9457 `problem+json` error hierarchy with a stable `code` on every error.
- Rate-limit-aware retries that honor `Retry-After`.
- Automatic `Idempotency-Key` generation on consequential POSTs — retries can
  never double-create.
- Cursor auto-pagination (`for await`) with a page escape hatch.
- Standard Webhooks signature verification for your webhook receiver.

## Install

```sh
npm install @nowgetitdone/sdk
```

Requires Node.js 20+. TypeScript types are bundled; `zod` is the only
dependency (types).

## Quickstart

Create an API key in [app.nowgetitdone.com](https://app.nowgetitdone.com)
under **Settings → API keys**, then:

```ts
import GetItDone from '@nowgetitdone/sdk'

const client = new GetItDone({
    apiKey: process.env.GETITDONE_API_KEY, // gid_… (defaults to this env var)
})

const task = await client.tasks.create({
    title: 'Ship the integration',
})
console.log(task.id) // "T-123"

for await (const t of client.tasks.list({ limit: 50 })) {
    console.log(t.id, t.title, t.status)
}
```

The SDK is server-oriented: an API key is a secret, so constructing the
client in a browser throws unless you explicitly pass
`dangerouslyAllowBrowser: true`.

## Errors

Every non-2xx response throws a typed error carrying the API's RFC 9457
problem document. Branch on `error.code` — it is a frozen vocabulary; `title`
and `detail` are for humans.

```ts
import { APIError, RateLimitError, NotFoundError } from '@nowgetitdone/sdk'

try {
    await client.tasks.retrieve('T-999')
} catch (err) {
    if (err instanceof NotFoundError) {
        // err.code === 'resource_not_found'
    } else if (err instanceof RateLimitError) {
        // err.code: 'rate_limited' (burst) vs 'quota_exhausted' (plan period)
        console.log(err.isQuotaExhausted, err.retryAfterSeconds)
    } else if (err instanceof APIError) {
        console.log(err.status, err.code, err.requestId, err.fieldErrors)
    }
}
```

Quote `err.requestId` in support requests — it matches the server's logs.

## Retries & idempotency

Network failures, timeouts, 408/429/5xx are retried (default `maxRetries: 2`)
with exponential backoff, honoring `Retry-After` up to
`maxRetryAfterSeconds` (default 60 — a burst window is worth waiting for, a
billing period is not). A POST is **never** retried without an
`Idempotency-Key`; on consequential POSTs (creates, archive/unarchive,
rotate-secret) the SDK generates one automatically and re-sends the **same**
key on every retry, so the server replays instead of re-executing. Pass
`{ idempotencyKey: '…' }` per call to control the key yourself.

## Pagination

```ts
// Auto-iterate every page:
for await (const project of client.projects.list()) { … }

// Or page by page:
let page = await client.tasks.list({ limit: 100 })
while (page) {
    handle(page.data)
    page = await page.getNextPage() // null on the last page
}
```

## Verifying webhooks (your server)

GetItDone signs outbound webhooks per the
[Standard Webhooks](https://www.standardwebhooks.com/) spec. Verify the RAW
request bytes — never a parsed-and-reserialized body:

```ts
import { verifyWebhook } from '@nowgetitdone/sdk/webhooks'

// e.g. in an Express handler with `express.raw({ type: '*/*' })`:
const result = verifyWebhook({
    headers: req.headers,
    rawBody: req.body.toString('utf8'),
    secret: process.env.GETITDONE_WEBHOOK_SECRET, // whsec_…
})
if (!result.valid) {
    return res.status(400).send(`invalid signature: ${result.reason}`)
}
```

`@nowgetitdone/sdk/webhooks` is server-only (`node:crypto`). During a secret
rotation grace window, pass both secrets: `secret: [current, previous]`.

## Escape hatches

```ts
// Raw request with the client's auth/retry/timeout behavior:
const { data, response, requestId } = await client.request({
    method: 'GET',
    path: '/v1/usage',
})

// Per-call overrides:
await client.tasks.create(
    { title: 'urgent' },
    { timeoutMs: 5_000, maxRetries: 0, signal: abortController.signal },
)
```

## Configuration

| Option                    | Default                        | Notes                                        |
| ------------------------- | ------------------------------ | -------------------------------------------- |
| `apiKey`                  | `GETITDONE_API_KEY` env var    | `gid_…` organization API key                 |
| `baseUrl`                 | `https://app.nowgetitdone.com` | `GETITDONE_BASE_URL` env var override        |
| `timeoutMs`               | `60000`                        | per attempt                                  |
| `maxRetries`              | `2`                            | after the first attempt                      |
| `maxRetryAfterSeconds`    | `60`                           | larger `Retry-After` ⇒ give up               |
| `authStyle`               | `'authorization'`              | **deprecated** — see below; removed in 0.2.0 |
| `logger`                  | none                           | redacted request/response/retry events       |
| `dangerouslyAllowBrowser` | `false`                        | API keys are secrets — keep them server-side |

### `authStyle` is deprecated

The `/v1` API is **Bearer-only**: it reads `Authorization: Bearer gid_…` and
nothing else. `authStyle: 'x-api-key'` never worked — that header is a legacy
`/api/*` scheme, and `/v1` answers `401 missing_credentials` without ever
looking at the key. The SDK now logs a deprecation warning and sends Bearer
anyway, so calls that previously failed 100% of the time succeed. Drop the
option; it is removed in 0.2.0.

## Development

This repository is a read-only mirror published from the GetItDone monorepo —
issues and discussions are welcome here; the source of truth (and CI) lives
in the product repo. Released with
[Changesets](https://github.com/changesets/changesets); see CHANGELOG.md.

## License

MIT © Devino Solutions Inc.
