import type { HttpCore } from '../core/http'

/** Base for every resource namespace — holds the shared request engine. */
export class ApiResource {
    constructor(protected readonly _core: HttpCore) {}
}
