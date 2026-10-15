// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ThemeStudioRow } from '../../src/client/ThemeStudioRow.tsx'
import type { ThemeStudioRowComponentProps } from '../../src/client/ThemeStudioRow.tsx'
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
  {
    id: 'dsh-theme-studio.graphite',
    nameKey: 'graphite.name',
    descriptionKey: 'graphite.description',
    preview: {
      light: { background: '#e8eaed', surface: '#f4f5f6', foreground: '#2c3036', accent: '#5b6570' },
      dark: { background: '#1c1e22', surface: '#25282c', foreground: '#d5d8dc', accent: '#8b949e' },
    },
  },
  {
    id: 'dsh-theme-studio.nordic',
    nameKey: 'nordic.name',
    descriptionKey: 'nordic.description',
    preview: {
      light: { background: '#eceff4', surface: '#e5e9f0', foreground: '#2e3440', accent: '#5e81ac' },
      dark: { background: '#2e3440', surface: '#3b4252', foreground: '#eceff4', accent: '#88c0d0' },
    },
  },
]

const IMPORTED_CARD: ThemeStudioCard = {
  id: 'user.ocean',
  nameKey: 'user.ocean.name',
  descriptionKey: 'user.ocean.description',
  name: 'Ocean',
  description: 'Cool blue palette.',
  imported: true,
  preview: {
    light: { background: '#f4f8fb', surface: '#ffffff', foreground: '#1b2a3a', accent: '#2b6cb0' },
    dark: { background: '#101820', surface: '#1a2430', foreground: '#e6edf3', accent: '#63a4d8' },
  },
}

function createRowState(cards: readonly ThemeStudioCard[]) {
  let state: ThemeStudioRowState = {
    activeThemeId: null,
    previewThemeId: null,
    previewing: false,
    settingsStatus: 'ready',
    saveError: false,
    droppedImports: 0,
    revision: 0,
    cards: [...cards],
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

function mount(cards: readonly ThemeStudioCard[] = CARDS) {
  const store = createRowState(cards)
  const previewTheme = vi.fn()
  const activateTheme = vi.fn()
  const cancelPreview = vi.fn()
  const inspectThemeFile = vi.fn(() => ({ ok: false as const, error: { code: 'not-json' as const } }))
  const saveImportedTheme = vi.fn((source: Record<string, unknown>) => source['id'] as string)
  const removeImportedTheme = vi.fn()
  const exportTheme = vi.fn()
  const props: ThemeStudioRowComponentProps = {
    useSessions: (() => undefined) as never,
    useWorkspaces: (() => undefined) as never,
    useStore: bindSnapshotSelector(store),
    actions: store.actions as never,
    t: key => en[key] ?? key,
    previewTheme,
    activateTheme,
    cancelPreview,
    inspectThemeFile,
    saveImportedTheme,
    removeImportedTheme,
    exportTheme,
  }
  render(<ThemeStudioRow {...props} />)
  return { store, previewTheme, activateTheme, cancelPreview, inspectThemeFile, saveImportedTheme, removeImportedTheme, exportTheme }
}

function selector(name = 'Default') {
  return screen.getByRole('button', { name })
}

function option(name: string) {
  return screen.getByRole('menuitem', { name })
}

describe('ThemeStudioRow', () => {
  it('renders a collapsed selector pill showing the applied theme', () => {
    mount()
    expect(screen.getByText('Themes')).toBeDefined()
    const trigger = selector()
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()
    // The pill carries the applied theme's four-color swatch.
    const swatch = trigger.querySelector('div[aria-hidden="true"]')
    expect(swatch?.childElementCount).toBe(4)
  })

  it('opens the menu on click and marks only the applied theme selected', () => {
    mount()
    const trigger = selector()
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(option('Default').getAttribute('aria-selected')).toBe('true')
    expect(option('Graphite').getAttribute('aria-selected')).toBe('false')
    expect(option('Nordic').getAttribute('aria-selected')).toBe('false')
  })

  it('previews on option hover and restores when the menu closes', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.mouseEnter(within(option('Nordic')).getByText('Nordic'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
    expect(b.activateTheme).not.toHaveBeenCalled()
    fireEvent.pointerDown(document.body)
    expect(b.cancelPreview).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('cancels the preview when the selector toggles the menu closed', () => {
    const b = mount()
    const trigger = selector()
    fireEvent.click(trigger)
    fireEvent.mouseEnter(within(option('Nordic')).getByText('Nordic'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
    fireEvent.click(trigger)
    expect(b.cancelPreview).toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('cancels the preview when the row unmounts', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.mouseEnter(within(option('Nordic')).getByText('Nordic'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
    cleanup()
    expect(b.cancelPreview).toHaveBeenCalled()
  })

  it('restores the preview when Escape closes the menu', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.mouseEnter(within(option('Graphite')).getByText('Graphite'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.graphite')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(b.cancelPreview).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('restores the applied theme when the pointer leaves a theme row', () => {
    const b = mount()
    fireEvent.click(selector())
    const label = within(option('Nordic')).getByText('Nordic')
    fireEvent.mouseEnter(label)
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
    fireEvent.mouseLeave(label)
    expect(b.cancelPreview).toHaveBeenCalledOnce()
  })

  it.each(['Import theme…', 'Manage themes…'])('restores the applied theme when the pointer reaches %s', (name) => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.mouseEnter(within(option('Nordic')).getByText('Nordic'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
    fireEvent.mouseEnter(within(option(name)).getByText(name))
    expect(b.cancelPreview).toHaveBeenCalled()
  })

  it('cancels a live preview when a footer action is selected', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.mouseEnter(within(option('Nordic')).getByText('Nordic'))
    fireEvent.click(option('Manage themes…'))
    expect(b.cancelPreview).toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('applies the clicked theme and closes the menu', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.click(option('Nordic'))
    expect(b.activateTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('maps the Default option back to a null theme id', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.click(option('Default'))
    expect(b.activateTheme).toHaveBeenCalledWith(null)
  })

  it('announces the previewed name while keeping the applied theme in the selector', () => {
    const b = mount()
    act(() => {
      b.store.actions.sync({
        activeThemeId: 'dsh-theme-studio.graphite',
        previewThemeId: 'dsh-theme-studio.nordic',
        previewing: true,
        settingsStatus: 'ready',
        saveError: false,
        droppedImports: 0,
        revision: 1,
      })
    })
    expect(screen.getByText('Previewing Nordic')).toBeDefined()
    const trigger = selector('Graphite')
    // The swatch follows the applied theme, not the transient preview.
    const cells = trigger.querySelector('div[aria-hidden="true"]')?.children
    expect((cells?.[0] as HTMLElement | undefined)?.style.background).toBe('rgb(232, 234, 237)')
    fireEvent.click(trigger)
    expect(option('Graphite').getAttribute('aria-selected')).toBe('true')
    expect(option('Nordic').getAttribute('aria-selected')).toBe('false')
  })

  it('announces a rejected save while keeping the applied theme selected', () => {
    const b = mount()
    act(() => {
      b.store.actions.sync({
        activeThemeId: 'dsh-theme-studio.graphite',
        previewThemeId: null,
        previewing: false,
        settingsStatus: 'ready',
        saveError: true,
        droppedImports: 0,
        revision: 2,
      })
    })
    expect(screen.getByRole('alert').textContent).toContain('could not be saved')
    expect(selector('Graphite')).toBeDefined()
  })

  it('pins Import and Manage actions in the menu footer', () => {
    mount()
    fireEvent.click(selector())
    expect(option('Import theme…')).toBeDefined()
    expect(option('Manage themes…')).toBeDefined()
  })

  it('groups imported themes under an Imported label and shows the verbatim name', () => {
    mount([...CARDS, IMPORTED_CARD])
    fireEvent.click(selector())
    expect(screen.getByText('Imported')).toBeDefined()
    const item = option('Ocean')
    fireEvent.mouseEnter(within(item).getByText('Ocean'))
    // Option ids carry the theme id even when the label is a plain string.
    expect(item.getAttribute('aria-selected')).toBe('false')
  })

  it.each(['loading', 'unavailable'] as const)('disables import and manage while settings are %s', (settingsStatus) => {
    const b = mount()
    act(() => {
      b.store.actions.sync({
        activeThemeId: null,
        previewThemeId: null,
        previewing: false,
        settingsStatus,
        saveError: false,
        droppedImports: 0,
        revision: 3,
      })
    })
    fireEvent.click(selector())
    expect(option('Import theme…').getAttribute('disabled')).not.toBeNull()
    expect(option('Manage themes…').getAttribute('disabled')).not.toBeNull()
  })

  it('confirms a valid file before saving it', async () => {
    const b = mount()
    const source = { version: 1, id: 'user.ocean', name: 'Ocean', palette: { light: {}, dark: {} } }
    b.inspectThemeFile.mockReturnValue({
      ok: true,
      file: { version: 1, id: 'user.ocean', name: 'Ocean' },
      source,
      collision: null,
      summary: { failed: 0, unknown: 0 },
    } as never)
    fireEvent.click(selector())
    const input = document.querySelector('input[type="file"]')!
    fireEvent.change(input, { target: { files: [new File(['{}'], 'ocean.dsh-theme.json', { type: 'application/json' })] } })
    await screen.findByRole('dialog')
    expect(screen.getByRole('dialog').textContent).toContain('Ocean')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Import' }))
    expect(b.saveImportedTheme).toHaveBeenCalledWith(source, 'append')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each([null, 'imported'] as const)('blocks open import dialog writes while settings reload, collision=%s', async (collision) => {
    const b = mount([...CARDS, IMPORTED_CARD])
    b.inspectThemeFile.mockReturnValue({
      ok: true, file: { version: 1, id: 'user.ocean', name: 'Ocean' },
      source: { id: 'user.ocean' }, collision, summary: { failed: 0, unknown: 0 },
    } as never)
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [new File(['{}'], 'ocean.json')] },
    })
    const dialog = await screen.findByRole('dialog')
    act(() => {
      b.store.actions.sync({ ...b.store.getSnapshot(), settingsStatus: 'loading', revision: 1 })
    })
    const names = collision === null ? ['Import'] : ['Overwrite it', 'Keep both (new id)']
    for (const name of names) {
      const button = within(dialog).getByRole('button', { name })
      expect(button.getAttribute('disabled')).not.toBeNull()
      fireEvent.click(button)
    }
    expect(b.saveImportedTheme).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBe(dialog)
    act(() => {
      b.store.actions.sync({ ...b.store.getSnapshot(), settingsStatus: 'ready', revision: 2 })
    })
    fireEvent.click(within(dialog).getByRole('button', { name: names[0]! }))
    expect(b.saveImportedTheme).toHaveBeenCalledOnce()
  })

  it('shows the parse error when the file is rejected', async () => {
    const b = mount()
    fireEvent.click(selector())
    const input = document.querySelector('input[type="file"]')!
    fireEvent.change(input, { target: { files: [new File(['{'], 'bad.json')] } })
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('Cannot import theme')
    expect(b.saveImportedTheme).not.toHaveBeenCalled()
  })

  it('offers overwrite or rename when the id already belongs to an imported theme', async () => {
    const b = mount([...CARDS, IMPORTED_CARD])
    const source = { version: 1, id: 'user.ocean', name: 'Ocean 2' }
    b.inspectThemeFile.mockReturnValue({
      ok: true,
      file: { version: 1, id: 'user.ocean', name: 'Ocean 2' },
      source,
      collision: 'imported',
      summary: { failed: 0, unknown: 0 },
    } as never)
    fireEvent.click(selector())
    const input = document.querySelector('input[type="file"]')!
    fireEvent.change(input, { target: { files: [new File(['{}'], 'ocean.json')] } })
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('user.ocean')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Overwrite it' }))
    expect(b.saveImportedTheme).toHaveBeenCalledWith(source, 'replace')
  })

  it('lets the duplicate dialog keep both themes under a new id', async () => {
    const b = mount([...CARDS, IMPORTED_CARD])
    const source = { version: 1, id: 'user.ocean', name: 'Ocean 2' }
    b.inspectThemeFile.mockReturnValue({
      ok: true,
      file: { version: 1, id: 'user.ocean', name: 'Ocean 2' },
      source,
      collision: 'imported',
      summary: { failed: 0, unknown: 0 },
    } as never)
    fireEvent.click(selector())
    const input = document.querySelector('input[type="file"]')!
    fireEvent.change(input, { target: { files: [new File(['{}'], 'ocean.json')] } })
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep both (new id)' }))
    expect(b.saveImportedTheme).toHaveBeenCalledWith(source, 'rename')
  })

  it('lists builtin and imported themes in the manage dialog with export and remove', () => {
    const b = mount([...CARDS, IMPORTED_CARD])
    fireEvent.click(selector())
    fireEvent.click(option('Manage themes…'))
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Builtin')
    expect(dialog.textContent).toContain('Ocean')
    const oceanRow = within(dialog).getByText('user.ocean').parentElement!
    fireEvent.click(within(oceanRow).getByRole('button', { name: 'Export' }))
    expect(b.exportTheme).toHaveBeenCalledWith('user.ocean')
    fireEvent.click(within(oceanRow).getByRole('button', { name: 'Remove' }))
    expect(b.removeImportedTheme).toHaveBeenCalledWith('user.ocean')
    // Builtin rows export but never offer Remove.
    const nordicRow = within(dialog).getByText('dsh-theme-studio.nordic').parentElement!
    expect(within(nordicRow).queryByRole('button', { name: 'Remove' })).toBeNull()
    fireEvent.click(within(nordicRow).getByRole('button', { name: 'Export' }))
    expect(b.exportTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
  })
})
