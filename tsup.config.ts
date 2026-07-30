import { defineConfig } from 'tsup'

/**
 * Publish build for @nowgetitdone/sdk (open-api Phase 4).
 *
 * - `@getitdone/api-contracts` (and its `@getitdone/auth-scopes` type dep) are
 *   BUNDLED (`noExternal`) — the contracts package is private to the monorepo,
 *   so the published SDK must carry the types/values it uses. The main entry
 *   imports contracts types `import type`-only, so no contracts runtime code
 *   lands in `index.*`; the `webhooks` entry deliberately bundles the
 *   Standard Webhooks verifier from the server-only signing subpath.
 * - `node:crypto` stays external: it is only reached from the `./webhooks`
 *   subpath, which is documented server-only. The main entry has NO node
 *   imports and stays browser-loadable (key use in browsers is still blocked
 *   at runtime unless `dangerouslyAllowBrowser` is set).
 * - zod is a regular dependency (declaration files reference contract schema
 *   types); it is external here and never bundled.
 */
export default defineConfig({
    entry: { index: 'src/index.ts', webhooks: 'src/webhooks.ts' },
    format: ['esm', 'cjs'],
    // resolve: inline the PRIVATE workspace packages' types into the emitted
    // .d.ts — a published declaration file must not import
    // @getitdone/api-contracts (it does not exist on npm).
    // The declaration bundle must INLINE the private workspace packages'
    // types (they don't exist on npm), but rollup-plugin-dts cannot digest
    // their raw .ts source (it is not a type checker — function bodies with
    // inferred returns fail to parse). So `pnpm build` first emits real
    // .d.ts for api-contracts + auth-scopes into .contract-types/ (see
    // tsconfig.contract-types.json), and the dts build resolves the package
    // ids there via `paths`.
    dts: {
        resolve: true,
        compilerOptions: {
            baseUrl: '.',
            paths: {
                '@getitdone/api-contracts': [
                    './.contract-types/api-contracts/src/index.d.ts',
                ],
                '@getitdone/api-contracts/webhooks/signing': [
                    './.contract-types/api-contracts/src/webhooks/signing.d.ts',
                ],
                '@getitdone/auth-scopes': [
                    './.contract-types/auth-scopes/src/index.d.ts',
                ],
            },
        },
    },
    sourcemap: true,
    clean: true,
    target: 'node20',
    platform: 'neutral',
    external: ['node:crypto', 'zod'],
    noExternal: ['@getitdone/api-contracts', '@getitdone/auth-scopes'],
})
