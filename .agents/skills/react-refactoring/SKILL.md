---
name: react-refactoring
description: Refactor high-complexity React components. Use when a component has 300+ lines, 5+ hooks, deep conditional nesting, or mixes multiple concerns (routing, data fetching, forms, auth). Avoid for simple/well-structured components or when the user explicitly wants testing without refactoring.
---

# React Component Refactoring

Assess and reduce React component complexity through systematic extraction patterns.

## Assess Complexity

Before refactoring, read the component and check the indicators below.

### Base Indicators

| Indicator | What to look for |
|-----------|------------------|
| Line count | Total lines in the file (target: < 300) |
| Hook count | Number of `useState`, `useEffect`, `useCallback`, `useMemo` calls |
| Nesting depth | How deep conditionals nest (if inside if inside if...) |
| Conditional blocks | Count of if/switch/ternary expressions |
| Modal patterns | Number of modal/dialog open/close state pairs |
| Concern mixing | Business logic interleaved with JSX rendering |

### Decision Table

| Indicators | Action |
|------------|--------|
| < 200 lines, few hooks, shallow nesting | Ready as-is |
| 200-300 lines, 3+ useState, some nesting | Consider refactoring |
| 300+ lines, 5+ hooks, deep nesting | Should refactor |
| 500+ lines, complex state + effects + conditionals | Must refactor |

### Check Framework & Library Complexity Multipliers

After checking base indicators, scan imports and hook usage to identify patterns that **compound** complexity. Each detected category shifts the decision one level toward "should refactor."

**Routing** -- Component handles navigation, route params, and UI together:
- Next.js App Router: `useRouter`, `usePathname`, `useSearchParams`, `useParams`, `'use client'` / `'use server'` directives
- React Router: `useNavigate`, `useLocation`, `useParams`, `useSearchParams`, loader/action patterns
- TanStack Router: `useRouter`, `useSearch`, `useParams`

*Refactoring signal*: Extract route-dependent logic into a dedicated hook so the component receives plain data props.

**Data Fetching** -- Component orchestrates queries/mutations alongside UI:
- TanStack Query: `useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`
- SWR: `useSWR`, `useSWRMutation`
- Apollo GraphQL: `useQuery`, `useMutation`, `useSubscription`, `useLazyQuery`
- RTK Query: `useGetXxxQuery`, `useXxxMutation`

*Refactoring signal*: Extract data orchestration into a custom hook returning `{ data, isLoading, error, actions }`.

**State Management** -- Global/shared state mixes with local UI state:
- Redux: `useSelector`, `useDispatch`, `connect` HOC
- Zustand: `useStore`, multiple store subscriptions
- Jotai: `useAtom`, `useAtomValue`, `useSetAtom`
- Recoil: `useRecoilState`, `useRecoilValue`
- MobX: `observer` wrapper, `useLocalObservable`

*Refactoring signal*: Extract store interactions into a hook that maps store state to component-relevant data.

**Forms** -- Form state, validation, and submission coexist with layout:
- React Hook Form: `useForm`, `useFormContext`, `Controller`, `useFieldArray`
- Formik: `useFormik`, `Formik`, `Field`, `FieldArray`
- TanStack Form: `useForm`, field validators

*Refactoring signal*: Extract form config and validation into a `useXxxForm` hook. Extract field groups into sub-components.

**Internationalization** -- Adds branching when combined with conditional UI:
- react-i18next: `useTranslation`, `Trans`
- next-intl: `useTranslations`, `useFormatter`
- react-intl: `useIntl`, `FormattedMessage`

*Refactoring signal*: When locale-dependent rendering logic exists (different layouts, RTL), extract locale-aware sections.

**Animation** -- Adds lifecycle complexity:
- Framer Motion: `motion` components, `AnimatePresence`, `useAnimation`, `useMotionValue`
- React Spring: `useSpring`, `useTransition`, `useTrail`
- GSAP: `useGSAP`, timeline refs

*Refactoring signal*: Extract animated wrappers into self-contained components. Separate animation orchestration from content.

**Authentication / Authorization** -- Adds conditional rendering branches:
- NextAuth / Auth.js: `useSession`, `signIn`, `signOut`
- Clerk: `useUser`, `useAuth`, `SignedIn`/`SignedOut`
- Custom: role checks, permission guards

*Refactoring signal*: Extract auth-gated rendering into wrapper components or HOCs.

**Real-time** -- Adds subscription lifecycle:
- WebSocket: `useEffect` with `ws.onmessage` handlers
- Socket.io: `useSocket`, event listeners
- Server-Sent Events: `EventSource` in effects

*Refactoring signal*: Extract connection lifecycle and event dispatching into a dedicated hook.

**Compound complexity rule**: When a component touches 3+ categories simultaneously, it needs refactoring regardless of line count.

## Follow the Refactoring Workflow

### Step 1: Assess Complexity

Read the component and evaluate using the base indicators and framework multipliers above.

### Step 2: Identify Applicable Patterns

Based on what you observe, select the pattern and read its reference file for detailed examples:

| Observation | Pattern to apply | Reference |
|-------------|------------------|-----------|
| Multiple related useState + useEffect | Extract custom hook | Read [references/hook-extraction.md](references/hook-extraction.md) |
| API calls in component | Extract data hook | Read [references/hook-extraction.md](references/hook-extraction.md) |
| Multiple modal states | Extract modal management | Read [references/hook-extraction.md](references/hook-extraction.md) |
| Complex form handling | Extract form hook | Read [references/hook-extraction.md](references/hook-extraction.md) |
| 300+ lines with distinct UI sections | Split into sub-components | Read [references/component-splitting.md](references/component-splitting.md) |
| Deep conditional nesting | Simplify with lookup tables / early returns | Read [references/complexity-patterns.md](references/complexity-patterns.md) |
| Complex boolean logic or chained ternaries | Extract named functions | Read [references/complexity-patterns.md](references/complexity-patterns.md) |

### Step 3: Plan Extraction Order

1. Start with the most isolated concern (least dependencies)
2. Extract one piece at a time
3. Verify each extraction compiles before continuing

### Step 4: Execute Incrementally

For each extraction:
1. Create the new file (hook or component)
2. Move the relevant code
3. Update imports in the original component
4. Verify the component still works

### Step 5: Verify Improvement

Re-read the refactored component to confirm:
- Line count reduced
- Each file has a single responsibility
- Hooks are cohesive (related state grouped together)
- Component primarily handles rendering, not logic

## Avoid Common Mistakes

### Over-Engineering

```typescript
// Too many tiny hooks
const useButtonText = () => useState('Click')
const useButtonDisabled = () => useState(false)

// Better: Cohesive hook with related state
const useButtonState = () => {
  const [text, setText] = useState('Click')
  const [disabled, setDisabled] = useState(false)
  const [loading, setLoading] = useState(false)
  return { text, setText, disabled, setDisabled, loading, setLoading }
}
```

### Breaking Existing Patterns

- Follow existing directory structures in the project
- Maintain naming conventions already in use
- Preserve export patterns for compatibility

### Premature Abstraction

- Only extract when there's clear complexity benefit
- Don't create abstractions for single-use code
- Keep refactored code in the same domain area
