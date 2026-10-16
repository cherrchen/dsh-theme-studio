// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

function mount(
  creatorMode: ThemeStudioRowState['creatorMode'] = 'gesture',
  settingsStatus: ThemeStudioRowState['settingsStatus'] = 'ready',
) {
  const state: ThemeStudioRowState = {
    activeThemeId: null,
    previewThemeId: null,
    previewing: false,
    settingsStatus,
    saveError: false,
    droppedImports: 0,
    creatorMode,
    revision: 0,
    cards: [...CARDS],
  }
  const setCreatorMode = vi.fn()
  const props: CreatorConfigSectionProps = {
    view: 'page',
    useSessions: (() => undefined) as never,
    useWorkspaces: (() => undefined) as never,
    useStore: bindSnapshotSelector({ getSnapshot: () => state, subscribe: () => () => {} }),
    actions: {} as never,
    t: key => en[key] ?? key,
    setCreatorMode,
  }
  render(<CreatorConfigSection {...props} />)
  return { setCreatorMode }
}

describe('CreatorConfigSection', () => {
  it('renders the stored mode on the selector and writes the chosen menu item', () => {
    const b = mount('gesture')
    const pill = screen.getByRole('button', { name: /Gesture/ }) as HTMLButtonElement
    expect(pill.getAttribute('aria-haspopup')).toBe('menu')
    fireEvent.click(pill)
    const catalog = screen.getByRole('menuitem', { name: 'Catalog' })
    fireEvent.click(catalog)
    expect(b.setCreatorMode).toHaveBeenCalledWith('catalog')
    expect(screen.getByText(/\/dsh-theme-creator/)).toBeDefined()
  })

  it.each(['loading', 'unavailable'] as const)('disables the control while settings are %s', (settingsStatus) => {
    mount('gesture', settingsStatus)
    expect((screen.getByRole('button', { name: /Gesture/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders nothing for a non-page view', () => {
    const state: ThemeStudioRowState = {
      activeThemeId: null, previewThemeId: null, previewing: false, settingsStatus: 'ready',
      saveError: false, droppedImports: 0, creatorMode: 'gesture', revision: 0, cards: [],
    }
    const { container } = render(
      <CreatorConfigSection
        view={'summary' as never}
        useSessions={(() => undefined) as never}
        useWorkspaces={(() => undefined) as never}
        useStore={bindSnapshotSelector({ getSnapshot: () => state, subscribe: () => () => {} })}
        actions={{} as never}
        t={key => en[key] ?? key}
        setCreatorMode={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
