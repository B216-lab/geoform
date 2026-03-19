# Component Splitting Patterns

Detailed guidance on splitting large components into smaller, focused components.

## When to Split Components

Split a component when you identify:

1. **Multiple UI sections** - Distinct visual areas with minimal coupling that can be composed independently
2. **Conditional rendering blocks** - Large `{condition && <JSX />}` blocks
3. **Repeated patterns** - Similar UI structures used multiple times
4. **300+ lines** - Component exceeds manageable size
5. **Modal clusters** - Multiple modals rendered in one component

## Splitting Strategies

### Strategy 1: Section-Based Splitting

Identify visual sections and extract each as a component.

```typescript
// Before: Monolithic component (500+ lines)
const SettingsPage = () => {
  return (
    <div>
      {/* Header Section - 50 lines */}
      <div className="header">
        <h1>{t('settings.title')}</h1>
        <div className="actions">
          {isAdvancedMode && <Badge>Advanced</Badge>}
          <PreferencesModal ... />
          <SaveButton ... />
        </div>
      </div>
      
      {/* Content Section - 200 lines */}
      <div className="content">
        <SettingsForm />
      </div>
      
      {/* Preview Section - 150 lines */}
      <div className="preview">
        <Preview ... />
      </div>
      
      {/* Modals Section - 100 lines */}
      {showConfirmModal && <ConfirmModal ... />}
      {showHistoryModal && <HistoryModal ... />}
      {showResetConfirm && <ResetConfirm ... />}
    </div>
  )
}

// After: Split into focused components
// settings/
//   ├── index.tsx              (orchestration)
//   ├── settings-header.tsx
//   ├── settings-content.tsx
//   ├── settings-preview.tsx
//   └── settings-modals.tsx

// settings-header.tsx
interface SettingsHeaderProps {
  isAdvancedMode: boolean
  onSave: () => void
}

const SettingsHeader: FC<SettingsHeaderProps> = ({
  isAdvancedMode,
  onSave,
}) => {
  const { t } = useTranslation()
  
  return (
    <div className="header">
      <h1>{t('settings.title')}</h1>
      <div className="actions">
        {isAdvancedMode && <Badge>Advanced</Badge>}
        <PreferencesModal ... />
        <SaveButton onSave={onSave} />
      </div>
    </div>
  )
}

// index.tsx (orchestration only)
const SettingsPage = () => {
  const { config, setConfig } = useSettings()
  const { activeModal, openModal, closeModal } = useModalState()
  
  return (
    <div>
      <SettingsHeader
        isAdvancedMode={isAdvancedMode}
        onSave={handleSave}
      />
      <SettingsContent
        config={config}
        onConfigChange={setConfig}
      />
      {!isMobile && (
        <SettingsPreview
          data={previewData}
          onRefresh={handleRefresh}
        />
      )}
      <SettingsModals
        activeModal={activeModal}
        onClose={closeModal}
      />
    </div>
  )
}
```

### Strategy 2: Conditional Block Extraction

Extract large conditional rendering blocks.

```typescript
// Before: Large conditional blocks
const ItemDetail = () => {
  return (
    <div>
      {isExpanded ? (
        <div className="expanded">
          {/* 100 lines of expanded view */}
        </div>
      ) : (
        <div className="collapsed">
          {/* 50 lines of collapsed view */}
        </div>
      )}
    </div>
  )
}

// After: Separate view components
const ItemDetailExpanded: FC<ItemDetailViewProps> = ({ item, onAction }) => {
  return (
    <div className="expanded">
      {/* Clean, focused expanded view */}
    </div>
  )
}

const ItemDetailCollapsed: FC<ItemDetailViewProps> = ({ item, onAction }) => {
  return (
    <div className="collapsed">
      {/* Clean, focused collapsed view */}
    </div>
  )
}

const ItemDetail = () => {
  return (
    <div>
      {isExpanded
        ? <ItemDetailExpanded item={item} onAction={handleAction} />
        : <ItemDetailCollapsed item={item} onAction={handleAction} />
      }
    </div>
  )
}
```

### Strategy 3: Modal Extraction

Extract modals with their trigger logic.

```typescript
// Before: Multiple modals in one component
const ItemList = () => {
  const [showEdit, setShowEdit] = useState(false)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showShare, setShowShare] = useState(false)
  
  const onEdit = async (data) => { /* 20 lines */ }
  const onDuplicate = async (data) => { /* 20 lines */ }
  const onDelete = async () => { /* 15 lines */ }
  
  return (
    <div>
      {/* Main content */}
      
      {showEdit && <EditModal onConfirm={onEdit} onClose={() => setShowEdit(false)} />}
      {showDuplicate && <DuplicateModal onConfirm={onDuplicate} onClose={() => setShowDuplicate(false)} />}
      {showDelete && <DeleteConfirm onConfirm={onDelete} onClose={() => setShowDelete(false)} />}
      {showShare && <ShareModal ... />}
    </div>
  )
}

// After: Modal manager component
// item-list-modals.tsx
type ModalType = 'edit' | 'duplicate' | 'delete' | 'share' | null

interface ItemListModalsProps {
  item: Item
  activeModal: ModalType
  onClose: () => void
  onSuccess: () => void
}

const ItemListModals: FC<ItemListModalsProps> = ({
  item,
  activeModal,
  onClose,
  onSuccess,
}) => {
  const handleEdit = async (data) => { /* logic */ }
  const handleDuplicate = async (data) => { /* logic */ }
  const handleDelete = async () => { /* logic */ }

  return (
    <>
      {activeModal === 'edit' && (
        <EditModal
          item={item}
          onConfirm={handleEdit}
          onClose={onClose}
        />
      )}
      {activeModal === 'duplicate' && (
        <DuplicateModal
          item={item}
          onConfirm={handleDuplicate}
          onClose={onClose}
        />
      )}
      {activeModal === 'delete' && (
        <DeleteConfirm
          onConfirm={handleDelete}
          onClose={onClose}
        />
      )}
      {activeModal === 'share' && (
        <ShareModal
          item={item}
          onClose={onClose}
        />
      )}
    </>
  )
}

// Parent component
const ItemList = () => {
  const { activeModal, openModal, closeModal } = useModalState()
  
  return (
    <div>
      {/* Main content with openModal triggers */}
      <Button onClick={() => openModal('edit')}>Edit</Button>
      
      <ItemListModals
        item={selectedItem}
        activeModal={activeModal}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
```

### Strategy 4: List Item Extraction

Extract repeated item rendering.

```typescript
// Before: Inline item rendering
const ActionList = () => {
  return (
    <div>
      {actions.map(action => (
        <div key={action.id} className="action-item">
          <span className="icon">{action.icon}</span>
          <span className="title">{action.title}</span>
          <span className="description">{action.description}</span>
          <button onClick={() => action.onClick()}>
            {action.actionLabel}
          </button>
          {action.badge && <Badge>{action.badge}</Badge>}
          {/* More complex rendering... */}
        </div>
      ))}
    </div>
  )
}

// After: Extracted item component
interface ActionItemProps {
  action: Action
  onExecute: (id: string) => void
}

const ActionItem: FC<ActionItemProps> = ({ action, onExecute }) => {
  return (
    <div className="action-item">
      <span className="icon">{action.icon}</span>
      <span className="title">{action.title}</span>
      <span className="description">{action.description}</span>
      <button onClick={() => onExecute(action.id)}>
        {action.actionLabel}
      </button>
      {action.badge && <Badge>{action.badge}</Badge>}
    </div>
  )
}

const ActionList = () => {
  const handleExecute = useCallback((id: string) => {
    const action = actions.find(a => a.id === id)
    action?.onClick()
  }, [actions])

  return (
    <div>
      {actions.map(action => (
        <ActionItem
          key={action.id}
          action={action}
          onExecute={handleExecute}
        />
      ))}
    </div>
  )
}
```

## Directory Structure Patterns

### Pattern A: Flat Structure (Simple Components)

For components with 2-3 sub-components:

```
component-name/
  ├── index.tsx           # Main component
  ├── sub-component-a.tsx
  ├── sub-component-b.tsx
  └── types.ts            # Shared types
```

### Pattern B: Nested Structure (Complex Components)

For components with many sub-components:

```
component-name/
  ├── index.tsx           # Main orchestration
  ├── types.ts            # Shared types
  ├── hooks/
  │   ├── use-feature-a.ts
  │   └── use-feature-b.ts
  ├── components/
  │   ├── header/
  │   │   └── index.tsx
  │   ├── content/
  │   │   └── index.tsx
  │   └── modals/
  │       └── index.tsx
  └── utils/
      └── helpers.ts
```

### Pattern C: Feature-Based Structure

For feature-rich page components:

```
dashboard/
  ├── index.tsx           # Main page component
  ├── base/               # Base/shared components
  │   ├── stat-card/
  │   ├── section-header/
  │   └── action-button/
  ├── overview/           # Overview section
  │   ├── index.tsx
  │   ├── metrics/
  │   └── charts/
  ├── activity/           # Activity section
  │   ├── index.tsx
  │   ├── feed-item/
  │   └── filters/
  ├── settings/           # Settings section
  │   ├── index.tsx
  │   └── preferences/
  └── hooks/              # Shared hooks
      └── use-dashboard-data.ts
```

## Props Design

### Minimal Props Principle

Pass only what's needed:

```typescript
// Bad: Passing entire objects when only some fields needed
<SettingsHeader userData={userData} config={config} />

// Good: Destructure to minimum required
<SettingsHeader
  userName={userData.name}
  isAdvancedMode={config.isAdvanced}
  onSave={handleSave}
/>
```

### Callback Props Pattern

Use callbacks for child-to-parent communication:

```typescript
// Parent
const Parent = () => {
  const [value, setValue] = useState('')
  
  return (
    <Child
      value={value}
      onChange={setValue}
      onSubmit={handleSubmit}
    />
  )
}

// Child
interface ChildProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

const Child: FC<ChildProps> = ({ value, onChange, onSubmit }) => {
  return (
    <div>
      <input value={value} onChange={e => onChange(e.target.value)} />
      <button onClick={onSubmit}>Submit</button>
    </div>
  )
}
```

### Render Props for Flexibility

When sub-components need parent context:

```typescript
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  renderEmpty?: () => React.ReactNode
}

function List<T>({ items, renderItem, renderEmpty }: ListProps<T>) {
  if (items.length === 0 && renderEmpty) {
    return <>{renderEmpty()}</>
  }
  
  return (
    <div>
      {items.map((item, index) => renderItem(item, index))}
    </div>
  )
}

// Usage
<List
  items={actions}
  renderItem={(action, i) => <ActionItem key={i} action={action} />}
  renderEmpty={() => <EmptyState message="No actions" />}
/>
```
