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
  return screen.getByRole('dialog')
}

function expandGroup(prefix: string) {
  const header = within(dialog()).getByRole('button', { name: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })
  fireEvent.click(header)
}

function nameInput() {
  return within(dialog()).getByLabelText('Name') as HTMLInputElement
}

function idInput() {
  return within(dialog()).getByLabelText('Theme ID') as HTMLInputElement
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
    expandGroup('--dsw-alias-bg-')
    const field = within(dialog()).getByLabelText('Light: --dsw-alias-bg-base') as HTMLInputElement
    fireEvent.change(field, { target: { value: 'hsl(0 0% 0%)' } })
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(dialog().textContent).toContain('overrides.light.--dsw-alias-bg-base')
    expect(within(dialog()).getByRole('button', { name: 'Save theme' }).getAttribute('disabled')).not.toBeNull()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save theme' }))
    expect(b.onSave).not.toHaveBeenCalled()
  })

  it('renders token inputs lazily and reaches the surface through search and categories', () => {
    mountDialog()
    const names = editorTokenNames()
    expect(names).toHaveLength(145)
    // Only the default-expanded first group renders before interaction.
    expect(within(dialog()).getAllByLabelText(/^Light: --dsw-alias-label-/)).toHaveLength(13)
    expect(within(dialog()).queryAllByLabelText(/^Light: --dsw-alias-bg-/)).toHaveLength(0)
    const search = within(dialog()).getByLabelText('Search tokens')
    fireEvent.change(search, { target: { value: '-' } })
    expect(within(dialog()).getAllByLabelText(/^Light: --dsw-alias-/)).toHaveLength(103)
    expect(within(dialog()).getAllByLabelText(/^Dark: --dsw-alias-/)).toHaveLength(103)
    // The level-1 dropdown switches the panel to another token family.
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Category' }))
    fireEvent.click(within(dialog()).getByRole('menuitem', { name: /^--shiki-token / }))
    fireEvent.change(within(dialog()).getByLabelText('Search tokens'), { target: { value: '-' } })
    expect(within(dialog()).getAllByLabelText(/^Light: --shiki-token-/)).toHaveLength(9)
    expect(within(dialog()).queryAllByLabelText(/^Light: --dsw-alias-/)).toHaveLength(0)
  })

  it('keeps raw var() and color-mix() expressions in the inputs', () => {
    mountDialog()
    const field = within(dialog()).getByLabelText('Light: --dsw-alias-label-shimmer') as HTMLInputElement
    expect(field.value).toContain('color-mix(')
    const varField = within(dialog()).getByLabelText('Light: --dsw-alias-label-primary-dimmed') as HTMLInputElement
    fireEvent.change(varField, { target: { value: 'var(--dsh-custom)' } })
    expect(varField.value).toBe('var(--dsh-custom)')
  })

  it('saves a valid draft and reports informational contrast counts', () => {
    const b = mountDialog()
    fireEvent.change(nameInput(), { target: { value: 'Low Contrast' } })
    const light = within(dialog()).getByLabelText('Light: --dsw-alias-label-primary') as HTMLInputElement
    const dark = within(dialog()).getByLabelText('Dark: --dsw-alias-label-primary') as HTMLInputElement
    fireEvent.change(light, { target: { value: '#faf9f5' } })
    fireEvent.change(dark, { target: { value: '#1f1e1d' } })
    expect(dialog().textContent).toContain('fall below the contrast threshold')
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

  it('blocks an oversized file and focuses the largest editable field', () => {
    const draft = createThemeEditorDraft(BUILTIN_PRESETS[0]!)
    const b = mountDialog({ draft: { ...draft, name: 'Big', description: 'x'.repeat(THEME_FILE_MAX_LENGTH) } })
    expect(dialog().textContent).toContain('too large')
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Jump to first problem' }))
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
    expandGroup('--dsw-alias-bg-')
    expect((within(dialog()).getByLabelText('Light: --dsw-alias-bg-base') as HTMLInputElement).value)
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
    expandGroup('--dsw-alias-link')
    for (const scheme of ['Light', 'Dark']) {
      fireEvent.change(within(dialog()).getByLabelText(`${scheme}: --dsw-alias-link`), { target: { value: 'var(--dsh-missing)' } })
    }
    expect(dialog().textContent).toContain('could not be evaluated')
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save theme' }))
    expect(b.onSave).toHaveBeenCalledOnce()
  })

  it('jumps an error link to a filtered-out field and keeps its value', () => {
    mountDialog()
    fireEvent.change(nameInput(), { target: { value: 'X' } })
    expandGroup('--dsw-alias-bg-')
    const field = within(dialog()).getByLabelText('Light: --dsw-alias-bg-base') as HTMLInputElement
    fireEvent.change(field, { target: { value: 'hsl(0 0% 0%)' } })
    fireEvent.change(within(dialog()).getByLabelText('Search tokens'), { target: { value: 'zzz' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: /overrides\.light\.--dsw-alias-bg-base/ }))
    expect((within(dialog()).getByLabelText('Search tokens') as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(within(dialog()).getByLabelText('Light: --dsw-alias-bg-base'))
    expect((document.activeElement as HTMLInputElement).value).toBe('hsl(0 0% 0%)')
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
    expandGroup('--dsw-alias-bg-')
    const field = within(dialog()).getByLabelText('Light: --dsw-alias-bg-base')
    expect((field.getAttribute('aria-describedby') ?? '').split(' ').length).toBeGreaterThan(1)
  })

  it('shows a localized usage note under each token name', () => {
    mountDialog()
    expect(dialog().textContent).toContain('Primary text color for body copy and titles.')
    expandGroup('--dsw-alias-bg-')
    expect(dialog().textContent).toContain('Base page background: the bottom-most canvas.')
  })

  it('filters token groups through the level-2 multi-select dropdown', () => {
    mountDialog()
    // The default label group is expanded; unchecking it removes its rows.
    expect(within(dialog()).getAllByLabelText(/^Light: --dsw-alias-label-/)).toHaveLength(13)
    fireEvent.click(within(dialog()).getByRole('button', { name: /18\/18 groups/ }))
    fireEvent.click(within(dialog()).getByRole('menuitem', { name: /^--dsw-alias-label- / }))
    expect(within(dialog()).queryAllByLabelText(/^Light: --dsw-alias-label-/)).toHaveLength(0)
    // Clearing everything shows the empty state; Select all restores every group.
    fireEvent.click(within(dialog()).getByRole('menuitem', { name: 'Clear' }))
    expect(within(dialog()).getByRole('button', { name: 'No groups selected' })).not.toBeNull()
    expect(within(dialog()).queryAllByLabelText(/^Light: --/)).toHaveLength(0)
    fireEvent.click(within(dialog()).getByRole('menuitem', { name: 'Select all' }))
    fireEvent.change(within(dialog()).getByLabelText('Search tokens'), { target: { value: '-' } })
    expect(within(dialog()).getAllByLabelText(/^Light: --dsw-alias-/)).toHaveLength(103)
  })

  it('detects literal vs expression fields and toggles the input mode', () => {
    mountDialog()
    // --dsw-alias-label-primary is a literal hex in the default base.
    const literalField = within(dialog()).getByLabelText('Light: --dsw-alias-label-primary') as HTMLInputElement
    expect(literalField.value).toBe('#141413')
    const literalRow = literalField.closest('label')!
    expect(within(literalRow as HTMLElement).getByRole('button', { name: /^Palette:/ })).not.toBeNull()
    // --dsw-alias-label-shimmer is a color-mix expression.
    const exprField = within(dialog()).getByLabelText('Light: --dsw-alias-label-shimmer') as HTMLInputElement
    const exprRow = exprField.closest('label')!
    expect(within(exprRow as HTMLElement).getByRole('button', { name: /^Build color-mix:/ })).not.toBeNull()
    // Switching the literal field to expression mode swaps the action button.
    fireEvent.click(within(literalRow as HTMLElement).getByRole('button', { name: /^Switch input mode:/ }))
    expect(within(literalRow as HTMLElement).getByRole('button', { name: /^Build color-mix:/ })).not.toBeNull()
    // Switching an opaque expression back to literal mode pre-fills the hex.
    const deepField = within(dialog()).getByLabelText('Light: --dsw-alias-label-deep-diving') as HTMLInputElement
    const deepRow = deepField.closest('label') as HTMLElement
    fireEvent.click(within(deepRow).getByRole('button', { name: /^Switch input mode:/ }))
    expect(deepField.value).toMatch(/^#[\da-f]{6}$/i)
    expect(within(deepRow).getByRole('button', { name: /^Palette:/ })).not.toBeNull()
  })

  it('opens the palette popover with a picker and writes swatch clicks back', () => {
    mountDialog()
    const field = within(dialog()).getByLabelText('Light: --dsw-alias-label-primary') as HTMLInputElement
    fireEvent.click(within(field.closest('label') as HTMLElement).getByRole('button', { name: /^Palette:/ }))
    const pop = document.querySelector('[role="group"][aria-label="Palette"]')!
    expect(pop).not.toBeNull()
    expect(pop.querySelector('input[type="color"]')).not.toBeNull()
    fireEvent.click(within(pop as HTMLElement).getByRole('button', { name: '#D97757' }))
    expect(field.value).toBe('#D97757')
    // Unresolvable previews still keep the raw expression usable.
    const shimmer = within(dialog()).getByLabelText('Light: --dsw-alias-label-shimmer') as HTMLInputElement
    expect(shimmer.value).toContain('color-mix(')
  })

  it('returns focus to the palette trigger when Escape closes the portaled panel', () => {
    mountDialog()
    const field = within(dialog()).getByLabelText('Light: --dsw-alias-label-primary')
    const trigger = within(field.closest('label') as HTMLElement).getByRole('button', { name: /^Palette:/ })
    fireEvent.click(trigger)
    const pop = screen.getByRole('group', { name: 'Palette' })
    const picker = pop.querySelector('input[type="color"]') as HTMLInputElement
    picker.focus()
    fireEvent.keyDown(picker, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Palette' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('builds a color-mix expression from the structured editor', () => {
    mountDialog()
    const field = within(dialog()).getByLabelText('Light: --dsw-alias-label-shimmer') as HTMLInputElement
    const row = field.closest('label') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: /^Build color-mix:/ }))
    // The builder parses the existing fade(color, 30) expression.
    const percent = within(row).getByLabelText(/^Percent %/) as HTMLInputElement
    expect(percent.value).toBe('30')
    const withInput = within(row).getByLabelText(/^Mix with/) as HTMLInputElement
    expect(withInput.value).toBe('transparent')
    fireEvent.change(percent, { target: { value: '60' } })
    fireEvent.click(within(row).getByRole('button', { name: 'Apply' }))
    expect(field.value).toBe('color-mix(in srgb, #141413 60%, transparent)')
  })

  it('shows the save failure banner and disables controls while settings are unavailable', () => {
    const b = mountDialog({ saveError: true, settingsReady: false })
    expect(dialog().textContent).toContain('could not be saved')
    expect((nameInput() as HTMLInputElement).disabled).toBe(true)
    expect(within(dialog()).getByRole('button', { name: 'Save theme' }).getAttribute('disabled')).not.toBeNull()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }))
    expect(b.onClose).toHaveBeenCalledOnce()
  })
})
