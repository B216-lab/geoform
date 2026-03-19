# Hook Extraction Patterns

Detailed guidance on extracting custom hooks from complex React components.

## Table of Contents

- [When to Extract Hooks](#when-to-extract-hooks)
- [Follow the Extraction Process](#follow-the-extraction-process) (Steps 1-4: identify state groups, related effects, create hook, update component)
- [Follow Naming Conventions](#follow-naming-conventions) (hooks, files, return types)
- [Common Hook Patterns](#common-hook-patterns) (data fetching, form state, modal state, toggle/boolean)
- [Test Extracted Hooks](#test-extracted-hooks)

## When to Extract Hooks

Extract a custom hook when you identify:

1. **Coupled state groups** - Multiple `useState` hooks that are always used together
2. **Complex effects** - `useEffect` with multiple dependencies or cleanup logic
3. **Business logic** - Data transformations, validations, or calculations
4. **Reusable patterns** - Logic that appears in multiple components

## Follow the Extraction Process

### Step 1: Identify State Groups

Look for state variables that are logically related:

```typescript
// These belong together - extract to hook
const [formConfig, setFormConfig] = useState<FormConfig>(...)
const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
const [editorMode, setEditorMode] = useState<EditorMode>(...)

// These are form-related state that should be in useFormConfig()
```

### Step 2: Identify Related Effects

Find effects that modify the grouped state:

```typescript
// These effects belong with the state above
useEffect(() => {
  if (hasFetchedData && !editorMode) {
    const mode = currentItem?.properties.mode
    if (mode) {
      const newConfig = produce(formConfig, (draft) => {
        draft.mode = mode
      })
      setFormConfig(newConfig)
    }
  }
}, [itemList, hasFetchedData, editorMode, currentItem])
```

### Step 3: Create the Hook

```typescript
// hooks/use-form-config.ts
import type { FormConfig, FormValue, EditorMode } from '@/types'
import { produce } from 'immer'
import { useEffect, useState } from 'react'

interface UseFormConfigParams {
  initialConfig?: Partial<FormConfig>
  currentItem?: { properties?: { mode?: EditorMode } }
  hasFetchedData: boolean
}

interface UseFormConfigReturn {
  formConfig: FormConfig
  setFormConfig: (config: FormConfig) => void
  formValues: FormValue
  setFormValues: (values: FormValue) => void
  editorMode: EditorMode
}

export const useFormConfig = ({
  initialConfig,
  currentItem,
  hasFetchedData,
}: UseFormConfigParams): UseFormConfigReturn => {
  const [formConfig, setFormConfig] = useState<FormConfig>({
    provider: 'default',
    itemId: '',
    mode: EditorMode.unset,
    ...initialConfig,
  })
  
  const [formValues, setFormValues] = useState<FormValue>({})
  
  const editorMode = formConfig.mode

  useEffect(() => {
    if (hasFetchedData && !editorMode) {
      const mode = currentItem?.properties?.mode
      if (mode) {
        setFormConfig(produce(formConfig, (draft) => {
          draft.mode = mode
        }))
      }
    }
  }, [hasFetchedData, editorMode, currentItem])

  return {
    formConfig,
    setFormConfig,
    formValues,
    setFormValues,
    editorMode,
  }
}
```

### Step 4: Update Component

```typescript
// Before: 50+ lines of state management
const Settings: FC = () => {
  const [formConfig, setFormConfig] = useState<FormConfig>(...)
  // ... lots of related state and effects
}

// After: Clean component
const Settings: FC = () => {
  const {
    formConfig,
    setFormConfig,
    formValues,
    setFormValues,
    editorMode,
  } = useFormConfig({
    currentItem,
    hasFetchedData,
  })
  
  // Component now focuses on UI
}
```

## Follow Naming Conventions

### Hook Names

- Use `use` prefix: `useFormConfig`, `useUserSettings`
- Be specific: `useAdvancedEditorConfig` not `useConfig`
- Include domain: `useWorkflowState`, `useAuthSession`

### File Names

- Kebab-case: `use-form-config.ts`
- Place in `hooks/` subdirectory when multiple hooks exist
- Place alongside component for single-use hooks

### Return Type Names

- Suffix with `Return`: `UseFormConfigReturn`
- Suffix params with `Params`: `UseFormConfigParams`

## Common Hook Patterns

### 1. Data Fetching Hooks

When extracting data fetching logic, follow your project's data-fetching patterns (React Query, SWR, Apollo, etc.).

```typescript
// Pattern: Data fetching with loading/error states
export const useUserData = (userId: string) => {
  const [data, setData] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetchUser(userId)
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [userId])

  return { data, isLoading, error }
}
```

### 2. Form State Hook

```typescript
// Pattern: Form state + validation + submission
export const useSettingsForm = (initialValues: FormValues) => {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    if (!values.name) newErrors.name = 'Name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [values])

  const handleChange = useCallback((field: string, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async (onSubmit: (values: FormValues) => Promise<void>) => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validate])

  return { values, errors, isSubmitting, handleChange, handleSubmit }
}
```

### 3. Modal State Hook

```typescript
// Pattern: Multiple modal management
type ModalType = 'edit' | 'delete' | 'duplicate' | null

export const useModalState = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [modalData, setModalData] = useState<any>(null)

  const openModal = useCallback((type: ModalType, data?: any) => {
    setActiveModal(type)
    setModalData(data)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
    setModalData(null)
  }, [])

  return {
    activeModal,
    modalData,
    openModal,
    closeModal,
    isOpen: useCallback((type: ModalType) => activeModal === type, [activeModal]),
  }
}
```

### 4. Toggle/Boolean Hook

```typescript
// Pattern: Boolean state with convenience methods
export const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => setValue(v => !v), [])
  const setTrue = useCallback(() => setValue(true), [])
  const setFalse = useCallback(() => setValue(false), [])

  return [value, { toggle, setTrue, setFalse, set: setValue }] as const
}

// Usage
const [isExpanded, { toggle, setTrue: expand, setFalse: collapse }] = useToggle()
```

## Test Extracted Hooks

After extraction, test hooks in isolation:

```typescript
// use-form-config.spec.ts
import { renderHook, act } from '@testing-library/react'
import { useFormConfig } from './use-form-config'

describe('useFormConfig', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFormConfig({
      hasFetchedData: false,
    }))

    expect(result.current.formConfig.provider).toBe('default')
    expect(result.current.editorMode).toBe(EditorMode.unset)
  })

  it('should update form config', () => {
    const { result } = renderHook(() => useFormConfig({
      hasFetchedData: true,
    }))

    act(() => {
      result.current.setFormConfig({
        ...result.current.formConfig,
        itemId: 'new-item',
      })
    })

    expect(result.current.formConfig.itemId).toBe('new-item')
  })
})
```
