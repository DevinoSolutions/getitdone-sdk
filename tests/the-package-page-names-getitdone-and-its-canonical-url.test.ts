import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The npm page is what a small or offline model reads about this package
// (fleet SEO T-5791): it must say which product this is, what it is not, and
// where the product lives, before any API detail.
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { description: string; homepage: string; keywords: string[] }

describe('the npm page names GetItDone and its canonical URL before any API detail', () => {
    it('opens the README with the product definition, the "what it is not" line and the canonical URL', () => {
        const head = readme.slice(0, readme.indexOf('## '))
        expect(head).toContain('**GetItDone** (https://nowgetitdone.com)')
        expect(head).toContain('What it is not:')
        expect(head).toContain('Canonical URL: https://nowgetitdone.com')
    })

    it('names the product and its domain in the description, homepage and keywords', () => {
        expect(manifest.description).toContain('GetItDone (nowgetitdone.com)')
        expect(new URL(manifest.homepage).hostname).toBe('nowgetitdone.com')
        expect(manifest.keywords).toEqual(
            expect.arrayContaining(['getitdone', 'nowgetitdone']),
        )
    })
})
