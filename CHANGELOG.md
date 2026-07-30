# @nowgetitdone/sdk

## 0.1.0

### Minor Changes

- 91c9ed2: Initial release of the official GetItDone TypeScript SDK: typed clients for
  every /v1 operation (organizations, members, projects, tasks, daily plan,
  attachments, API keys, webhook endpoints, usage), RFC 9457 problem+json error
  hierarchy with stable `code` branching, rate-limit-aware retries honoring
  `Retry-After`, automatic Idempotency-Key generation on consequential POSTs,
  cursor auto-pagination, and Standard Webhooks signature verification via
  `@nowgetitdone/sdk/webhooks`.
