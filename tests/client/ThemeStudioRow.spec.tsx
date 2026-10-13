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

function createRowState(cards: readonly ThemeStudioCard[]) {
  let state: ThemeStudioRowState = {
    activeThemeId: null,
    previewThemeId: null,
    previewing: false,
    settingsStatus: 'ready',
    saveError: false,
    revision: 0,
    cards,
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
        state = { ...state, ...snapshot, cards }
        for (const listener of [...listeners]) listener()
      },
    },
  }
}

function mount() {
  const store = createRowState(CARDS)
  const previewTheme = vi.fn()
  const activateTheme = vi.fn()
  const cancelPreview = vi.fn()
  const props: ThemeStudioRowComponentProps = {
    useSessions: (() => undefined) as never,
    useWorkspaces: (() => undefined) as never,
    useStore: bindSnapshotSelector(store),
    actions: store.actions as never,
    t: key => en[key] ?? key,
    previewTheme,
    activateTheme,
    cancelPreview,
  }
  render(<ThemeStudioRow {...props} />)
  return { store, previewTheme, activateTheme, cancelPreview }
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

  it('restores the preview when Escape closes the menu', () => {
    const b = mount()
    fireEvent.click(selector())
    fireEvent.mouseEnter(within(option('Graphite')).getByText('Graphite'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.graphite')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(b.cancelPreview).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).toBeNull()
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
        revision: 2,
      })
    })
    expect(screen.getByRole('alert').textContent).toContain('could not be saved')
    expect(selector('Graphite')).toBeDefined()
  })
})
