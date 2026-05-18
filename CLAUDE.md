# CLAUDE.md

## Package manager: pnpm only

This repo uses **pnpm**, not npm. Never run `npm` commands — use `pnpm`
instead. The version is pinned via the `packageManager` field and the
`engines.pnpm` constraint in the root `package.json`.

## Build and typecheck

Always run typechecks and builds from the **repo root**, never from a single
workspace:

```bash
pnpm build      # builds all services (regenerates proto bindings)
pnpm typecheck  # typechecks all services
pnpm test       # runs all service tests
```

Do not run module-scoped checks (e.g. `cd services/core && npx tsc --noEmit`).
Generated proto bindings, cross-workspace imports, and Turbo's caching all
assume the root-level run; module-only checks can pass while the integrated
build fails. Run the full set every time, even if the change appears to touch
one module only.
