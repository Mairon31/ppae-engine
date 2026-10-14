# Internationalization — English, Spanish and Portuguese

PPAE's official product language is **English**. The landing and every Playground lab additionally support **Spanish** and **Brazilian Portuguese**.

## User-facing routes

The site uses GitHub Pages-compatible fragment routes. The `lang` query parameter controls the displayed language and remains intact when navigating between labs:

- English (default): `https://mairon31.github.io/ppae-engine/`
- Español: `https://mairon31.github.io/ppae-engine/?lang=es`
- Português: `https://mairon31.github.io/ppae-engine/?lang=pt`
- Deep links: `?lang=es#characters`, `?lang=pt#trees`, etc.

Both landing and Studio headers have an accessible language switcher. Selection persists in `localStorage` when permitted, while explicit `?lang=` overrides any stored preference. Selecting English removes the query parameter; absence of a saved preference defaults to English. Switching language preserves the selected hash and reloads the UI without changing engine seeds, assets, data or export formats.

HTML `lang`, presentation metadata, placeholders, titles and ARIA labels are localized. Pixelarticons and UI markup are preserved by translating leaf text nodes rather than replacing parent `innerHTML`.

## Source layout

| File | Purpose |
| --- | --- |
| `src/demo/i18n.ts` | Language selection, URL/localStorage handling, translation and DOM integration |
| `src/demo/i18n-marketing.ts` | Landing, SEO, accessibility and promotional content |
| `src/demo/i18n-catalog.ts` | All 30 lab names, groups, descriptions and asset labels |
| `src/demo/i18n-studio.ts` | Generated controls, editor, telemetry, UI labels and errors |
| `docs/i18n/README.es.md` | Standalone Spanish project README |
| `docs/i18n/README.pt-BR.md` | Standalone Brazilian Portuguese project README |
| `README.md` | **Canonical English project README** and links to localized versions |

English source strings serve as canonical translation keys. Add any new visible English label to the correct dictionary with meaningful Spanish and Portuguese equivalents. Prefer `tr('text')` when generating nodes from TypeScript; document-authored text nodes are translated at startup by `localizeDocument()`. Keep DOM IDs and engine catalog IDs language-neutral so bookmarks, seeds and JSON schemas remain stable.

Do not put three full languages into a single README. Each translated README should retain the key technical features, supported status, installation commands, truthful npm publication disclaimer, TypeScript examples, contribution guidance and relative links to the repository. Code identifiers must never be translated.

## Packaging

The npm allowlist publishes the built engine and its declarations, `README.md` (English), license and package metadata. Neither UI dictionaries nor localized READMEs, the landing or the Playground ship to consumers. **The site can support multiple languages without increasing npm download size.**

## Verification

Run:

```bash
npm test
npm run build
npm run check:package
```

`tests/ppae-english-ui.test.ts` verifies default English copy and every translated section; Chromium QA visits a Spanish Playground deep link, switches to Portuguese without losing the selected section, returns to the Portuguese landing on mobile, and switches back to English. npm CI checks the tarball contains only runtime files, types, license and English README.

Translation quality should be reviewed by native speakers for public releases. Changes to engine mechanics or schema names must remain language-independent.
