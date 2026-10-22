// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ThemeStudioRow } from '../../src/client/ThemeStudioRow.tsx'
import type { ThemeStudioRowComponentProps } from '../../src/client/ThemeStudioRow.tsx'
import type { ThemeStudioCard, ThemeStudioRowState } from '../../src/client/store.ts'
import { DEFAULT_PREVIEW, BUILTIN_PRESETS } from '../../src/client/presets.ts'
import { createThemeEditorDraft } from '../../src/client/theme-editor.ts'
import { compileThemeFile, validateThemeFileData } from '../../src/client/theme-file.ts'
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

function createRowState(
  cards: readonly ThemeStudioCard[],
  creatorMode: ThemeStudioRowState['creatorMode'] = 'off',
  creatorAvailable = true,
) {
  let state: ThemeStudioRowState = {
    activeThemeId: null,
    previewThemeId: null,
    previewing: false,
    settingsStatus: 'ready',
    saveError: false,
    droppedImports: 0,
    creatorMode,
    creatorAvailable,
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

function mount(
  cards: readonly ThemeStudioCard[] = CARDS,
  creatorMode: ThemeStudioRowState['creatorMode'] = 'off',
  creatorAvailable = true,
) {
  const store = createRowState(cards, creatorMode, creatorAvailable)
  const previewTheme = vi.fn()
  const activateTheme = vi.fn()
  const cancelPreview = vi.fn()
  const inspectThemeFile = vi.fn(() => ({ ok: false as const, error: { code: 'not-json' as const } }))
  const importIdTaken = vi.fn(() => false)
  const saveImportedTheme = vi.fn((source: Record<string, unknown>) => source['id'] as string)
  const removeImportedTheme = vi.fn()
  const exportTheme = vi.fn()
  const startThemeCreation = vi.fn(() => true)
  const createEditorDraft = vi.fn((baseId: string) => {
    if (baseId === 'user.ocean') {
      const parsed = validateThemeFileData({
        version: 1, id: 'user.ocean', name: 'Ocean',
        palette: {
          light: {
            bgBase: '#f4f8fb', bgLayer1: '#ffffff', bgLayer2: '#eef3f7', bgOverlay: '#ffffff',
            borderL1: '#d7e0e8', borderL2: '#c3d0da', brand: '#2b6cb0',
            labelPrimary: '#1b2a3a', labelSecondary: '#51606f',
            error: '#b3282d', success: '#22793d', warn: '#975a16', sidebar: '#eef3f7',
          },
          dark: {
            bgBase: '#101820', bgLayer1: '#1a2430', bgLayer2: '#223040', bgOverlay: '#101820',
            borderL1: '#2c3c4e', borderL2: '#3a4d63', brand: '#63a4d8',
            labelPrimary: '#e6edf3', labelSecondary: '#9fb0bf',
            error: '#f0838a', success: '#6cc596', warn: '#e0b56a', sidebar: '#1a2430',
          },
        },
      })
      if (!parsed.ok) return undefined
      return createThemeEditorDraft(compileThemeFile(parsed.file), parsed.file)
    }
    const preset = BUILTIN_PRESETS.find(entry => entry.id === baseId)
    return preset === undefined ? undefined : createThemeEditorDraft(preset)
  })
  const editorTakenIds = vi.fn((): string[] => [])
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
    importIdTaken,
    saveImportedTheme,
    removeImportedTheme,
    exportTheme,
    startThemeCreation,
    createEditorDraft,
    editorTakenIds,
  }
  render(<ThemeStudioRow {...props} />)
  return { store, previewTheme, activateTheme, cancelPreview, inspectThemeFile, importIdTaken, saveImportedTheme, removeImportedTheme, exportTheme, startThemeCreation, createEditorDraft, editorTakenIds }
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

  it('previews when the pointer rests on the row outside the label', () => {
    const b = mount()
    fireEvent.click(selector())
    // The whole menuitem row is the hover unit, not just the icon/text.
    fireEvent.mouseOver(option('Nordic'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
  })

  it('keeps the preview while the pointer moves from the label into row padding', () => {
    const b = mount()
    fireEvent.click(selector())
    const label = within(option('Nordic')).getByText('Nordic')
    fireEvent.mouseEnter(label)
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
    fireEvent.mouseOut(label, { relatedTarget: option('Nordic') })
    fireEvent.mouseOver(option('Nordic'))
    expect(b.cancelPreview).not.toHaveBeenCalled()
  })

  it('restores the applied theme on separators and group labels between rows', () => {
    const b = mount([...CARDS, IMPORTED_CARD])
    fireEvent.click(selector())
    fireEvent.mouseEnter(within(option('Ocean')).getByText('Ocean'))
    expect(b.previewTheme).toHaveBeenCalledWith('user.ocean')
    fireEvent.mouseOver(document.querySelector('[role="separator"]')!)
    expect(b.cancelPreview).toHaveBeenCalledOnce()
    fireEvent.mouseEnter(within(option('Nordic')).getByText('Nordic'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
    fireEvent.mouseOver(screen.getByText('Imported'))
    expect(b.cancelPreview).toHaveBeenCalledTimes(2)
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

  it('renders the applied name inside a capped selector label', () => {
    const b = mount()
    act(() => {
      b.store.actions.sync({
        activeThemeId: 'dsh-theme-studio.graphite',
        previewThemeId: null,
        previewing: false,
        settingsStatus: 'ready',
        saveError: false,
        droppedImports: 0,
        revision: 1,
      })
    })
    const trigger = selector('Graphite')
    const label = within(trigger).getByText('Graphite')
    expect(label.tagName).toBe('SPAN')
    expect(label.getAttribute('title')).toBe('Graphite')
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

  it('re-resolves through the duplicate dialog when the id was claimed meanwhile', async () => {
    const b = mount([...CARDS, IMPORTED_CARD])
    b.inspectThemeFile.mockReturnValue({
      ok: true,
      file: { version: 1, id: 'user.moss', name: 'Moss' },
      source: { id: 'user.moss' },
      collision: null,
      summary: { failed: 0, unknown: 0 },
    } as never)
    fireEvent.click(selector())
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [new File(['{}'], 'moss.json')] },
    })
    const dialog = await screen.findByRole('dialog')
    // The id became taken between inspection and confirm (pending write or a
    // catalog change); append must not persist a duplicate.
    b.importIdTaken.mockReturnValue(true)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Import' }))
    expect(b.importIdTaken).toHaveBeenCalledWith('user.moss')
    expect(b.saveImportedTheme).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog').textContent).toContain('user.moss')
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Overwrite it' })).toBeDefined()
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

  it('shows the import error dialog when the file cannot be read', async () => {
    const b = mount()
    fireEvent.click(selector())
    const file = new File(['{}'], 'ocean.dsh-theme.json')
    file.text = () => Promise.reject(new Error('disk gone'))
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('The file could not be read: disk gone.')
    expect(b.inspectThemeFile).not.toHaveBeenCalled()
    expect(b.saveImportedTheme).not.toHaveBeenCalled()
  })

  it('shows the file description in the confirmation dialog', async () => {
    const b = mount()
    b.inspectThemeFile.mockReturnValue({
      ok: true,
      file: { version: 1, id: 'user.ocean', name: 'Ocean', description: 'Cool blue palette.' },
      source: { id: 'user.ocean' },
      collision: null,
      summary: { failed: 0, unknown: 0 },
    } as never)
    fireEvent.click(selector())
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [new File(['{}'], 'ocean.json')] },
    })
    const dialog = await screen.findByRole('dialog')
    const description = within(dialog).getByText('Cool blue palette.')
    expect(description.getAttribute('title')).toBe('Cool blue palette.')
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

  it('shows the stored description on imported rows in the manage dialog', () => {
    mount([...CARDS, IMPORTED_CARD])
    fireEvent.click(selector())
    fireEvent.click(option('Manage themes…'))
    const dialog = screen.getByRole('dialog')
    const description = within(dialog).getByText('Cool blue palette.')
    expect(description.getAttribute('title')).toBe('Cool blue palette.')
    // Rows without a description simply omit the element.
    const nordicRow = within(dialog).getByText('dsh-theme-studio.nordic').parentElement!
    expect(nordicRow.textContent).not.toContain('Cool blue palette.')
  })

  it('renders an unresolvable imported sample as a marked placeholder, not a color', () => {
    const unresolved: ThemeStudioCard = {
      ...IMPORTED_CARD,
      preview: {
        light: { background: null, surface: '#ffffff', foreground: '#1b2a3a', accent: '#2b6cb0' },
        dark: { background: null, surface: '#1a2430', foreground: '#e6edf3', accent: '#63a4d8' },
      },
    }
    mount([...CARDS, unresolved])
    fireEvent.click(selector())
    const cells = option('Ocean').querySelectorAll('div[aria-hidden="true"] span')
    expect(cells).toHaveLength(4)
    expect(cells[0]!.getAttribute('data-ts-unresolved')).not.toBeNull()
    expect((cells[0] as HTMLElement).style.background).toBe('')
    expect(cells[1]!.getAttribute('data-ts-unresolved')).toBeNull()
    expect((cells[1] as HTMLElement).style.background).not.toBe('')
  })

  it('keeps rendered chips on resolved literals when document CSS variables change', () => {
    mount([...CARDS, IMPORTED_CARD])
    fireEvent.click(selector())
    const cell = option('Ocean').querySelector('div[aria-hidden="true"] span') as HTMLElement
    const before = cell.style.background
    expect(before).not.toBe('')
    expect(before).not.toContain('var(')
    expect(before).not.toContain('color-mix(')
    document.body.style.setProperty('--dsw-alias-bg-base', '#112233')
    document.body.style.setProperty('--dsw-alias-label-primary', '#112233')
    expect(cell.style.background).toBe(before)
    document.body.style.removeProperty('--dsw-alias-bg-base')
    document.body.style.removeProperty('--dsw-alias-label-primary')
  })

  it('offers the manual editor while creatorMode is off and the host has no skill catalog', () => {
    mount(CARDS, 'off', false)
    fireEvent.click(selector())
    expect(option('Create theme manually…')).toBeDefined()
    expect(option('Create theme manually…').getAttribute('disabled')).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Create your own theme…' })).toBeNull()
  })

  it.each(['loading', 'unavailable'] as const)('disables the manual editor entry while settings are %s', (settingsStatus) => {
    const b = mount()
    act(() => {
      b.store.actions.sync({ ...b.store.getSnapshot(), settingsStatus, revision: 1 })
    })
    fireEvent.click(selector())
    expect(option('Create theme manually…').getAttribute('disabled')).not.toBeNull()
  })

  it('cancels the preview and opens the editor dialog for the applied theme', () => {
    const b = mount()
    act(() => {
      b.store.actions.sync({ ...b.store.getSnapshot(), activeThemeId: 'dsh-theme-studio.nordic', revision: 1 })
    })
    fireEvent.click(selector('Nordic'))
    fireEvent.mouseEnter(within(option('Graphite')).getByText('Graphite'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.graphite')
    fireEvent.click(option('Create theme manually…'))
    expect(b.cancelPreview).toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(b.createEditorDraft).toHaveBeenCalledWith('dsh-theme-studio.nordic')
  })

  it('falls back to the first non-default card as the editor base', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.click(option('Create theme manually…'))
    expect(b.createEditorDraft).toHaveBeenCalledWith('dsh-theme-studio.graphite')
  })

  it('saves a manually created theme through the append path only', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.click(option('Create theme manually…'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Ocean Copy' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save theme' }))
    expect(b.saveImportedTheme).toHaveBeenCalledOnce()
    const [source, mode] = b.saveImportedTheme.mock.calls[0]! as [Record<string, unknown>, string]
    expect(mode).toBe('append')
    expect(source['id']).toBe('user.ocean-copy')
    expect(source['name']).toBe('Ocean Copy')
    expect(source['version']).toBe(1)
    expect(source['palette']).toBeDefined()
    expect(b.startThemeCreation).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the full draft through close, a pending collision, and a rejected save retry', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.click(option('Create theme manually…'))
    let dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Drafty' } })
    fireEvent.change(within(dialog).getByLabelText('Theme ID'), { target: { value: 'user.drafty-x' } })
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Still mine' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /^--dsw-alias-bg- \(15\)/ }))
    fireEvent.change(within(dialog).getByLabelText('Light: --dsw-alias-bg-base'), { target: { value: '#000011' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save theme' }))
    expect(b.saveImportedTheme).toHaveBeenCalledOnce()
    const source = b.saveImportedTheme.mock.calls[0]![0] as Record<string, unknown>
    expect(source['id']).toBe('user.drafty-x')
    expect((source['overrides'] as Record<string, Record<string, string>>)['light']['--dsw-alias-bg-base']).toBe('#000011')
    expect(screen.queryByRole('dialog')).toBeNull()
    b.editorTakenIds.mockReturnValue(['user.drafty-x'])
    act(() => {
      b.store.actions.sync({ ...b.store.getSnapshot(), saveError: true, revision: 1 })
    })
    fireEvent.click(selector())
    fireEvent.click(option('Create theme manually…'))
    dialog = screen.getByRole('dialog')
    expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe('Drafty')
    expect((within(dialog).getByLabelText('Theme ID') as HTMLInputElement).value).toBe('user.drafty-x')
    expect((within(dialog).getByLabelText('Description') as HTMLTextAreaElement).value).toBe('Still mine')
    expect((within(dialog).getByLabelText('Light: --dsw-alias-bg-base') as HTMLInputElement).value).toBe('#000011')
    expect(dialog.textContent).toContain('could not be saved')
    expect(within(dialog).getByRole('button', { name: 'Save theme' }).getAttribute('disabled')).not.toBeNull()
    b.editorTakenIds.mockReturnValue([])
    act(() => {
      b.store.actions.sync({ ...b.store.getSnapshot(), saveError: false, revision: 2 })
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    fireEvent.click(selector())
    fireEvent.click(option('Create theme manually…'))
    dialog = screen.getByRole('dialog')
    expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe('Drafty')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save theme' }))
    expect(b.saveImportedTheme).toHaveBeenCalledTimes(2)
    expect(b.saveImportedTheme.mock.calls[1]![0]).toEqual(source)
    expect(b.saveImportedTheme.mock.calls[1]![1]).toBe('append')
  })

  it('keeps editor content open and blocks saving while settings transition away', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.click(option('Create theme manually…'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Held' } })
    act(() => {
      b.store.actions.sync({ ...b.store.getSnapshot(), settingsStatus: 'loading', revision: 1 })
    })
    expect(screen.getByRole('dialog')).toBeDefined()
    expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe('Held')
    expect(within(dialog).getByRole('button', { name: 'Save theme' }).getAttribute('disabled')).not.toBeNull()
  })

  it('edits an imported theme as the base and saves its palette', () => {
    const b = mount([...CARDS, IMPORTED_CARD])
    fireEvent.click(selector())
    fireEvent.click(option('Create theme manually…'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Base theme'), { target: { value: 'user.ocean' } })
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Ocean Two' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save theme' }))
    expect(b.saveImportedTheme).toHaveBeenCalledOnce()
    const source = b.saveImportedTheme.mock.calls[0]![0] as Record<string, unknown>
    expect(source['id']).toBe('user.ocean-two')
    expect((source['palette'] as { light: { bgBase: string } }).light.bgBase).toBe('#f4f8fb')
  })

  it('hides the create-theme action while creatorMode is off', () => {
    mount(CARDS, 'off')
    fireEvent.click(selector())
    expect(screen.queryByRole('menuitem', { name: 'Create your own theme…' })).toBeNull()
  })

  it('hides the create-theme action while the host has no skill catalog', () => {
    const b = mount(CARDS, 'gesture', false)
    fireEvent.click(selector())
    expect(screen.queryByRole('menuitem', { name: 'Create your own theme…' })).toBeNull()
    // The durable mode still wants the skill; the entry appears as soon as
    // the catalog remote is provided.
    act(() => {
      b.store.actions.sync({ ...b.store.getSnapshot(), creatorAvailable: true, revision: 1 })
    })
    expect(option('Create your own theme…')).toBeDefined()
  })

  it('offers create-theme while creatorMode is gesture and launches the session', () => {
    const b = mount(CARDS, 'gesture')
    fireEvent.click(selector())
    fireEvent.click(option('Create your own theme…'))
    expect(b.startThemeCreation).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the manual gesture hint when the session launch is unavailable', () => {
    const b = mount(CARDS, 'gesture')
    b.startThemeCreation.mockReturnValue(false)
    fireEvent.click(selector())
    fireEvent.click(option('Create your own theme…'))
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('/dsh-theme-creator')
  })
})
