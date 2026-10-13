// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
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

function option(name: string) {
  return screen.getByRole('option', { name })
}

describe('ThemeStudioRow', () => {
  it('renders a listbox whose options mark only the applied theme selected', () => {
    mount()
    expect(screen.getByText('Themes')).toBeDefined()
    expect(screen.getByRole('listbox')).toBeDefined()
    expect(option('Default').getAttribute('aria-selected')).toBe('true')
    expect(option('Graphite').getAttribute('aria-selected')).toBe('false')
    expect(option('Nordic').getAttribute('aria-selected')).toBe('false')
  })

  it('previews on hover, restores on mouse leave, and applies on click', () => {
    const b = mount()
    fireEvent.mouseEnter(option('Nordic'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
    expect(b.activateTheme).not.toHaveBeenCalled()
    fireEvent.mouseLeave(screen.getByRole('listbox'))
    expect(b.cancelPreview).toHaveBeenCalledOnce()
    fireEvent.click(option('Nordic'))
    expect(b.activateTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
  })

  it('previews on focus and restores when focus leaves the list', () => {
    const b = mount()
    fireEvent.focus(option('Graphite'))
    expect(b.previewTheme).toHaveBeenCalledWith('dsh-theme-studio.graphite')
    // Moving between options keeps the preview cycle alive.
    fireEvent.blur(option('Graphite'), { relatedTarget: option('Nordic') })
    expect(b.cancelPreview).not.toHaveBeenCalled()
    fireEvent.blur(option('Graphite'), { relatedTarget: document.body })
    expect(b.cancelPreview).toHaveBeenCalledOnce()
  })

  it('walks options with arrow keys and applies with Enter', () => {
    const b = mount()
    const nordic = option('Nordic')
    fireEvent.focus(option('Graphite'))
    fireEvent.keyDown(nordic, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(nordic)
    expect(b.previewTheme).toHaveBeenLastCalledWith('dsh-theme-studio.nordic')
    fireEvent.keyDown(nordic, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(option('Graphite'))
    fireEvent.keyDown(nordic, { key: 'Enter' })
    expect(b.activateTheme).toHaveBeenCalledWith('dsh-theme-studio.nordic')
    fireEvent.keyDown(option('Default'), { key: ' ' })
    expect(b.activateTheme).toHaveBeenCalledWith(null)
  })

  it('announces the previewed name to assistive tech', () => {
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
    expect(screen.getAllByText('Previewing Nordic').length).toBeGreaterThan(0)
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
    expect(option('Graphite').getAttribute('aria-selected')).toBe('true')
  })
})
