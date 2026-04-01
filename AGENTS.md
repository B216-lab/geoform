# Geoform — Agent Guidelines

Geospatial web forms application for collecting transport-survey and
movement-tracking data. Single-page React app with a multi-step form, i18n
(Russian / English), DaData address autocomplete, and draft persistence via
localStorage.

## Project structure

```text
src/
├── App.tsx                        # Root layout (MantineProvider, AppShell, theme/lang toggle)
├── main.tsx                       # Entry point (providers, i18n import)
├── index.css                      # Global styles (Tailwind v4)
├── components/                    # Shared / reusable UI
│   ├── SuccessScreen.tsx
│   └── ui/
│       └── AddressAutocomplete.tsx
├── features/                      # Domain features (one feature per folder)
│   └── dayMovements/
│       ├── DayMovementsForm.tsx    # Stepper orchestrator (react-hook-form + zod)
│       ├── GeneralInfoStep.tsx     # Step 1 — personal data
│       ├── MovementsStep.tsx       # Step 2 — movement timeline
│       ├── MovementItem.tsx        # Single movement row
│       ├── ArrivalPointItem.tsx    # Single arrival point row
│       ├── store.ts               # Zustand draft store (localStorage)
│       ├── schema.ts              # Zod validation schemas
│       ├── formSubmission.ts      # API submission logic
│       ├── dadataApi.ts           # DaData address-suggest client
│       ├── useDaDataAddress.ts    # Debounced address-suggest hook
│       ├── addressUtils.ts        # Address helpers
│       ├── enums.ts               # Gender / place / transport / status enums
│       ├── types.ts               # Shared TS types
│       └── __tests__/             # Co-located unit tests
├── lib/                           # App-level infrastructure
│   ├── api.ts                     # Axios instance
│   ├── env.ts                     # Build-time env
│   ├── i18n.ts                    # i18next init
│   └── runtimeConfig.ts           # Runtime env (env.js)
└── locales/                       # Translation dictionaries
    ├── en/common.ts
    └── ru/common.ts
```

## Tech stack

| Layer           | Tool                                                  |
| --------------- | ----------------------------------------------------- |
| Runtime / PM    | Bun 1.3                                               |
| Framework       | React 19                                              |
| UI              | Mantine 8, Tailwind CSS v4                            |
| Forms           | React Hook Form + Zod + @hookform/resolvers           |
| State           | Zustand (feature-scoped draft store)                  |
| i18n            | i18next + react-i18next (fallback `ru`, supported `ru`, `en`) |
| HTTP            | Axios                                                 |
| Test            | Vitest + Testing Library (jsdom)                      |
| Lint / Format   | Biome                                                 |
| Commit lint     | commitlint (`@commitlint/config-conventional`)        |
| Pre-commit      | Husky + lint-staged                                   |
| CI              | GitHub Actions (build, test, lint, format)             |
| Deploy          | Docker (nginx) → SSH deploy to staging / preprod      |

## Coding standards

### TypeScript

- Strict mode is on (`strict`, `noUnusedLocals`, `noUnusedParameters`,
  `noUncheckedIndexedAccess`).
- Use the `@/` path alias for imports from `src/`.
- Prefer explicit return types on exported functions.
- Avoid `any`; Biome warns on `noExplicitAny`.

### React

- Feature-based folder structure: every feature lives under
  `src/features/<name>/` with its own schema, store, types, and co-located
  tests.
- Shared components go in `src/components/`.
- Forms use React Hook Form with Zod schemas resolved via
  `@hookform/resolvers/zod`.
- All user-visible strings come from i18n dictionaries — never hardcode text.
- Keep components presentational when possible; pass data and callbacks as
  props rather than fetching inside the component.

### Formatting (Biome)

- Indent: 2 spaces.
- Line width: 100.
- Double quotes, semicolons always.
- Use Bun-based commands for local scripts and hooks; do not swap to `npm` /
  `npx` unless Bun is unavailable and you explicitly need a fallback.
- Prefer `bun run <script>` for package scripts. Do not use bare `bun test`
  in this repo because tests run through Vitest, not Bun's native test
  runner.
- Run `bun run format` to auto-format; `bun run format:check` for CI.

### Linting (Biome)

- Recommended rule set + `noUnusedImports` (warn),
  `noUnusedVariables` (warn), `noExplicitAny` (warn).
- Run `bun run lint` to check; `bun run lint:fix` to auto-fix.
- `bun run check` runs both lint and format in a single pass.

## Git

- Use precise conventional commit messages with title no longer than 100
  characters.
- Commit titles follow `@commitlint/config-conventional` types: `feat`,
  `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style`, `perf`,
  `build`.
- Use present-tense imperative mood: `feat: add movement timeline step`,
  not `feat: added movement timeline step`.
- Scope is optional but helpful: `fix(schema): reject empty movements
  array`.
- Keep commits atomic — one logical change per commit.
- Pull request titles must follow conventional-commit style too:
  `type(scope): short summary` (for example `feat(forms): add respondent key
  access gate`). Do not use non-conventional PR prefixes.

### Pre-commit hooks (Husky + lint-staged)

These run automatically on every commit — do not skip them:

| Hook         | What it does                                                   |
| ------------ | -------------------------------------------------------------- |
| `pre-commit` | Runs `bun run lint-staged`, `bun run format:check`, then `bun run test` |
| `commit-msg` | Runs `bun run commitlint --edit` to enforce conventional commit format |

### Before pushing

Verify locally that the CI pipeline will pass:

```bash
bun run build        # TypeScript type-check + Vite production build
bun run test         # Vitest unit tests
bun run lint         # Biome linter
bun run format:check # Biome format check
```

## Unit tests

- Runner: **Vitest** (jsdom environment, globals enabled).
- Assertion helpers: `@testing-library/jest-dom/vitest` matchers.
- Interaction: `@testing-library/user-event` (always `userEvent.setup()`
  before interacting).
- Setup file: `vitest.setup.ts` — registers jest-dom matchers and provides
  browser API mocks (`matchMedia`, `ResizeObserver`).
- Test location: co-located in `__tests__/` directories next to the source
  they cover.

### Element selection — use `data-testid`, not labels

The app is multilingual (ru / en). Labels change with locale and
translations are updated frequently. Querying elements by visible text or
`aria-label` makes tests brittle and forces regex unions like
`/next|далее/i`.

Prefer stable `data-testid` attributes:

```tsx
// Component
<Button data-testid="next-step-btn" onClick={onNext}>
  {t("common.next")}
</Button>

// Test
screen.getByTestId("next-step-btn");
```

When `data-testid` is not yet present, add it to the component before
writing the test. Use kebab-case names that describe the element's purpose:
`birthday-input`, `gender-select`, `add-movement-btn`,
`movements-error-alert`.

Use `getByRole` only for genuinely semantic queries where the role itself is
the thing being tested (e.g. verifying a landmark region exists), not as a
workaround for missing test IDs.

### Test style

- **Concise** — test one behaviour per `it()` block; name describes the
  expected outcome.
- **Parameterized** — use `it.each` for repetitive assertions over different
  inputs:

```ts
it.each([
  ["", false],
  ["1990-01-01", true],
])("validates birthday '%s' → success=%s", (birthday, expected) => {
  const data = { ...validFormData(), birthday };
  expect(schema.safeParse(data).success).toBe(expected);
});
```

- **Builder helpers** — extract factory functions (`makeDraft()`,
  `makeTimeline()`, `makeActions()`) for complex default objects so each
  test only specifies the fields it cares about.
- **Wrapper components** — wrap rendered components with shared providers
  (`MantineProvider`, `FormProvider`, `I18nextProvider`) in a local
  `Wrapper` function.
- Avoid testing implementation details (CSS class names, internal state).
  Test observable behaviour: rendered output, user interactions, callback
  invocations.
- Mock only what you must: external APIs, localStorage, browser APIs.
  Prefer real Zod schemas and real i18n instances over mocks.

### Running tests

```bash
bun run test         # Single run (CI)
bun run test:watch   # Watch mode (development)
```
