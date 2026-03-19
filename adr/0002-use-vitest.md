# Use Vitest for testing

- 2026-03-19

# Context

The project runs on Bun as runtime and package manager. Bun provides a built-in
test runner (`bun test`) with a Jest-compatible API. The question arose whether
to use Bun's test runner instead of Vitest to reduce dependencies and tooling.

# Decision

Stick with Vitest for unit and integration tests. Do not switch to `bun test`.

Reasons:

1. **DOM environment** — Component tests render React with `@testing-library/react`
   and need a DOM. Vitest has first-class `environment: "jsdom"` support. Bun's
   test runner does not provide a jsdom environment; manual bootstrapping would
   be brittle.

2. **Ecosystem integration** — The setup uses `@testing-library/jest-dom/vitest`
   for matchers like `toBeInTheDocument()`. This path is built for Vitest.
   Bun's `expect` is a different implementation; jest-dom compatibility is
   unverified.

3. **Vite pipeline** — Vitest shares the Vite config: path aliases (`@/`),
   JSX/TS transforms, and `vitest.setup.ts` work without extra configuration.
   Bun would require separate path resolution and preload wiring.

4. **Unified runner** — Schema and logic tests could run on `bun test`, but
   component tests require jsdom. Splitting across two runners adds complexity
   without real benefit. Vitest handles both well.

# Consequences

- Vitest remains a dev dependency. No reduction in test tooling.
- Tests are invoked via `bun run test` / `bun run test:watch`; Bun still
  provides fast startup for the CLI layer.
- If Bun's test runner gains a proper jsdom story in the future, we can
  revisit.
