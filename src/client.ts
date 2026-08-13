/**
 * GetItDone API client (open-api D9) — a thin, hand-owned wrapper over the
 * public /v1 REST surface at https://app.nowgetitdone.com. Server-oriented:
 * it carries a SECRET API key, so constructing it in a browser throws unless
 * `dangerouslyAllowBrowser` is set.
 */
import {
    HttpCore,
    type ApiResponse,
    type HttpMethod,
    type RequestOptions,
} from './core/http'
import { noopLogger, type SdkLogger } from './core/logger'
import { GetItDoneError } from './error'
import { ApiKeys } from './resources/api-keys'
import { Attachments } from './resources/attachments'
import { DailyPlanResource } from './resources/daily-plan'
import { Members } from './resources/members'
import { Organizations } from './resources/organizations'
import { Projects } from './resources/projects'
import { Tasks } from './resources/tasks'
import { UsageResource } from './resources/usage'
import { WebhookEndpoints } from './resources/webhook-endpoints'

export const DEFAULT_BASE_URL = 'https://app.nowgetitdone.com'
export const DEFAULT_TIMEOUT_MS = 60_000
export const DEFAULT_MAX_RETRIES = 2
export const DEFAULT_MAX_RETRY_AFTER_SECONDS = 60

export interface GetItDoneOptions {
    /**
     * Organization API key (`gid_…` / `gid_test_…`). Defaults to the
     * `GETITDONE_API_KEY` environment variable.
     */
    apiKey?: string
    /** Defaults to `GETITDONE_BASE_URL`, then https://app.nowgetitdone.com. */
    baseUrl?: string
    /** Per-attempt timeout. Default 60s. */
    timeoutMs?: number
    /** Retry budget after the first attempt. Default 2. */
    maxRetries?: number
    /** A `Retry-After` above this gives up instead of waiting. Default 60. */
    maxRetryAfterSeconds?: number
    /**
     * @deprecated `/v1` is Bearer-only, so this option has exactly one working
     * value and will be REMOVED in the next minor (0.2.0). `'x-api-key'` never
     * worked: `createPublicRouteHandler` reads the `Authorization` header only
     * and answers `401 missing_credentials` before it ever looks at the key
     * (the `x-api-key` header is a legacy `/api/*` scheme). Passing it now logs
     * a deprecation warning and sends `Authorization: Bearer …` anyway, so
     * calls that used to fail 100% of the time start succeeding. Drop the
     * option — the default is the only supported scheme.
     */
    authStyle?: 'authorization' | 'x-api-key'
    /** Custom fetch (test injection / proxying). Defaults to global fetch. */
    fetch?: typeof globalThis.fetch
    /** Headers merged into every request (auth cannot be overridden). */
    defaultHeaders?: Record<string, string>
    /** Receives redacted request/response/retry events. Bodies never logged. */
    logger?: SdkLogger
    /**
     * API keys are SECRETS: shipping one in a browser exposes it to every
     * visitor. Only set this in trusted-kiosk-style environments.
     */
    dangerouslyAllowBrowser?: boolean
}

/**
 * Emitted once per client constructed with the dead `x-api-key` auth style.
 * Exported for the regression test, NOT part of the package's public surface
 * (`src/index.ts` does not re-export it).
 */
export const X_API_KEY_AUTH_STYLE_DEPRECATION_MESSAGE =
    "[@nowgetitdone/sdk] `authStyle: 'x-api-key'` is deprecated and IGNORED. The /v1 API is " +
    'Bearer-only: it answers 401 missing_credentials to an x-api-key header without ever ' +
    'reading the key, so every call under that style failed. Sending `Authorization: Bearer …` ' +
    'instead. Remove the option — it is deleted in 0.2.0.'

function readEnv(name: string): string | undefined {
    if (typeof process === 'undefined') return undefined
    // eslint-disable-next-line no-restricted-syntax -- 2026-07-24 published SDK reads the CUSTOMER's GETITDONE_* env vars; the repo zod-env rule governs our services, not their runtime
    return process.env?.[name]
}

function isBrowserEnvironment(): boolean {
    // No DOM lib in this package's tsconfig — probe via globalThis.
    const g = globalThis as { window?: unknown; document?: unknown }
    return g.window !== undefined && g.document !== undefined
}

export class GetItDone {
    readonly baseUrl: string
    readonly organizations: Organizations
    readonly members: Members
    readonly projects: Projects
    readonly tasks: Tasks
    readonly dailyPlan: DailyPlanResource
    readonly attachments: Attachments
    readonly apiKeys: ApiKeys
    readonly webhookEndpoints: WebhookEndpoints
    readonly usage: UsageResource

    private readonly core: HttpCore

    constructor(options: GetItDoneOptions = {}) {
        if (
            isBrowserEnvironment() &&
            options.dangerouslyAllowBrowser !== true
        ) {
            throw new GetItDoneError(
                'GetItDone SDK was constructed in a browser-like environment. API keys are secrets — ' +
                    'exposing one in frontend code leaks it to every visitor. Call the API from your ' +
                    'server instead, or pass `dangerouslyAllowBrowser: true` if you really mean it.',
            )
        }
        const apiKey = options.apiKey ?? readEnv('GETITDONE_API_KEY')
        if (!apiKey) {
            throw new GetItDoneError(
                'Missing API key: pass `apiKey` to new GetItDone({...}) or set the GETITDONE_API_KEY environment variable. ' +
                    'Create one at https://app.nowgetitdone.com/settings (API keys).',
            )
        }
        if (options.authStyle === 'x-api-key') {
            console.warn(X_API_KEY_AUTH_STYLE_DEPRECATION_MESSAGE)
        }
        this.baseUrl = (
            options.baseUrl ??
            readEnv('GETITDONE_BASE_URL') ??
            DEFAULT_BASE_URL
        ).replace(/\/+$/, '')
        this.core = new HttpCore({
            apiKey,
            baseUrl: this.baseUrl,
            timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
            maxRetryAfterSeconds:
                options.maxRetryAfterSeconds ?? DEFAULT_MAX_RETRY_AFTER_SECONDS,
            fetchFn: options.fetch ?? globalThis.fetch,
            defaultHeaders: options.defaultHeaders ?? {},
            logger: options.logger ?? noopLogger,
        })
        this.organizations = new Organizations(this.core)
        this.members = new Members(this.core)
        this.projects = new Projects(this.core)
        this.tasks = new Tasks(this.core)
        this.dailyPlan = new DailyPlanResource(this.core)
        this.attachments = new Attachments(this.core)
        this.apiKeys = new ApiKeys(this.core)
        this.webhookEndpoints = new WebhookEndpoints(this.core)
        this.usage = new UsageResource(this.core)
    }

    /**
     * Raw-request escape hatch: arbitrary /v1 call with the client's auth,
     * retry and timeout behavior, returning the untyped data AND the raw
     * `Response` (headers, status).
     */
    request<T = unknown>(params: {
        method: HttpMethod
        path: string
        query?: Record<string, unknown>
        body?: unknown
        idempotent?: boolean
        options?: RequestOptions
    }): Promise<ApiResponse<T>> {
        return this.core.requestWithResponse<T>(params)
    }
}
