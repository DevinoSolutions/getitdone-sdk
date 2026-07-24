import type {
    createAttachmentUploadRoute,
    createTaskAttachmentRoute,
    getAttachmentDownloadUrlRoute,
    listTaskAttachmentsRoute,
} from '@getitdone/api-contracts'

import type {
    EnvelopeItem,
    RouteBody,
    RouteQuery,
    RouteResult,
} from '../core/contract-types'
import type { RequestOptions } from '../core/http'
import { requestPage, type PagePromise } from '../core/pagination'
import { ApiResource } from './resource'

export type Attachment = EnvelopeItem<
    RouteResult<typeof listTaskAttachmentsRoute>
>
export type ListTaskAttachmentsQuery = RouteQuery<
    typeof listTaskAttachmentsRoute
>
export type CreateAttachmentUploadBody = RouteBody<
    typeof createAttachmentUploadRoute
>
/** Presigned PUT target — upload the file bytes there, then `create`. */
export type AttachmentUpload = RouteResult<typeof createAttachmentUploadRoute>
export type CreateAttachmentBody = RouteBody<typeof createTaskAttachmentRoute>
export type AttachmentDownloadUrl = RouteResult<
    typeof getAttachmentDownloadUrlRoute
>

/**
 * Two-phase upload (open-api Phase 2 W4b): `createUpload` returns a
 * presigned PUT URL, the caller uploads the bytes, then `create` registers
 * the uploaded file on the task.
 */
export class Attachments extends ApiResource {
    list(
        taskId: string,
        query?: ListTaskAttachmentsQuery,
        options?: RequestOptions,
    ): PagePromise<Attachment> {
        return requestPage(this._core, {
            method: 'GET',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/attachments`,
            query,
            options,
        })
    }

    createUpload(
        taskId: string,
        body: CreateAttachmentUploadBody,
        options?: RequestOptions,
    ): Promise<AttachmentUpload> {
        return this._core.request({
            method: 'POST',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/attachments/uploads`,
            body,
            idempotent: true,
            options,
        })
    }

    create(
        taskId: string,
        body: CreateAttachmentBody,
        options?: RequestOptions,
    ): Promise<RouteResult<typeof createTaskAttachmentRoute>> {
        return this._core.request({
            method: 'POST',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/attachments`,
            body,
            idempotent: true,
            options,
        })
    }

    getDownloadUrl(
        attachmentId: string,
        options?: RequestOptions,
    ): Promise<AttachmentDownloadUrl> {
        return this._core.request({
            method: 'GET',
            path: `/v1/attachments/${encodeURIComponent(attachmentId)}/download-url`,
            options,
        })
    }
}
