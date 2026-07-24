/**
 * @getitdone/sdk — official TypeScript SDK for the GetItDone public API.
 *
 * Browser-safe entry: no `node:` imports. The Standard Webhooks signature
 * verifier for YOUR server lives in the `@getitdone/sdk/webhooks` subpath
 * (node:crypto).
 */
export {
    DEFAULT_BASE_URL,
    DEFAULT_MAX_RETRIES,
    DEFAULT_MAX_RETRY_AFTER_SECONDS,
    DEFAULT_TIMEOUT_MS,
    GetItDone,
    type GetItDoneOptions,
} from './client'
export type { ApiResponse, HttpMethod, RequestOptions } from './core/http'
export type { SdkLogger } from './core/logger'
export { Page, PagePromise, type ListEnvelope } from './core/pagination'
export {
    APIConnectionError,
    APIConnectionTimeoutError,
    APIError,
    APIUserAbortError,
    AuthenticationError,
    BadRequestError,
    ConflictError,
    GetItDoneError,
    InternalServerError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
    UnprocessableEntityError,
    parseRetryAfterSeconds,
    type ApiProblemCode,
} from './error'
export { VERSION } from './version'

// Wire types — problem documents come straight from the contracts package
// (the SAME zod schemas the server validates with).
export type { FieldError, Problem, ProblemCode } from '@getitdone/api-contracts'

// Per-resource request/response types.
export type {
    ApiKey,
    CreateApiKeyBody,
    CreatedApiKey,
    ListApiKeysQuery,
    RevokedApiKey,
} from './resources/api-keys'
export type {
    Attachment,
    AttachmentDownloadUrl,
    AttachmentUpload,
    CreateAttachmentBody,
    CreateAttachmentUploadBody,
    ListTaskAttachmentsQuery,
} from './resources/attachments'
export type {
    CreateDailyPlanEntryBody,
    DailyPlan,
    GetDailyPlanQuery,
    MoveDailyPlanEntryBody,
    SetDailyPlanStatusBody,
    SetDailyPlanStatusQuery,
} from './resources/daily-plan'
export type { ListMembersQuery, Member } from './resources/members'
export type { Organization } from './resources/organizations'
export type {
    CreateProjectBody,
    ListProjectsQuery,
    Project,
} from './resources/projects'
export type {
    CreateTaskBody,
    ListTaskHistoryQuery,
    ListTasksQuery,
    Task,
    TaskHistoryEntry,
    UpdateTaskBody,
} from './resources/tasks'
export type { Usage } from './resources/usage'
export type {
    CreateWebhookEndpointBody,
    CreatedWebhookEndpoint,
    ListWebhookDeliveriesQuery,
    ListWebhookEndpointsQuery,
    RotatedWebhookEndpointSecret,
    UpdateWebhookEndpointBody,
    WebhookDelivery,
    WebhookEndpoint,
    WebhookEndpointVerification,
    WebhookTestEventBody,
    WebhookTestEventResult,
} from './resources/webhook-endpoints'

export { GetItDone as default } from './client'
