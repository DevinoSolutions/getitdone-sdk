import type {
    appendNoteRoute,
    appendTaskNoteRoute,
    createNoteRoute,
    getNoteRoute,
    listNotesRoute,
    updateNoteRoute,
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

export type Note = RouteResult<typeof getNoteRoute>
export type NotePreview = EnvelopeItem<RouteResult<typeof listNotesRoute>>
export type ListNotesQuery = RouteQuery<typeof listNotesRoute>
export type CreateNoteBody = RouteBody<typeof createNoteRoute>
export type AppendNoteBody = RouteBody<typeof appendNoteRoute>
export type UpdateNoteBody = RouteBody<typeof updateNoteRoute>
export type AppendTaskNoteBody = RouteBody<typeof appendTaskNoteRoute>
export type TaskNoteResult = RouteResult<typeof appendTaskNoteRoute>

export class Notes extends ApiResource {
    list(
        query?: ListNotesQuery,
        options?: RequestOptions,
    ): PagePromise<NotePreview> {
        return requestPage(this._core, {
            method: 'GET',
            path: '/v1/notes',
            query,
            options,
        })
    }

    retrieve(noteId: string, options?: RequestOptions): Promise<Note> {
        return this._core.request({
            method: 'GET',
            path: `/v1/notes/${encodeURIComponent(noteId)}`,
            options,
        })
    }

    create(
        body: CreateNoteBody,
        options?: RequestOptions,
    ): Promise<RouteResult<typeof createNoteRoute>> {
        return this._core.request({
            method: 'POST',
            path: '/v1/notes',
            body,
            idempotent: true,
            options,
        })
    }

    append(
        noteId: string,
        body: AppendNoteBody,
        options?: RequestOptions,
    ): Promise<Note> {
        return this._core.request({
            method: 'POST',
            path: `/v1/notes/${encodeURIComponent(noteId)}/append`,
            body,
            options,
        })
    }

    update(
        noteId: string,
        body: UpdateNoteBody,
        options?: RequestOptions,
    ): Promise<Note> {
        return this._core.request({
            method: 'PATCH',
            path: `/v1/notes/${encodeURIComponent(noteId)}`,
            body,
            options,
        })
    }

    appendTaskNote(
        taskId: string,
        body: AppendTaskNoteBody,
        options?: RequestOptions,
    ): Promise<TaskNoteResult> {
        return this._core.request({
            method: 'POST',
            path: `/v1/tasks/${encodeURIComponent(taskId)}/notes`,
            body,
            options,
        })
    }
}
