import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Menu, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { ChevronDownIcon } from '../compat/menu-icons.tsx'
import { formatLocale, type ThemeStudioKey } from './locales.ts'
import { hasTokenDescription } from './token-descriptions.ts'
import { ColorValueField } from './ColorValueField.tsx'
import {
  editorTokenCategories, themeEditorId, validateThemeEditor,
  type ThemeEditorDraft, type ThemeEditorError, type ThemeEditorScheme,
} from './theme-editor.ts'
import { compileThemeFile, readId, uniqueThemeId } from './theme-file.ts'
import css from './ThemeStudioRow.module.css'

export interface ThemeEditorDialogProps {
  open: boolean
  draft: ThemeEditorDraft | null
  onDraftChange: (draft: ThemeEditorDraft) => void
  bases: readonly { id: string; name: string }[]
  createDraft: (id: string) => ThemeEditorDraft | undefined
  takenIds: () => readonly string[]
  settingsReady: boolean
  saveError: boolean
  onSave: (source: Record<string, unknown>) => void
  onClose: () => void
  t: (key: ThemeStudioKey) => string
}

const SCHEMES: readonly ThemeEditorScheme[] = ['light', 'dark']
const TOKEN_PATH = /^overrides\.(?:light|dark)\.(--.+)$/
const ACTION_ALL = 'ts-editor:select-all'
const ACTION_NONE = 'ts-editor:select-none'
const FOCUSABLE_META = new Set(['name', 'id', 'description', 'author'])
const EXTRA_SWATCHES: readonly string[] = ['black', 'white', 'transparent']

export function ThemeEditorDialog({
  open, draft, onDraftChange, bases, createDraft, takenIds, settingsReady, saveError, onSave, onClose, t,
}: ThemeEditorDialogProps) {
  const categories = useMemo(() => editorTokenCategories(), [])
  const [category, setCategory] = useState(categories[0]?.prefix ?? '')
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(categories[0]?.groups.map(group => group.prefix) ?? []),
  )
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(categories[0]?.groups[0] === undefined ? [] : [categories[0].groups[0].prefix]),
  )
  const [catOpen, setCatOpen] = useState(false)
  const [grpOpen, setGrpOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [submitErrors, setSubmitErrors] = useState<readonly ThemeEditorError[] | null>(null)
  const [pendingFocus, setPendingFocus] = useState<string | null>(null)
  const fields = useRef(new Map<string, HTMLElement>())
  const takenKey = takenIds().join(' ')
  const validation = useMemo(
    () => draft === null ? null : validateThemeEditor(draft, new Set(takenIds())),
    [draft, takenKey, takenIds],
  )
  const errors: readonly ThemeEditorError[] = submitErrors
    ?? (validation !== null && !validation.ok ? validation.errors : [])
  const invalid = new Set(errors.map(error => error.path).filter((path): path is string => path !== undefined))
  const focusable = (path: string | undefined): boolean => {
    if (path === undefined) return false
    if (FOCUSABLE_META.has(path)) return true
    const token = TOKEN_PATH.exec(path)?.[1]
    return token !== undefined && categories.some(cat => cat.groups.some(group => group.tokens.includes(token)))
  }
  const describedBy = (path: string): string | undefined => {
    const ids = errors.flatMap((error, index) => error.path === path ? [`ts-editor-error-${index}`] : [])
    return ids.length === 0 ? undefined : ids.join(' ')
  }

  const update = (next: ThemeEditorDraft): void => {
    setSubmitErrors(null)
    onDraftChange(next)
  }
  const registerField = (path: string) => (element: HTMLElement | null): void => {
    if (element === null) fields.current.delete(path)
    else fields.current.set(path, element)
  }

  useEffect(() => {
    if (pendingFocus === null) return
    const element = fields.current.get(pendingFocus)
    if (element === undefined) return
    setPendingFocus(null)
    element.focus()
    if (typeof element.scrollIntoView === 'function') element.scrollIntoView({ block: 'nearest' })
  }, [pendingFocus, expanded, search, checked, category, draft])

  const activeCategory = categories.find(cat => cat.prefix === category) ?? categories[0]

  const jumpTo = (path: string | undefined): void => {
    if (!focusable(path)) return
    const token = TOKEN_PATH.exec(path ?? '')?.[1]
    if (token !== undefined) {
      const owner = categories.find(cat => cat.groups.some(group => group.tokens.includes(token)))
      const group = owner?.groups.find(entry => entry.tokens.includes(token))
      if (owner !== undefined && group !== undefined) {
        setCategory(owner.prefix)
        setChecked(current => new Set(current).add(group.prefix))
        setExpanded(current => new Set(current).add(group.prefix))
      }
      setSearch('')
    }
    setPendingFocus(path ?? null)
  }

  const selectCategory = (prefix: string): void => {
    const next = categories.find(cat => cat.prefix === prefix)
    if (next === undefined) return
    setCategory(next.prefix)
    setChecked(new Set(next.groups.map(group => group.prefix)))
    setExpanded(new Set(next.groups[0] === undefined ? [] : [next.groups[0].prefix]))
    setSearch('')
  }

  const toggleGroup = (prefix: string): void => {
    const adding = !checked.has(prefix)
    setChecked(current => {
      const next = new Set(current)
      if (next.has(prefix)) next.delete(prefix)
      else next.add(prefix)
      return next
    })
    if (adding) setExpanded(current => new Set(current).add(prefix))
  }

  const submit = (): void => {
    if (!settingsReady || draft === null) return
    const fresh = validateThemeEditor(draft, new Set(takenIds()))
    if (!fresh.ok) {
      setSubmitErrors(fresh.errors)
      jumpTo(fresh.errors[0]?.path)
      return
    }
    onSave(fresh.source)
  }

  const message = (error: ThemeEditorError): string => {
    if (error.code === 'id-taken') {
      return formatLocale(t('editor.error.idTaken'), { detail: error.detail ?? '' })
    }
    if (error.code === 'too-large') {
      const contribution = error.detail?.split('largest contribution: ')[1] ?? error.path ?? 'source'
      return formatLocale(t('editor.error.tooLarge'), { detail: contribution })
    }
    const key = `import.error.${error.code}` as ThemeStudioKey
    return formatLocale(t(key), { path: error.path ?? '', detail: error.detail ?? '' })
  }

  const compiled = useMemo(
    () => draft === null ? null : compileThemeFile(draft.base).tokens,
    [draft?.base],
  )
  const resolveMaps = useMemo(
    () => compiled === null || draft === null ? null : {
      light: { ...compiled.light, ...draft.values.light },
      dark: { ...compiled.dark, ...draft.values.dark },
    },
    [compiled, draft],
  )
  const swatchLists = useMemo(() => {
    if (draft === null) return { light: EXTRA_SWATCHES, dark: EXTRA_SWATCHES }
    const build = (values: readonly string[]): readonly string[] => {
      const seen = new Set<string>()
      const list: string[] = []
      for (const value of [...values, ...EXTRA_SWATCHES]) {
        if (seen.has(value)) continue
        seen.add(value)
        list.push(value)
      }
      return Object.freeze(list)
    }
    return { light: build(Object.values(draft.base.palette.light)), dark: build(Object.values(draft.base.palette.dark)) }
  }, [draft])

  const query = search.trim().toLowerCase()
  const visibleGroups = (activeCategory?.groups ?? [])
    .filter(group => checked.has(group.prefix))
    .map(group => ({ ...group, tokens: group.tokens.filter(token => token.toLowerCase().includes(query)) }))
    .filter(group => group.tokens.length > 0)

  const categoryItems: MenuEntry[] = categories.map(cat => ({
    id: cat.prefix,
    label: `${cat.prefix} (${cat.groups.reduce((count, group) => count + group.tokens.length, 0)})`,
  }))
  const groupItems: MenuEntry[] = (activeCategory?.groups ?? []).map(group => ({
    id: group.prefix,
    label: `${group.display} (${group.tokens.length})`,
  }))
  const groupFooter: MenuEntry[] = [
    { id: ACTION_ALL, label: t('editor.selectAll') },
    { id: ACTION_NONE, label: t('editor.selectNone') },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('editor.title')}
      closeLabel={t('action.close')}
      className={css.editorDialog ?? ''}
      contentClassName={css.editorBody ?? ''}
      footer={(
        <>
          <Button onClick={onClose}>{t('action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={!settingsReady || draft === null || validation === null || !validation.ok}
            onClick={submit}
          >
            {t('editor.save')}
          </Button>
        </>
      )}
    >
      {draft === null || resolveMaps === null ? null : (
        <div className={css.editorShell}>
          {saveError || errors.length > 0 || (validation !== null && validation.ok) ? (
            <div className={css.editorBanner}>
              {saveError ? <p className={css.alert} role="alert">{t('status.saveFailed')}</p> : null}
              {errors.length > 0 ? (
                <div className={css.editorErrors}>
                  <p className={css.modalWarn}>{t('editor.errors')}</p>
                  <ul className={css.editorErrorList}>
                    {errors.map((error, index) => (
                      <li key={index} id={`ts-editor-error-${index}`}>
                        {focusable(error.path)
                          ? <button type="button" className={css.errorLink} onClick={() => { jumpTo(error.path) }}>{message(error)}</button>
                          : <span className={css.modalWarn}>{message(error)}</span>}
                      </li>
                    ))}
                  </ul>
                  {errors.some(error => focusable(error.path)) ? (
                    <Button size="sm" onClick={() => { jumpTo(errors.find(error => focusable(error.path))?.path) }}>{t('editor.firstError')}</Button>
                  ) : null}
                </div>
              ) : null}
              {validation !== null && validation.ok ? (
                <p className={validation.summary.failed + validation.summary.unknown === 0 ? css.modalText : css.modalWarn}>
                  {validation.summary.failed + validation.summary.unknown === 0
                    ? t('import.contrast.pass')
                    : formatLocale(t('import.contrast.warn'), {
                      failed: validation.summary.failed,
                      unknown: validation.summary.unknown,
                    })}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className={css.editorColumns}>
            <div className={css.editorMeta}>
              <div className={css.editorField}>
                <label className={css.editorLabel} htmlFor="ts-editor-base">{t('editor.base')}</label>
                <select
                  id="ts-editor-base"
                  disabled={!settingsReady}
                  value={draft.baseId}
                  onChange={(event) => {
                    const next = createDraft(event.target.value)
                    if (next !== undefined) update(next)
                  }}
                >
                  {bases.some(base => base.id === draft.baseId) ? null : (
                    <option value={draft.baseId} disabled>{draft.base.name}</option>
                  )}
                  {bases.map(base => <option key={base.id} value={base.id}>{base.name}</option>)}
                </select>
                <p className={css.editorHelp}>{t('editor.baseHelp')}</p>
              </div>
              <div className={css.editorField}>
                <label className={css.editorLabel} htmlFor="ts-editor-name">{t('editor.name')}</label>
                <input
                  id="ts-editor-name"
                  ref={registerField('name')}
                  value={draft.name}
                  disabled={!settingsReady}
                  data-modal-autofocus
                  aria-invalid={invalid.has('name') || undefined}
                  aria-describedby={describedBy('name')}
                  onChange={(event) => {
                    const name = event.target.value
                    update({
                      ...draft,
                      name,
                      ...(draft.idEdited ? {} : { id: themeEditorId(name, new Set(takenIds())) }),
                    })
                  }}
                />
              </div>
              <div className={css.editorField}>
                <label className={css.editorLabel} htmlFor="ts-editor-id">{t('editor.id')}</label>
                <div className={css.editorIdRow}>
                  <input
                    id="ts-editor-id"
                    ref={registerField('id')}
                    value={draft.id}
                    disabled={!settingsReady}
                    aria-invalid={invalid.has('id') || undefined}
                    aria-describedby={describedBy('id')}
                    onChange={(event) => { update({ ...draft, id: event.target.value, idEdited: true }) }}
                  />
                  <Button
                    size="sm"
                    disabled={!settingsReady}
                    onClick={() => {
                      const taken = new Set(takenIds())
                      const id = readId(draft.id) === null && taken.has(draft.id)
                        ? uniqueThemeId(draft.id, taken)
                        : themeEditorId(draft.name, taken)
                      update({ ...draft, id, idEdited: true })
                    }}
                  >
                    {t('editor.generateId')}
                  </Button>
                </div>
              </div>
              <div className={css.editorField}>
                <label className={css.editorLabel} htmlFor="ts-editor-author">{t('editor.author')}</label>
                <input
                  id="ts-editor-author"
                  ref={registerField('author')}
                  value={draft.author}
                  disabled={!settingsReady}
                  aria-invalid={invalid.has('author') || undefined}
                  aria-describedby={describedBy('author')}
                  onChange={(event) => { update({ ...draft, author: event.target.value }) }}
                />
              </div>
              <div className={css.editorField}>
                <label className={css.editorLabel} htmlFor="ts-editor-description">{t('editor.description')}</label>
                <textarea
                  id="ts-editor-description"
                  ref={registerField('description')}
                  value={draft.description}
                  disabled={!settingsReady}
                  rows={4}
                  aria-invalid={invalid.has('description') || undefined}
                  aria-describedby={describedBy('description')}
                  onChange={(event) => { update({ ...draft, description: event.target.value }) }}
                />
              </div>
            </div>
            <div className={css.editorPanel}>
              <div className={css.editorToolbar}>
                <Menu
                  open={catOpen}
                  onClose={() => { setCatOpen(false) }}
                  items={categoryItems}
                  selectedId={activeCategory?.prefix}
                  onSelect={(id) => {
                    selectCategory(id)
                    setCatOpen(false)
                  }}
                  align="start"
                  portal
                  anchor={(
                    <button
                      type="button"
                      className={css.editorDropdown}
                      aria-haspopup="menu"
                      aria-expanded={catOpen}
                      aria-label={t('editor.category')}
                      onClick={() => { setCatOpen(open => !open) }}
                    >
                      <span className={css.editorDropdownName}>{activeCategory?.prefix}</span>
                      <ChevronDownIcon className={css.chevron} />
                    </button>
                  )}
                />
                <Menu
                  open={grpOpen}
                  onClose={() => { setGrpOpen(false) }}
                  items={groupItems}
                  selectedIds={[...checked]}
                  onSelect={(id) => {
                    if (id === ACTION_ALL) {
                      setChecked(new Set((activeCategory?.groups ?? []).map(group => group.prefix)))
                    } else if (id === ACTION_NONE) {
                      setChecked(new Set())
                    } else {
                      toggleGroup(id)
                    }
                  }}
                  footer={groupFooter}
                  align="start"
                  portal
                  anchor={(
                    <button
                      type="button"
                      className={css.editorDropdown}
                      aria-haspopup="menu"
                      aria-expanded={grpOpen}
                      onClick={() => { setGrpOpen(open => !open) }}
                    >
                      <span className={css.editorDropdownName}>
                        {checked.size === 0
                          ? t('editor.groupsEmpty')
                          : formatLocale(t('editor.groupsSelected'), { selected: checked.size, total: activeCategory?.groups.length ?? 0 })}
                      </span>
                      <ChevronDownIcon className={css.chevron} />
                    </button>
                  )}
                />
                <input
                  type="search"
                  className={css.editorSearch}
                  value={search}
                  aria-label={t('editor.search')}
                  placeholder={t('editor.search')}
                  onChange={(event) => { setSearch(event.target.value) }}
                />
              </div>
              <div className={css.editorScroll}>
                {visibleGroups.length === 0 ? <p className={css.modalText}>{t('editor.emptySearch')}</p> : null}
                {visibleGroups.map((group) => {
                  const isOpen = query !== '' || expanded.has(group.prefix)
                  const panelId = `ts-editor-group-${group.prefix}`
                  return (
                    <div key={group.prefix} className={css.editorGroup}>
                      <button
                        type="button"
                        className={css.editorGroupHeader}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => {
                          setExpanded(current => {
                            const next = new Set(current)
                            if (next.has(group.prefix)) next.delete(group.prefix)
                            else next.add(group.prefix)
                            return next
                          })
                        }}
                      >
                        {group.display} ({group.tokens.length})
                      </button>
                      {isOpen ? (
                        <div id={panelId} className={css.editorTokens}>
                          {group.tokens.map((token) => {
                            const description = hasTokenDescription(token) ? t(`token.${token}` as ThemeStudioKey) : ''
                            return (
                              <div key={token} className={css.tokenRow}>
                                <div className={css.tokenHead}>
                                  <span className={css.tokenName} title={token}>{token}</span>
                                  {description === '' ? null : <span className={css.tokenDesc}>{description}</span>}
                                </div>
                                <div className={css.tokenFields}>
                                  {SCHEMES.map((scheme) => {
                                    const path = `overrides.${scheme}.${token}`
                                    return (
                                      <label key={scheme} className={css.tokenValue}>
                                        <span className={css.tokenScheme}>{t(`editor.scheme.${scheme}` as ThemeStudioKey)}</span>
                                        <ColorValueField
                                          key={`${draft.baseId}:${scheme}:${token}`}
                                          value={draft.values[scheme][token] ?? ''}
                                          tokens={resolveMaps[scheme]}
                                          swatches={swatchLists[scheme]}
                                          schemeLabel={t(`editor.scheme.${scheme}` as ThemeStudioKey)}
                                          token={token}
                                          disabled={!settingsReady}
                                          invalid={invalid.has(path)}
                                          describedBy={describedBy(path)}
                                          inputRef={registerField(path)}
                                          onChange={(next) => {
                                            update({
                                              ...draft,
                                              values: {
                                                ...draft.values,
                                                [scheme]: { ...draft.values[scheme], [token]: next },
                                              },
                                            })
                                          }}
                                          t={t}
                                        />
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
