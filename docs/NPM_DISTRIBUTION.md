# npm distribution and repository layout

PPAE uses a single source repository for the TypeScript engine, landing page, interactive Playground, tests, and contributor documentation. **The npm package is a separate distribution artifact** that contains only the engine's compiled JavaScript and public TypeScript declarations.

## Published package vs. full repository

| Resource | GitHub repository | GitHub Pages | npm tarball |
| :--- | :---: | :---: | :---: |
| Engine TypeScript source | Yes | Bundled into demo | No |
| Built engine (ES module) | Generated on build | Bundled into demo | Yes |
| Public TypeScript declarations | Generated on build | Not needed | Yes |
| Landing / Playground source | Yes | Compiled to Vite assets | No |
| Playground CSS, fonts, Pixelarticons | Yes | Bundled or linked for website | No |
| Tests, benchmark scripts and GitHub Actions | Yes | No | No |
| Implementation notes and technical docs | Yes | Not packaged | No |
| Package README, LICENSE and package.json | Yes | N/A | Yes |

The package manifest's **`files` allowlist** includes `dist/library` and `dist/**/*.d.ts`, plus `README.md` and `LICENSE`. npm also includes required metadata such as `package.json`. The `dist/demo` directory is not published.

`tsconfig.build.json` excludes `src/demo/**` from declaration generation so the demo cannot leak TypeScript UI declarations into `dist`. Vite still builds `dist/demo` separately for GitHub Pages.

**Keeping a site in the same repository does not increase the npm download size.** The tarball contents, not the source repository size, determine what consumers install.

## Build and inspect the distributable

```sh
npm ci
npm run build
npm run check:package
```

`npm run check:package` runs `npm pack --dry-run --json --ignore-scripts` locally. It checks:

- That the engine entry `dist/library/index.js` and type entry `dist/index.d.ts` exist.
- That only the engine ESM files, declarations, license, README and package metadata are included.
- That screenshots, the landing, the Playground, CSS, fonts, docs, tests, caches, `.github` and project scripts are **not** in the package.
- That the compressed dry-run package is below a conservative 2 MiB safety budget.
- The exact list of included files, compressed bytes, and unpacked bytes.

This audit is part of the CI validation workflow. It **does not publish to npm** or require npm credentials.

## When to split repositories

Remain in one repository for now. It simplifies cross-system changes, tests, API examples and contributor PRs while the engine and Playground evolve together.

Consider moving the landing/Playground to their own repository **only when** they gain an independent release cycle or team, or need separate hosting, permissions or deployment cadence. Even then, a monorepo with `packages/engine` and `apps/playground` would usually be sufficient. Do not split merely to reduce npm package size, because the allowlist already solves that.

## Future npm release checklist

1. Validate the public import and typed API on Node.js and in Vite (existing `typecheck:package`).
2. Confirm `npm run build && npm run check:package` succeeds on the release commit.
3. Review package naming, ownership of the `@pixelproject` npm scope, semantic version and publish permissions.
4. Optionally add a publish workflow with npm provenance and version-tag/manual approval.
5. Publish from a trusted version/tag only after maintainer approval.

The current `@pixelproject/ppae` name and `0.2.0-alpha.1` version are metadata in the repository. **No npm publication is claimed or performed by this process.**

## Phase 12 scene API

`PPAEEngine.renderProductionScene(config)` and `PPAEEngine.compareProductionProfiles(kind, seed)` lazily construct the scene inspector only when called. Standalone asset generation remains unaffected. The 32-lab Playground, landing page, docs and browser QA source files remain outside the npm package because `package.json#files` is an allowlist. No publication to npm is performed by validation.
