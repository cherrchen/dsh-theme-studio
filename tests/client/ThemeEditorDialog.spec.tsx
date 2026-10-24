// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ThemeEditorDialog, type ThemeEditorDialogProps } from '../../src/client/ThemeEditorDialog.tsx'
import {
  createThemeEditorDraft, editorTokenNames, type ThemeEditorDraft,
} from '../../src/client/theme-editor.ts'
import { compileThemeFile, validateThemeFileData, THEME_FILE_MAX_LENGTH } from '../../src/client/theme-file.ts'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'
import { en, type ThemeStudioKey } from '../../src/client/locales.ts'

afterEach(cleanup)

const t = (key: ThemeStudioKey): string => en[key] ?? key

const BASES = [
  { id: 'dsh-theme-studio.claude', name: 'Claude' },
  { id: 'dsh-theme-studio.nordic', name: 'Nordic' },
  { id: 'user.ocean', name: 'Ocean' },
]

function oceanDraft(): ThemeEditorDraft {
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
  if (!parsed.ok) throw new Error('fixture did not parse')
  return createThemeEditorDraft(compileThemeFile(parsed.file), parsed.file)
}

interface MountOptions {
  draft?: ThemeEditorDraft
  bases?: readonly { id: string; name: string }[]
  taken?: () => readonly string[]
  settingsReady?: boolean
  saveError?: boolean
  createDraft?: (id: string) => ThemeEditorDraft | undefined
}

function mountDialog(options: MountOptions = {}) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  let current: ThemeEditorDraft | null = options.draft ?? createThemeEditorDraft(BUILTIN_PRESETS[0]!)
  const createDraft = options.createDraft ?? ((id: string): ThemeEditorDraft | undefined => {
    if (id === 'user.ocean') return oceanDraft()
    const preset = BUILTIN_PRESETS.find(entry => entry.id === id)
    return preset === undefined ? undefined : createThemeEditorDraft(preset)
  })
  function Host() {
    const [draft, setDraft] = useState(current)
    return (
      <ThemeEditorDialog
        open
        draft={draft}
        onDraftChange={(next) => { current = next; setDraft(next) }}
        bases={options.bases ?? BASES}
        createDraft={createDraft}
        takenIds={options.taken ?? (() => [])}
        settingsReady={options.settingsReady ?? true}
        saveError={options.saveError ?? false}
        onSave={onSave}
        onClose={onClose}
        t={t}
      />
    )
  }
  render(<Host />)
  return { onSave, onClose, draft: () => current as ThemeEditorDraft }
}

function dialog() {
  return screen.getByRole('dialog', { name: 'Create theme manually' })
}

function nav() {
  return within(dialog()).getByRole('navigation', { name: 'Theme structure' })
}

/** Select a nav page by its visible button name. */
function selectNav(name: string | RegExp) {
  fireEvent.click(within(nav()).getByRole('button', { name }))
}

function search() {
  return within(dialog()).getByLabelText('Search tokens') as HTMLInputElement
}

function editColor(label: string): HTMLInputElement {
  fireEvent.click(within(dialog()).getByRole('button', { name: label }))
  return screen.getByRole('textbox', { name: `Color value: ${label}` }) as HTMLInputElement
}

function picker() {
  return screen.getByRole('dialog', { name: /^Edit color:/ })
}

function closePicker() {
  fireEvent.click(within(picker()).getByRole('button', { name: 'Close' }))
}

function nameInput() {
  return within(dialog()).getByLabelText('Name') as HTMLInputElement
}

function idInput() {
  return within(dialog()).getByLabelText('Theme ID') as HTMLInputElement
}

/** Open the footer problems menu and click the item matching `name`. */
function openProblems(name?: RegExp | string) {
  fireEvent.click(within(dialog()).getByRole('button', { name: /problems$/ }))
  if (name !== undefined) fireEvent.click(within(dialog()).getByRole('menuitem', { name }))
}

describe('ThemeEditorDialog', () => {
  it('auto-slugs the name into the id until the id is edited manually', () => {
    mountDialog()
    fireEvent.change(nameInput(), { target: { value: 'My Theme' } })
    expect(idInput().value).toBe('user.my-theme')
    fireEvent.change(idInput(), { target: { value: 'user.custom' } })
    fireEvent.change(nameInput(), { target: { value: 'Renamed Again' } })
    expect(idInput().value).toBe('user.custom')
  })

  it('consults taken ids while auto-generating', () => {
    mountDialog({ taken: () => ['user.my-theme', 'user.my-theme-2'] })
    fireEvent.change(nameInput(), { target: { value: 'My Theme' } })
    expect(idInput().value).toBe('user.my-theme-3')
  })

  it.each([
    ['system', 'reserved'],
    ['dark', 'reserved'],
    ['dsh-theme-studio.mine', 'builtin'],
    ['Bad ID', 'Invalid theme id'],
  ])('rejects the id %s with a localized error and disabled save', (id, text) => {
    const b = mountDialog()
    fireEvent.change(nameInput(), { target: { value: 'Copy' } })
    fireEvent.change(idInput(), { target: { value: id } })
    expect(dialog().textContent).toContain(text)
    expect(idInput().getAttribute('aria-invalid')).toBe('true')
    expect(within(dialog()).getByRole('button', { name: 'Save theme' }).getAttribute('disabled')).not.toBeNull()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save theme' }))
    expect(b.onSave).not.toHaveBeenCalled()
  })

  it('marks an illegal color on the field and disables save', () => {
    const b = mountDialog()
    selectNav(/^bg-/)
    const field = editColor('Light: --dsw-alias-bg-base')
    fireEvent.change(field, { target: { value: 'hsl(0 0% 0%)' } })
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(dialog().textContent).toContain('overrides.light.--dsw-alias-bg-base')
    expect(within(dialog()).getByRole('button', { name: 'Save theme' }).getAttribute('disabled')).not.toBeNull()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save theme' }))
    expect(b.onSave).not.toHaveBeenCalled()
  })

  it('lists a whole category, a single group, and searches globally', () => {
    mountDialog()
    const names = editorTokenNames()
    expect(names).toHaveLength(145)
    // Category page: every group renders as a section, 103 tokens per scheme.
    selectNav('--dsw-alias')
    expect(within(dialog()).getAllByLabelText(/^Light: --dsw-alias-label-/)).toHaveLength(13)
    expect(within(dialog()).getAllByLabelText(/^Light: --dsw-alias-/)).toHaveLength(103)
    expect(within(dialog()).getAllByLabelText(/^Dark: --dsw-alias-/)).toHaveLength(103)
    // Group page: just the 13 label tokens.
    selectNav(/^label-/)
    expect(within(dialog()).getAllByLabelText(/^Light: --dsw-alias-/)).toHaveLength(13)
    // Global search ignores the nav selection.
    fireEvent.change(search(), { target: { value: 'BG-BASE' } })
    expect(within(dialog()).getAllByLabelText(/^Light: --/)).toHaveLength(1)
    expect(within(dialog()).getByLabelText('Light: --dsw-alias-bg-base')).not.toBeNull()
    expect(dialog().textContent).toContain('1 results')
    // Search reaches tokens outside the selected category too.
    fireEvent.change(search(), { target: { value: 'shiki' } })
    expect(within(dialog()).getAllByLabelText(/^Light: --shiki-token-/)).toHaveLength(9)
    fireEvent.change(search(), { target: { value: '' } })
    // Another category through the nav rail.
    selectNav('--shiki-token')
    expect(within(dialog()).getAllByLabelText(/^Light: --shiki-token-/)).toHaveLength(9)
    expect(within(dialog()).queryAllByLabelText(/^Light: --dsw-alias-/)).toHaveLength(0)
  })

  it('keeps raw var() and color-mix() expressions in the inputs', () => {
    mountDialog()
    selectNav(/^label-/)
    const field = editColor('Light: --dsw-alias-label-shimmer')
    expect(field.value).toContain('color-mix(')
    closePicker()
    const varField = editColor('Light: --dsw-alias-label-primary-dimmed')
    fireEvent.change(varField, { target: { value: 'var(--dsh-custom)' } })
    expect(varField.value).toBe('var(--dsh-custom)')
  })

  it('saves a valid draft and reports informational contrast counts', () => {
    const b = mountDialog()
    fireEvent.change(nameInput(), { target: { value: 'Low Contrast' } })
    selectNav(/^label-/)
    fireEvent.change(editColor('Light: --dsw-alias-label-primary'), { target: { value: '#faf9f5' } })
    closePicker()
    fireEvent.change(editColor('Dark: --dsw-alias-label-primary'), { target: { value: '#1f1e1d' } })
    closePicker()
    expect(dialog().textContent).toContain('below threshold')
    const save = within(dialog()).getByRole('button', { name: 'Save theme' })
    expect(save.getAttribute('disabled')).toBeNull()
    fireEvent.click(save)
    expect(b.onSave).toHaveBeenCalledOnce()
    const source = b.onSave.mock.calls[0]![0] as Record<string, unknown>
    expect(source['id']).toBe('user.low-contrast')
    expect(source['name']).toBe('Low Contrast')
    expect((source['overrides'] as Record<string, Record<string, string>>)['light']['--dsw-alias-label-primary']).toBe('#faf9f5')
  })

  it('catches an id claimed after the render only at submit, then renames and saves', () => {
    let taken: string[] = []
    const b = mountDialog({ taken: () => taken })
    fireEvent.change(nameInput(), { target: { value: 'Ocean' } })
    expect(idInput().value).toBe('user.ocean')
    taken = ['user.ocean']
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save theme' }))
    expect(b.onSave).not.toHaveBeenCalled()
    expect(dialog().textContent).toContain('taken')
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Generate available id' }))
    expect(idInput().value).toBe('user.ocean-2')
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save theme' }))
    expect(b.onSave).toHaveBeenCalledOnce()
    expect((b.onSave.mock.calls[0]![0] as Record<string, unknown>)['id']).toBe('user.ocean-2')
  })

  it('never offers an overwrite control', () => {
    mountDialog()
    expect(within(dialog()).queryByRole('button', { name: /overwrite|replace/i })).toBeNull()
  })

  it('blocks an oversized file and the problems menu focuses the largest editable field', () => {
    const draft = createThemeEditorDraft(BUILTIN_PRESETS[0]!)
    const b = mountDialog({ draft: { ...draft, name: 'Big', description: 'x'.repeat(THEME_FILE_MAX_LENGTH) } })
    expect(dialog().textContent).toContain('too large')
    openProblems(/too large/)
    expect(document.activeElement).toBe(within(dialog()).getByLabelText('Description'))
    expect(b.onSave).not.toHaveBeenCalled()
  })

  it('resets the draft when the base changes', () => {
    const b = mountDialog()
    fireEvent.change(nameInput(), { target: { value: 'Edited' } })
    fireEvent.click(within(dialog()).getByLabelText('Base theme'))
    fireEvent.click(within(dialog()).getByRole('menuitem', { name: 'Nordic' }))
    expect(b.draft().baseId).toBe('dsh-theme-studio.nordic')
    expect(nameInput().value).toBe('')
    selectNav(/^bg-/)
    expect(within(dialog()).getByLabelText('Light: --dsw-alias-bg-base').getAttribute('title'))
      .toBe(BUILTIN_PRESETS.find(p => p.id === 'dsh-theme-studio.nordic')!.tokens.light['--dsw-alias-bg-base'])
  })

  it('keeps a removed base shown as a disabled verbatim option', () => {
    const draft = { ...oceanDraft(), baseId: 'user.gone' }
    mountDialog({ draft, bases: BASES })
    const anchor = within(dialog()).getByLabelText('Base theme')
    expect(anchor.textContent).toContain('Ocean')
    fireEvent.click(anchor)
    const oceans = within(dialog()).getAllByRole('menuitem', { name: 'Ocean' })
    const verbatim = oceans.find(item => item.getAttribute('disabled') !== null)!
    expect(verbatim).toBeDefined()
    expect(verbatim.getAttribute('aria-selected')).toBe('true')
    expect(oceans).toHaveLength(2)
  })

  it('reports unknown contrast pairs without blocking save', () => {
    const b = mountDialog()
    fireEvent.change(nameInput(), { target: { value: 'Ghost Link' } })
    selectNav('--dsw-alias')
    fireEvent.change(search(), { target: { value: '-alias-link' } })
    for (const scheme of ['Light', 'Dark']) {
      fireEvent.change(editColor(`${scheme}: --dsw-alias-link`), { target: { value: 'var(--dsh-missing)' } })
      closePicker()
    }
    expect(dialog().textContent).toContain('unknown')
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save theme' }))
    expect(b.onSave).toHaveBeenCalledOnce()
  })

  it('jumps a problems-menu item to a filtered-out field and keeps its value', () => {
    mountDialog()
    fireEvent.change(nameInput(), { target: { value: 'X' } })
    selectNav(/^bg-/)
    const field = editColor('Light: --dsw-alias-bg-base')
    fireEvent.change(field, { target: { value: 'hsl(0 0% 0%)' } })
    closePicker()
    // Hide the row behind a different nav page, a search query, and the filter.
    selectNav('--shiki-token')
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'Modified only' }))
    fireEvent.change(search(), { target: { value: 'zzz' } })
    openProblems(/overrides\.light\.--dsw-alias-bg-base/)
    expect(search().value).toBe('')
    expect((within(dialog()).getByRole('checkbox', { name: 'Modified only' }) as HTMLInputElement).checked).toBe(false)
    expect(document.activeElement).toBe(within(dialog()).getByLabelText('Light: --dsw-alias-bg-base'))
    expect(document.activeElement?.getAttribute('title')).toBe('hsl(0 0% 0%)')
  })

  it('gives same-path errors unique ids and joins them in aria-describedby', () => {
    const draft = createThemeEditorDraft(BUILTIN_PRESETS[0]!)
    const big = 'z'.repeat(THEME_FILE_MAX_LENGTH)
    mountDialog({
      draft: {
        ...draft,
        name: 'X',
        values: {
          light: { ...draft.values.light, '--dsw-alias-bg-base': big },
          dark: { ...draft.values.dark, '--dsw-alias-bg-base': big },
        },
      },
    })
    const ids = [...dialog().querySelectorAll('[id^="ts-editor-error-"]')].map(el => el.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThan(1)
    selectNav(/^bg-/)
    const field = within(dialog()).getByLabelText('Light: --dsw-alias-bg-base')
    expect((field.getAttribute('aria-describedby') ?? '').split(' ').length).toBeGreaterThan(1)
  })

  it('shows a localized usage note under each token name', () => {
    mountDialog()
    selectNav(/^label-/)
    expect(dialog().textContent).toContain('Primary text color for body copy and titles.')
    selectNav(/^bg-/)
    expect(dialog().textContent).toContain('Base page background: the bottom-most canvas.')
  })

  it('marks modified tokens with a nav dot, a count tag, and a row reset', () => {
    const b = mountDialog()
    selectNav(/^bg-/)
    const field = editColor('Light: --dsw-alias-bg-base')
    fireEvent.change(field, { target: { value: '#112233' } })
    closePicker()
    // Footer modified count and the nav's modified dot on the owning group.
    expect(dialog().textContent).toContain('1 modified')
    expect(nav().querySelector('[class*="navDot"]')).not.toBeNull()
    // Reset restores both schemes to the base compiled values.
    const reset = within(dialog()).getByRole('button', { name: 'Restore base: --dsw-alias-bg-base' })
    fireEvent.click(reset)
    const compiled = compileThemeFile(b.draft().base).tokens
    expect(within(dialog()).getByLabelText('Light: --dsw-alias-bg-base').getAttribute('title'))
      .toBe(compiled.light['--dsw-alias-bg-base'])
    expect(dialog().textContent).not.toContain('1 modified')
  })

  it('filters the list to modified tokens only', () => {
    mountDialog()
    selectNav(/^bg-/)
    fireEvent.change(editColor('Light: --dsw-alias-bg-base'), { target: { value: '#112233' } })
    closePicker()
    selectNav('--dsw-alias')
    expect(within(dialog()).getAllByLabelText(/^Light: --dsw-alias-/)).toHaveLength(103)
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'Modified only' }))
    const fields = within(dialog()).getAllByLabelText(/^Light: --dsw-alias-/)
    expect(fields).toHaveLength(1)
    expect(within(dialog()).getByLabelText('Light: --dsw-alias-bg-base')).not.toBeNull()
  })

  it('paints the preview card from resolved draft colors and marks unresolvable regions', () => {
    mountDialog()
    selectNav(/^bg-/)
    const light = screen.getByRole('img', { name: 'Theme preview: light' })
    const dark = screen.getByRole('img', { name: 'Theme preview: dark' })
    expect(light.style.background).toContain('rgb(')
    expect(dark.style.background).toContain('rgb(')
    fireEvent.change(editColor('Light: --dsw-alias-bg-base'), { target: { value: 'var(--missing-token)' } })
    closePicker()
    const broken = screen.getByRole('img', { name: 'Theme preview: light' })
    expect(broken.className).toContain('previewUnknown')
    // An unresolvable card surface also renders the hatched placeholder, never
    // a silently-inherited page color.
    fireEvent.change(editColor('Light: --dsw-alias-bg-layer-1'), { target: { value: 'hsl(9 9% 9%)' } })
    closePicker()
    expect(screen.getByRole('img', { name: 'Theme preview: light' }).querySelector('[class*="previewUnknown"]')).not.toBeNull()
  })

  it('restores the base value from the picker compare strip', () => {
    mountDialog()
    selectNav(/^bg-/)
    const field = editColor('Light: --dsw-alias-bg-base')
    const base = field.value
    fireEvent.change(field, { target: { value: '#112233' } })
    const restore = within(picker()).getByRole('button', { name: 'Restore base' })
    expect(restore.getAttribute('disabled')).toBeNull()
    fireEvent.click(restore)
    expect(within(dialog()).getByLabelText('Light: --dsw-alias-bg-base').getAttribute('title')).toBe(base)
    expect(within(picker()).getByRole('button', { name: 'Restore base' }).getAttribute('disabled')).not.toBeNull()
  })

  it.each([
    { expression: 'var(--dsw-alias-bg-base)', light: 'rgba(32, 64, 96, 1)', dark: 'rgba(96, 128, 160, 1)', current: 'rgba(160, 192, 224, 1)' },
    { expression: 'color-mix(in srgb, var(--dsh-base-color) 50%, black)', light: 'rgba(16, 32, 48, 1)', dark: 'rgba(48, 64, 80, 1)', current: 'rgba(80, 96, 112, 1)' },
  ])('keeps the imported base comparison stable for $expression in both schemes', ({ expression, light, dark, current }) => {
    const parsed = validateThemeFileData({
      ...oceanDraft().base,
      overrides: {
        light: {
          '--dsw-alias-bg-base': '#204060',
          '--dsw-alias-brand-primary': expression,
          '--dsh-base-color': 'var(--dsw-alias-bg-base)',
        },
        dark: {
          '--dsw-alias-bg-base': '#6080a0',
          '--dsw-alias-brand-primary': expression,
          '--dsh-base-color': 'var(--dsw-alias-bg-base)',
        },
      },
    })
    if (!parsed.ok) throw new Error('fixture did not parse')
    mountDialog({ draft: createThemeEditorDraft(compileThemeFile(parsed.file), parsed.file) })
    const compareSwatch = (label: string) =>
      within(within(picker()).getByText(label).parentElement!).getByRole('img', { name: 'Color preview' })

    for (const [scheme, baseColor] of [['Light', light], ['Dark', dark]]) {
      selectNav(/^brand-/)
      editColor(`${scheme}: --dsw-alias-brand-primary`)
      expect(compareSwatch('Base').getAttribute('title')).toBe(baseColor)
      expect(compareSwatch('Current').getAttribute('title')).toBe(baseColor)
      closePicker()

      selectNav(/^bg-/)
      fireEvent.change(editColor(`${scheme}: --dsw-alias-bg-base`), { target: { value: '#a0c0e0' } })
      closePicker()
      selectNav(/^brand-/)
      expect(editColor(`${scheme}: --dsw-alias-brand-primary`).value).toBe(expression)
      expect(compareSwatch('Base').getAttribute('title')).toBe(baseColor)
      expect(compareSwatch('Current').getAttribute('title')).toBe(current)
      closePicker()
    }
  })

  it('opens compact fields in the matching tab and preserves expressions when tabs change', () => {
    const b = mountDialog()
    selectNav(/^label-/)
    const literal = within(dialog()).getByRole('button', { name: 'Light: --dsw-alias-label-primary' })
    expect(literal.textContent).toContain('#141413')
    expect(literal.closest('button')!.getAttribute('title')).toBe('#141413')
    fireEvent.click(literal)
    expect(within(picker()).getByRole('tab', { name: 'RGB' }).getAttribute('aria-selected')).toBe('true')
    closePicker()
    const field = editColor('Light: --dsw-alias-label-shimmer')
    const original = field.value
    expect(original).toContain('color-mix(')
    expect(within(picker()).getByRole('tab', { name: 'color-mix' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(within(picker()).getByRole('tab', { name: 'RGB' }))
    expect(picker().querySelector('input[type="color"]')).not.toBeNull()
    fireEvent.click(within(picker()).getByRole('tab', { name: 'color-mix' }))
    closePicker()
    expect(b.draft().values.light['--dsw-alias-label-shimmer']).toBe(original)
    expect(within(dialog()).getByLabelText('Light: --dsw-alias-label-shimmer').getAttribute('title')).toBe(original)
  })

  it('writes picker and palette changes back to the compact preview', () => {
    mountDialog()
    selectNav(/^label-/)
    editColor('Light: --dsw-alias-label-primary')
    const color = picker().querySelector('input[type="color"]')!
    fireEvent.change(color, { target: { value: '#123456' } })
    expect(within(dialog()).getByLabelText('Light: --dsw-alias-label-primary').getAttribute('title')).toBe('#123456')
    fireEvent.click(within(picker()).getByRole('button', { name: '#D97757' }))
    expect(screen.queryByRole('dialog', { name: /^Edit color:/ })).toBeNull()
    expect(within(dialog()).getByLabelText('Light: --dsw-alias-label-primary').getAttribute('title')).toBe('#D97757')
  })

  it('returns focus to the compact trigger on Escape and supports keyboard tabs', () => {
    mountDialog()
    selectNav(/^label-/)
    const trigger = within(dialog()).getByRole('button', { name: 'Light: --dsw-alias-label-primary' })
    fireEvent.click(trigger)
    const rgb = within(picker()).getByRole('tab', { name: 'RGB' })
    expect(document.activeElement).toBe(rgb)
    fireEvent.keyDown(rgb, { key: 'ArrowRight' })
    const mix = within(picker()).getByRole('tab', { name: 'color-mix' })
    expect(document.activeElement).toBe(mix)
    expect(mix.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(mix, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: /^Edit color:/ })).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(dialog()).not.toBeNull()
    fireEvent.click(trigger)
    const close = within(picker()).getByRole('button', { name: 'Close' })
    close.focus()
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(screen.queryByRole('dialog', { name: /^Edit color:/ })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('dismisses outside the picker and keeps only the focused color editor open', () => {
    mountDialog()
    selectNav(/^label-/)
    editColor('Light: --dsw-alias-label-primary')
    const next = within(dialog()).getByRole('button', { name: 'Dark: --dsw-alias-label-primary' })
    next.focus()
    fireEvent.click(next)
    expect(screen.getAllByRole('dialog', { name: /^Edit color:/ })).toHaveLength(1)
    expect(picker().getAttribute('aria-label')).toContain('Dark:')
    selectNav('Basic info')
    fireEvent.pointerDown(nameInput())
    expect(screen.queryByRole('dialog', { name: /^Edit color:/ })).toBeNull()
  })

  it('builds a color-mix expression inside the floating editor', () => {
    mountDialog()
    selectNav(/^label-/)
    const field = editColor('Light: --dsw-alias-label-shimmer')
    const percent = within(picker()).getByLabelText(/^Percent %/) as HTMLInputElement
    expect(percent.value).toBe('30')
    const withInput = within(picker()).getByLabelText(/^Mix with/) as HTMLInputElement
    expect(withInput.value).toBe('transparent')
    fireEvent.change(percent, { target: { value: '60' } })
    fireEvent.click(within(picker()).getByRole('button', { name: 'Apply' }))
    expect(field.value).toBe('color-mix(in srgb, #141413 60%, transparent)')
    closePicker()
    expect(within(dialog()).getByLabelText('Light: --dsw-alias-label-shimmer').getAttribute('title'))
      .toBe('color-mix(in srgb, #141413 60%, transparent)')
  })

  it('shows the save failure tag and disables controls while settings are unavailable', () => {
    const b = mountDialog({ saveError: true, settingsReady: false })
    expect(dialog().textContent).toContain('could not be saved')
    expect((nameInput() as HTMLInputElement).disabled).toBe(true)
    expect(within(dialog()).getByRole('button', { name: 'Save theme' }).getAttribute('disabled')).not.toBeNull()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }))
    expect(b.onClose).toHaveBeenCalledOnce()
  })
})
