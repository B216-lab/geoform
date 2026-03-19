---
name: component-refactoring
description: Refactor high-complexity React components. Use when a component has 300+ lines, 5+ hooks, deep conditional nesting, or mixes multiple concerns (routing, data fetching, forms, auth). Avoid for simple/well-structured components or when the user explicitly wants testing without refactoring.
---

# Component Refactoring Skill

Guide for assessing and reducing React component complexity through systematic extraction patterns.

## Complexity Assessment

Before refactoring, assess the component's complexity by reading the code and checking the indicators below.

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

### Framework & Library Complexity Multipliers

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

## Core Refactoring Patterns

### Pattern 1: Extract Custom Hooks

**When**: Component has complex state management, multiple `useState`/`useEffect`, or business logic mixed with UI.

Place hooks in a `hooks/` subdirectory or alongside the component as `use-<feature>.ts`.

```typescript
// Before: Complex state logic in component
const Settings: FC = () => {
  const [config, setConfig] = useState<Config>(...)
  const [preferences, setPreferences] = useState<Preferences>(...)
  const [isLoading, setIsLoading] = useState(false)
  
  // 50+ lines of state management logic...
  
  return <div>...</div>
}

// After: Extract to custom hook
// hooks/use-settings.ts
export const useSettings = (userId: string) => {
  const [config, setConfig] = useState<Config>(...)
  const [preferences, setPreferences] = useState<Preferences>(...)
  const [isLoading, setIsLoading] = useState(false)
  
  // Related state management logic here
  
  return { config, setConfig, preferences, setPreferences, isLoading }
}

// Component becomes cleaner
const Settings: FC = () => {
  const { config, setConfig, preferences } = useSettings(userId)
  return <div>...</div>
}
```

### Pattern 2: Extract Sub-Components

**When**: Single component has multiple UI sections, conditional rendering blocks, or repeated patterns.

Place sub-components in subdirectories or as separate files in the same directory.

```typescript
// Before: Monolithic JSX with multiple sections
const Dashboard = () => {
  return (
    <div>
      {/* 100 lines of header UI */}
      {/* 100 lines of stats UI */}
      {/* 100 lines of activity feed */}
    </div>
  )
}

// After: Split into focused components
// dashboard/
//   ├── index.tsx           (orchestration only)
//   ├── dashboard-header.tsx
//   ├── dashboard-stats.tsx
//   └── dashboard-activity.tsx

const Dashboard = () => {
  return (
    <div>
      <DashboardHeader user={user} />
      <DashboardStats data={statsData} />
      <DashboardActivity items={activityItems} />
    </div>
  )
}
```

### Pattern 3: Simplify Conditional Logic

**When**: Deep nesting (> 3 levels), complex ternaries, or multiple `if/else` chains.

```typescript
// Before: Deeply nested conditionals
const Template = useMemo(() => {
  if (mode === ViewMode.EDIT) {
    switch (locale) {
      case 'zh':
        return <TemplateEditZh />
      case 'ja':
        return <TemplateEditJa />
      default:
        return <TemplateEditEn />
    }
  }
  if (mode === ViewMode.PREVIEW) {
    // Another 15 lines...
  }
  // More conditions...
}, [mode, locale])

// After: Use lookup tables + early returns
const TEMPLATE_MAP = {
  [ViewMode.EDIT]: {
    zh: TemplateEditZh,
    ja: TemplateEditJa,
    default: TemplateEditEn,
  },
  [ViewMode.PREVIEW]: {
    zh: TemplatePreviewZh,
    // ...
  },
}

const Template = useMemo(() => {
  const modeTemplates = TEMPLATE_MAP[mode]
  if (!modeTemplates) return null
  
  const TemplateComponent = modeTemplates[locale] || modeTemplates.default
  return <TemplateComponent data={data} />
}, [mode, locale])
```

### Pattern 4: Extract API/Data Logic

**When**: Component directly handles API calls, data transformation, or complex async operations.

Extract API calls into dedicated hooks. Follow your project's data-fetching conventions (React Query, SWR, Apollo, etc.).

```typescript
// Before: API logic mixed with component
const UserProfile = () => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [userId])
  
  // More fetch logic, transformations...
  
  return <div>...</div>
}

// After: Extract to data hook
const useUserProfile = (userId: string) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [userId])
  
  return { user, isLoading, error }
}

const UserProfile = () => {
  const { user, isLoading, error } = useUserProfile(userId)
  return <div>...</div>
}
```

### Pattern 5: Extract Modal/Dialog Management

**When**: Component manages multiple modals with complex open/close states.

```typescript
// Before: Multiple modal states in component
const ItemList = () => {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  // 5+ more modal states...
}

// After: Extract to modal management hook
type ModalType = 'edit' | 'delete' | 'share' | 'export' | null

const useItemModals = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  
  const openModal = useCallback((type: ModalType) => setActiveModal(type), [])
  const closeModal = useCallback(() => setActiveModal(null), [])
  
  return {
    activeModal,
    openModal,
    closeModal,
    isOpen: (type: ModalType) => activeModal === type,
  }
}
```

### Pattern 6: Extract Form Logic

**When**: Complex form validation, submission handling, or field transformation.

```typescript
// Before: Form logic mixed with UI
const SettingsForm = () => {
  const [values, setValues] = useState({ name: '', email: '' })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const validate = () => { /* 30 lines */ }
  const handleSubmit = () => { /* 40 lines */ }
  const handleChange = () => { /* 20 lines */ }
  
  return <form>...</form>
}

// After: Extract form logic to hook
const useSettingsForm = (initialValues: FormValues) => {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const validate = useCallback(() => { /* validation */ }, [values])
  const handleChange = useCallback((field, value) => { /* update */ }, [])
  const handleSubmit = useCallback(async (onSubmit) => { /* submit */ }, [values])
  
  return { values, errors, isSubmitting, handleChange, handleSubmit }
}

const SettingsForm = () => {
  const form = useSettingsForm({ name: '', email: '' })
  return <form>...</form>
}
```

## Refactoring Workflow

### Step 1: Assess Complexity

Read the component and evaluate using the base indicators and framework multipliers above.

### Step 2: Identify Applicable Patterns

Based on what you observe:

| Observation | Pattern to apply |
|-------------|------------------|
| Multiple related useState + useEffect | Extract custom hook |
| API calls in component | Extract data hook |
| Multiple modal states | Extract modal management |
| 300+ lines with distinct UI sections | Split into sub-components |
| Deep conditional nesting | Simplify with lookup tables |
| Complex form handling | Extract form hook |

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

## Common Mistakes to Avoid

### Over-Engineering

```typescript
// Too many tiny hooks
const useButtonText = () => useState('Click')
const useButtonDisabled = () => useState(false)
const useButtonLoading = () => useState(false)

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

## References

For detailed patterns with more examples, see:
- [Hook Extraction Patterns](references/hook-extraction.md)
- [Component Splitting Patterns](references/component-splitting.md)
- [Complexity Reduction Patterns](references/complexity-patterns.md)
