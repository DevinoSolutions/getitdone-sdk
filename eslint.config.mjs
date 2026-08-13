import base from '@getitdone/eslint-config'

export default [
    ...base,
    {
        // Sanctioned no-console exception, config-declared (CLAUDE.md:
        // exceptions live in files-overrides, not inline disables). A
        // PUBLISHED library has no logger of its own and the `logger` option
        // defaults to a no-op, so `console.warn` is the only channel that
        // actually reaches an integrator using a dead option (the `x-api-key`
        // authStyle deprecation). MUST come after `...base`: flat-config
        // resolves rules last-match-wins.
        files: ['src/client.ts'],
        rules: { 'no-console': 'off' },
    },
]
