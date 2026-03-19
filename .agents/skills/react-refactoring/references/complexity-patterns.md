# Complexity Reduction Patterns

Patterns for reducing cognitive complexity in React components.

## Table of Contents

- [Understand Complexity](#understand-complexity) (cognitive complexity scoring)
- [Pattern 1: Replace Conditionals with Lookup Tables](#pattern-1-replace-conditionals-with-lookup-tables)
- [Pattern 2: Use Early Returns](#pattern-2-use-early-returns)
- [Pattern 3: Extract Complex Conditions](#pattern-3-extract-complex-conditions)
- [Pattern 4: Replace Chained Ternaries](#pattern-4-replace-chained-ternaries)
- [Pattern 5: Flatten Nested Loops](#pattern-5-flatten-nested-loops)
- [Pattern 6: Extract Event Handler Logic](#pattern-6-extract-event-handler-logic)
- [Pattern 7: Reduce Boolean Logic Complexity](#pattern-7-reduce-boolean-logic-complexity)
- [Pattern 8: Simplify useMemo/useCallback Dependencies](#pattern-8-simplify-usememousecallback-dependencies)
- [Target Metrics After Refactoring](#target-metrics-after-refactoring)

## Understand Complexity

### Cognitive Complexity

Cognitive complexity measures how difficult code is to understand. It considers:

- **Total Complexity**: Sum of all functions' complexity in the file
- **Max Complexity**: Highest single function complexity

### What Increases Complexity

| Pattern | Complexity Impact |
|---------|-------------------|
| `if/else` | +1 per branch |
| Nested conditions | +1 per nesting level |
| `switch/case` | +1 per case |
| `for/while/do` | +1 per loop |
| `&&`/`||` chains | +1 per operator |
| Nested callbacks | +1 per nesting level |
| `try/catch` | +1 per catch |
| Ternary expressions | +1 per nesting |

## Pattern 1: Replace Conditionals with Lookup Tables

**Before** (complexity: ~15):

```typescript
const Template = useMemo(() => {
  if (mode === ViewMode.EDIT) {
    switch (locale) {
      case 'zh':
        return <TemplateEditZh data={data} />
      case 'ja':
        return <TemplateEditJa data={data} />
      default:
        return <TemplateEditEn data={data} />
    }
  }
  if (mode === ViewMode.PREVIEW) {
    switch (locale) {
      case 'zh':
        return <TemplatePreviewZh data={data} />
      case 'ja':
        return <TemplatePreviewJa data={data} />
      default:
        return <TemplatePreviewEn data={data} />
    }
  }
  if (mode === ViewMode.READONLY) {
    // Similar pattern...
  }
  return null
}, [mode, locale])
```

**After** (complexity: ~3):

```typescript
// Define lookup table outside component
const TEMPLATE_MAP: Record<ViewMode, Record<string, FC<TemplateProps>>> = {
  [ViewMode.EDIT]: {
    zh: TemplateEditZh,
    ja: TemplateEditJa,
    default: TemplateEditEn,
  },
  [ViewMode.PREVIEW]: {
    zh: TemplatePreviewZh,
    ja: TemplatePreviewJa,
    default: TemplatePreviewEn,
  },
  [ViewMode.READONLY]: {
    zh: TemplateReadonlyZh,
    ja: TemplateReadonlyJa,
    default: TemplateReadonlyEn,
  },
}

// Clean component logic
const Template = useMemo(() => {
  if (!mode) return null
  
  const templates = TEMPLATE_MAP[mode]
  if (!templates) return null
  
  const TemplateComponent = templates[locale] ?? templates.default
  return <TemplateComponent data={data} />
}, [mode, locale])
```

## Pattern 2: Use Early Returns

**Before** (complexity: ~10):

```typescript
const handleSubmit = () => {
  if (isValid) {
    if (hasChanges) {
      if (isConnected) {
        submitData()
      } else {
        showConnectionError()
      }
    } else {
      showNoChangesMessage()
    }
  } else {
    showValidationError()
  }
}
```

**After** (complexity: ~4):

```typescript
const handleSubmit = () => {
  if (!isValid) {
    showValidationError()
    return
  }
  
  if (!hasChanges) {
    showNoChangesMessage()
    return
  }
  
  if (!isConnected) {
    showConnectionError()
    return
  }
  
  submitData()
}
```

## Pattern 3: Extract Complex Conditions

**Before** (complexity: high):

```typescript
const canPublish = (() => {
  if (mode !== ViewMode.EDIT) {
    if (!isAdvancedMode)
      return true

    if (editorType === EditorType.RICH) {
      if (!hasRequiredFields.title || !hasRequiredFields.content)
        return false
      return true
    }
    return true
  }
  return !contentEmpty
})()
```

**After** (complexity: lower):

```typescript
// Extract to named functions
const canPublishInEditMode = () => !contentEmpty

const canPublishInOtherModes = () => {
  if (!isAdvancedMode) return true
  if (editorType !== EditorType.RICH) return true
  return hasRequiredFields.title && hasRequiredFields.content
}

// Clean main logic
const canPublish = mode === ViewMode.EDIT
  ? canPublishInEditMode()
  : canPublishInOtherModes()
```

## Pattern 4: Replace Chained Ternaries

**Before** (complexity: ~5):

```typescript
const statusText = isActive
  ? t('status.active')
  : isPending
    ? t('status.pending')
    : isArchived
      ? t('status.archived')
      : t('status.unknown')
```

**After** (complexity: ~2):

```typescript
const getStatusText = () => {
  if (isActive) return t('status.active')
  if (isPending) return t('status.pending')
  if (isArchived) return t('status.archived')
  return t('status.unknown')
}

const statusText = getStatusText()
```

Or use lookup:

```typescript
const STATUS_TEXT_MAP = {
  active: 'status.active',
  pending: 'status.pending',
  archived: 'status.archived',
  unknown: 'status.unknown',
} as const

const getStatusKey = (): keyof typeof STATUS_TEXT_MAP => {
  if (isActive) return 'active'
  if (isPending) return 'pending'
  if (isArchived) return 'archived'
  return 'unknown'
}

const statusText = t(STATUS_TEXT_MAP[getStatusKey()])
```

## Pattern 5: Flatten Nested Loops

**Before** (complexity: high):

```typescript
const processData = (items: Item[]) => {
  const results: ProcessedItem[] = []
  
  for (const item of items) {
    if (item.isValid) {
      for (const child of item.children) {
        if (child.isActive) {
          for (const prop of child.properties) {
            if (prop.value !== null) {
              results.push({
                itemId: item.id,
                childId: child.id,
                propValue: prop.value,
              })
            }
          }
        }
      }
    }
  }
  
  return results
}
```

**After** (complexity: lower):

```typescript
// Use functional approach
const processData = (items: Item[]) => {
  return items
    .filter(item => item.isValid)
    .flatMap(item =>
      item.children
        .filter(child => child.isActive)
        .flatMap(child =>
          child.properties
            .filter(prop => prop.value !== null)
            .map(prop => ({
              itemId: item.id,
              childId: child.id,
              propValue: prop.value,
            }))
        )
    )
}
```

## Pattern 6: Extract Event Handler Logic

**Before** (complexity: high in component):

```typescript
const Component = () => {
  const handleSelect = (data: Item[]) => {
    if (isEqual(data.map(item => item.id), items.map(item => item.id))) {
      hideSelector()
      return
    }

    onChangeDispatcher()
    let newItems = data
    if (data.find(item => !item.name)) {
      const newSelected = produce(data, (draft) => {
        data.forEach((item, index) => {
          if (!item.name) {
            const existing = items.find(i => i.id === item.id)
            if (existing)
              draft[index] = existing
          }
        })
      })
      setItems(newSelected)
      newItems = newSelected
    }
    else {
      setItems(data)
    }
    hideSelector()
    
    // 40 more lines of logic...
  }
  
  return <div>...</div>
}
```

**After** (complexity: lower):

```typescript
// Extract to hook or utility
const useItemSelection = (items: Item[], setItems: SetState<Item[]>) => {
  const normalizeSelection = (data: Item[]) => {
    const hasUnloadedItem = data.some(item => !item.name)
    if (!hasUnloadedItem) return data
    
    return produce(data, (draft) => {
      data.forEach((item, index) => {
        if (!item.name) {
          const existing = items.find(i => i.id === item.id)
          if (existing) draft[index] = existing
        }
      })
    })
  }
  
  const hasSelectionChanged = (newData: Item[]) => {
    return !isEqual(
      newData.map(item => item.id),
      items.map(item => item.id)
    )
  }
  
  return { normalizeSelection, hasSelectionChanged }
}

// Component becomes cleaner
const Component = () => {
  const { normalizeSelection, hasSelectionChanged } = useItemSelection(items, setItems)
  
  const handleSelect = (data: Item[]) => {
    if (!hasSelectionChanged(data)) {
      hideSelector()
      return
    }
    
    onChangeDispatcher()
    const normalized = normalizeSelection(data)
    setItems(normalized)
    hideSelector()
  }
  
  return <div>...</div>
}
```

## Pattern 7: Reduce Boolean Logic Complexity

**Before** (complexity: ~8):

```typescript
const buttonDisabled = hasInsufficientPermissions
  || isArchived
  || missingRequiredData
  || featureDisabled
  || (isAdvancedMode && !advancedConfig?.ready)
  || (isBasicMode && !basicConfig.initialized)
```

**After** (complexity: ~3):

```typescript
// Extract meaningful boolean functions
const isConfigReady = () => {
  if (isAdvancedMode) return !!advancedConfig?.ready
  return !!basicConfig.initialized
}

const hasRequiredPermissions = () => {
  return isEditor && !hasInsufficientPermissions
}

const canInteract = () => {
  if (!hasRequiredPermissions()) return false
  if (!isConfigReady()) return false
  if (missingRequiredData) return false
  if (featureDisabled) return false
  return true
}

const buttonDisabled = !canInteract()
```

## Pattern 8: Simplify useMemo/useCallback Dependencies

**Before** (complexity: multiple recalculations):

```typescript
const payload = useMemo(() => {
  let parameters: Parameter[] = []
  let outputParameters: OutputParameter[] = []

  if (!isPublished) {
    parameters = (inputs || []).map((item) => ({
      name: item.variable,
      description: '',
      form: 'default',
      required: item.required,
      type: item.type,
    }))
    outputParameters = (outputs || []).map((item) => ({
      name: item.variable,
      description: '',
      type: item.valueType,
    }))
  }
  else if (detail && detail.config) {
    parameters = (inputs || []).map((item) => ({
      // Complex transformation...
    }))
    outputParameters = (outputs || []).map((item) => ({
      // Complex transformation...
    }))
  }
  
  return {
    icon: detail?.icon || icon,
    label: detail?.label || name,
    // ...more fields
  }
}, [detail, isPublished, itemId, icon, name, description, inputs, outputs])
```

**After** (complexity: separated concerns):

```typescript
// Separate transformations
const useParameterTransform = (inputs: InputVar[], detail?: ItemDetail, isPublished?: boolean) => {
  return useMemo(() => {
    if (!isPublished) {
      return inputs.map(item => ({
        name: item.variable,
        description: '',
        form: 'default',
        required: item.required,
        type: item.type,
      }))
    }
    
    if (!detail?.config) return []
    
    return inputs.map(item => ({
      name: item.variable,
      required: item.required,
      type: item.type === 'paragraph' ? 'string' : item.type,
      description: detail.config.parameters.find(p => p.name === item.variable)?.description || '',
      form: detail.config.parameters.find(p => p.name === item.variable)?.form || 'default',
    }))
  }, [inputs, detail, isPublished])
}

// Component uses hook
const parameters = useParameterTransform(inputs, detail, isPublished)
const outputParameters = useOutputTransform(outputs, detail, isPublished)

const payload = useMemo(() => ({
  icon: detail?.icon || icon,
  label: detail?.label || name,
  parameters,
  outputParameters,
}), [detail, icon, name, parameters, outputParameters])
```

## Target Metrics After Refactoring

| Metric | Target |
|--------|--------|
| Total Complexity | < 50 |
| Max Function Complexity | < 30 |
| Function Length | < 30 lines |
| Nesting Depth | ≤ 3 levels |
| Conditional Chains | ≤ 3 conditions |
