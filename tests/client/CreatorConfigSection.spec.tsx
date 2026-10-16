// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CreatorConfigSection } from '../../src/client/CreatorConfigSection.tsx'
import type { CreatorConfigSectionProps } from '../../src/client/CreatorConfigSection.tsx'
import type { ThemeStudioCard, ThemeStudioRowState } from '../../src/client/store.ts'
import { DEFAULT_PREVIEW } from '../../src/client/presets.ts'
import { en } from '../../src/client/locales.ts'
import { bindSnapshotSelector } from '../harness.ts'

afterEach(cleanup)

const CARDS: ThemeStudioCard[] = [
  {
    id: null,
    nameKey: 'default.name',
    descriptionKey: 'default.description',
    preview: DEFAULT_PREVIEW,
  },
]

function createSectionState(overrides: Partial<ThemeStudioRowState> = {}) {
  let state: ThemeStudioRowState = {
    activeThemeId: null,
    previewThemeId: null,
    previewing: false,
    settingsStatus: 'ready',
    saveError: false,
    droppedImports: 0,
    creatorMode: 'gesture',
    revision: 0,
    cards: [...CARDS],
    ...overrides,
  }
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    actions: {
      sync: (snapshot: Omit<ThemeStudioRowState, 'cards'>) => {
        if (snapshot.revision <= state.revision) return
        state = { ...state, ...snapshot, cards: state.cards }
        for (const listener of [...listeners]) listener()
      },
      setCards: (next: readonly ThemeStudioCard[]) => {
        state = { ...state, cards: [...next] }
        for (const listener of [...listeners]) listener()
      },
    },
  }
}

function mount(overrides: Partial<ThemeStudioRowState> = {}) {
  const store = createSectionState(overrides)
  const setCreatorMode = vi.fn()
  const props: CreatorConfigSectionProps = {
    view: 'page',
    useSessions: (() => undefined) as never,
    useWorkspaces: (() => undefined) as never,
    useStore: bindSnapshotSelector(store),
    actions: store.actions as never,
    t: key => en[key] ?? key,
    setCreatorMode,
  }
  render(<CreatorConfigSection {...props} />)
  return { store, setCreatorMode }
}

function sync(store: ReturnType<typeof createSectionState>, next: Partial<ThemeStudioRowState>): void {
  const snapshot = store.getSnapshot()
  store.actions.sync({ ...snapshot, ...next, revision: snapshot.revision + 1 })
}

describe('CreatorConfigSection', () => {
  it('renders the stored mode on the selector and writes the chosen menu item', () => {
    const b = mount({ creatorMode: 'gesture' })
    const pill = screen.getByRole('button', { name: /Gesture/ }) as HTMLButtonElement
    expect(pill.getAttribute('aria-haspopup')).toBe('menu')
    fireEvent.click(pill)
    const catalog = screen.getByRole('menuitem', { name: 'Catalog' })
    fireEvent.click(catalog)
    expect(b.setCreatorMode).toHaveBeenCalledWith('catalog')
    expect(screen.getByText(/\/dsh-theme-creator/)).toBeDefined()
  })

  it.each(['loading', 'unavailable'] as const)('disables the control while settings are %s', (settingsStatus) => {
    mount({ settingsStatus })
    // The pill must not claim a stored mode before the accepted snapshot
    // arrives: `creatorMode` inits to 'off', which is not what a default
    // (gesture) host has saved.
    const pill = screen.getByRole('button') as HTMLButtonElement
    expect(pill.disabled).toBe(true)
    expect(pill.textContent).toBe(settingsStatus === 'loading' ? 'Loading…' : 'Unavailable')
    expect(screen.queryByText(/\/dsh-theme-creator/)).toBeNull()
  })

  it.each(['loading', 'unavailable'] as const)('keeps an open menu closed through a %s detour', (settingsStatus) => {
    const b = mount()
    const pill = screen.getByRole('button', { name: /Gesture/ }) as HTMLButtonElement
    fireEvent.click(pill)
    expect(pill.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('menuitem', { name: 'Catalog' })).toBeDefined()
    act(() => { sync(b.store, { settingsStatus }) })
    expect(pill.disabled).toBe(true)
    expect(pill.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menuitem')).toBeNull()
    act(() => { sync(b.store, { settingsStatus: 'ready' }) })
    expect(pill.disabled).toBe(false)
    expect(pill.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menuitem')).toBeNull()
  })

  it('surfaces a rejected write next to the selector', () => {
    const b = mount()
    expect(screen.queryByRole('alert')).toBeNull()
    act(() => { sync(b.store, { saveError: true }) })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe(en['status.saveFailed'])
  })

  it('renders nothing for a non-page view', () => {
    const store = createSectionState()
    const { container } = render(
      <CreatorConfigSection
        view={'summary' as never}
        useSessions={(() => undefined) as never}
        useWorkspaces={(() => undefined) as never}
        useStore={bindSnapshotSelector(store)}
        actions={store.actions as never}
        t={key => en[key] ?? key}
        setCreatorMode={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
