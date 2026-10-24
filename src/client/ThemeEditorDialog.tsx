import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, Input, Menu, Modal, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { ChevronDownIcon, RefreshIcon, SearchIcon } from '../compat/menu-icons.tsx'
import { Checkbox, RefInput } from '../compat/ui-atoms.tsx'
import { formatLocale, type ThemeStudioKey } from './locales.ts'
import { hasTokenDescription } from './token-descriptions.ts'
import { ColorValueField } from './ColorValueField.tsx'
import { ThemePreviewCard } from './ThemePreviewCard.tsx'
import {
  editorTokenCategories, themeEditorId, validateThemeEditor,
  type EditorTokenCategory, type EditorTokenGroup,
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
const FOCUSABLE_META = new Set(['name', 'id', 'description', 'author'])
const EXTRA_SWATCHES: readonly string[] = ['black', 'white', 'transparent']

/** Which page the left rail shows in the content pane. */
type NavSelection =
  | { readonly kind: 'meta' }
  | { readonly kind: 'category'; readonly prefix: string }
  | { readonly kind: 'group'; readonly prefix: string }

/** Nav display name: the group prefix with its category prefix stripped. */
function navName(category: EditorTokenCategory, group: EditorTokenGroup): string {
  const text = group.display.startsWith(`${category.prefix}-`)
    ? group.display.slice(category.prefix.length + 1)
    : group.display
  return text
}

/** Row display name: the token name with its group prefix stripped. */
function shortTokenName(group: EditorTokenGroup, token: string): string {
  if (token.startsWith(`${group.prefix}-`)) return token.slice(group.prefix.length + 1)
  const segments = token.split('-').filter(segment => segment !== '')
  return segments[segments.length - 1] ?? token
}

export function ThemeEditorDialog({
  open, draft, onDraftChange, bases, createDraft, takenIds, settingsReady, saveError, onSave, onClose, t,
}: ThemeEditorDialogProps) {
  const categories = useMemo(() => editorTokenCategories(), [])
  const [selection, setSelection] = useState<NavSelection>({ kind: 'meta' })
  const [baseOpen, setBaseOpen] = useState(false)
  const [problemsOpen, setProblemsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [modifiedOnly, setModifiedOnly] = useState(false)
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
  const fieldErrors = (path: string): readonly ThemeEditorError[] =>
    errors.filter(error => error.path === path)

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
  }, [pendingFocus, search, modifiedOnly, selection, draft])

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

  /** Tokens whose draft value differs from the base's compiled value in either scheme. */
  const modified = useMemo(() => {
    const set = new Set<string>()
    if (draft === null || compiled === null) return set
    for (const cat of categories) {
      for (const group of cat.groups) {
        for (const token of group.tokens) {
          const light = draft.values.light[token] ?? compiled.light[token]
          const dark = draft.values.dark[token] ?? compiled.dark[token]
          if (light !== compiled.light[token] || dark !== compiled.dark[token]) set.add(token)
        }
      }
    }
    return set
  }, [draft, compiled, categories])

  const errorTokens = useMemo(() => {
    const set = new Set<string>()
    for (const error of errors) {
      const token = error.path === undefined ? undefined : TOKEN_PATH.exec(error.path)?.[1]
      if (token !== undefined) set.add(token)
    }
    return set
  }, [errors])

  const findGroup = (token: string): { category: EditorTokenCategory; group: EditorTokenGroup } | undefined => {
    for (const cat of categories) {
      const group = cat.groups.find(entry => entry.tokens.includes(token))
      if (group !== undefined) return { category: cat, group }
    }
    return undefined
  }

  const jumpTo = (path: string | undefined): void => {
    if (!focusable(path)) return
    const token = TOKEN_PATH.exec(path ?? '')?.[1]
    if (token !== undefined) {
      const owner = findGroup(token)
      if (owner !== undefined) setSelection({ kind: 'group', prefix: owner.group.prefix })
      setSearch('')
      setModifiedOnly(false)
    } else {
      setSelection({ kind: 'meta' })
    }
    setPendingFocus(path ?? null)
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

  const query = search.trim().toLowerCase()
  const searching = query !== ''
  const tokenFilter = (token: string): boolean =>
    token.toLowerCase().includes(query) && (!modifiedOnly || modified.has(token))
  const sections = (cats: readonly EditorTokenCategory[]) => cats.flatMap(cat =>
    cat.groups
      .map(group => ({ category: cat, group, tokens: group.tokens.filter(tokenFilter) }))
      .filter(entry => entry.tokens.length > 0))
  const visibleGroups = draft === null ? [] : searching
    ? sections(categories)
    : selection.kind === 'group'
      ? sections(categories.filter(cat => cat.groups.some(group => group.prefix === selection.prefix)))
        .filter(entry => entry.group.prefix === selection.prefix)
      : selection.kind === 'category'
        ? sections(categories.filter(cat => cat.prefix === selection.prefix))
        : []
  const resultCount = visibleGroups.reduce((count, entry) => count + entry.tokens.length, 0)
  const multiSection = searching || selection.kind === 'category'

  const groupStatus = (group: EditorTokenGroup): 'error' | 'modified' | null => {
    if (group.tokens.some(token => errorTokens.has(token))) return 'error'
    if (group.tokens.some(token => modified.has(token))) return 'modified'
    return null
  }

  const baseItems: MenuEntry[] = draft === null ? [] : [
    ...(bases.some(base => base.id === draft.baseId)
      ? []
      : [{ id: draft.baseId, label: draft.base.name, disabled: true }]),
    ...bases.map(base => ({ id: base.id, label: base.name })),
  ]
  const problemItems: MenuEntry[] = errors.map((error, index) => ({
    id: `ts-editor-problem-${index}`,
    label: message(error),
    disabled: !focusable(error.path),
  }))

  const metaField = (
    id: string, path: string, label: string, control: ReactNode,
  ) => (
    <div className={css.editorField}>
      <label className={css.editorLabel} htmlFor={id}>{label}</label>
      {control}
      {fieldErrors(path).map((error, index) => (
        <p key={index} className={css.fieldError}>{message(error)}</p>
      ))}
    </div>
  )

  const renderValueCell = (token: string, scheme: ThemeEditorScheme) => {
    if (draft === null || compiled === null || resolveMaps === null) return null
    const path = `overrides.${scheme}.${token}`
    return (
      <div key={scheme} className={css.tokenValueCell} data-scheme={scheme}>
        <span className={css.tokenScheme}>{t(`editor.scheme.${scheme}` as ThemeStudioKey)}</span>
        <ColorValueField
          key={`${draft.baseId}:${scheme}:${token}`}
          value={draft.values[scheme][token] ?? ''}
          baseValue={compiled[scheme][token] ?? ''}
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
      </div>
    )
  }

  const metaPage = draft === null ? null : (
    <div className={css.editorMetaPage}>
      {metaField('ts-editor-base', 'base', t('editor.base'), (
        <>
          <Menu
            open={baseOpen}
            onClose={() => { setBaseOpen(false) }}
            items={baseItems}
            selectedId={draft.baseId}
            onSelect={(id) => {
              const next = createDraft(id)
              if (next !== undefined) update(next)
              setBaseOpen(false)
            }}
            align="start"
            portal
            anchor={(
              <Button
                id="ts-editor-base"
                className={css.editorSelect ?? ''}
                disabled={!settingsReady}
                aria-haspopup="menu"
                aria-expanded={baseOpen}
                onClick={() => { setBaseOpen(open => !open) }}
              >
                <span className={css.editorDropdownName}>{draft.base.name}</span>
                <ChevronDownIcon className={css.chevron} />
              </Button>
            )}
          />
          <p className={css.editorHelp}>{t('editor.baseHelp')}</p>
        </>
      ))}
      {metaField('ts-editor-name', 'name', t('editor.name'), (
        <RefInput
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
      ))}
      {metaField('ts-editor-id', 'id', t('editor.id'), (
        <div className={css.editorIdRow}>
          <RefInput
            id="ts-editor-id"
            ref={registerField('id')}
            className={css.editorIdInput ?? ''}
            value={draft.id}
            disabled={!settingsReady}
            aria-invalid={invalid.has('id') || undefined}
            aria-describedby={describedBy('id')}
            onChange={(event) => { update({ ...draft, id: event.target.value, idEdited: true }) }}
          />
          <Button
            variant="outline"
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
      ))}
      {metaField('ts-editor-author', 'author', t('editor.author'), (
        <RefInput
          id="ts-editor-author"
          ref={registerField('author')}
          value={draft.author}
          disabled={!settingsReady}
          aria-invalid={invalid.has('author') || undefined}
          aria-describedby={describedBy('author')}
          onChange={(event) => { update({ ...draft, author: event.target.value }) }}
        />
      ))}
      {metaField('ts-editor-description', 'description', t('editor.description'), (
        <textarea
          id="ts-editor-description"
          ref={registerField('description')}
          className={css.editorTextarea}
          value={draft.description}
          disabled={!settingsReady}
          rows={4}
          aria-invalid={invalid.has('description') || undefined}
          aria-describedby={describedBy('description')}
          onChange={(event) => { update({ ...draft, description: event.target.value }) }}
        />
      ))}
    </div>
  )

  const tokenPane = draft === null || resolveMaps === null ? null : (
    <div className={css.editorPane}>
      <ThemePreviewCard tokens={resolveMaps} t={t} />
      <div className={css.editorToolbar}>
        <Input
          type="search"
          icon={<SearchIcon size={16} />}
          className={css.editorSearch ?? ''}
          value={search}
          aria-label={t('editor.search')}
          placeholder={t('editor.search')}
          onChange={(event) => { setSearch(event.target.value) }}
        />
        <Checkbox
          className={css.editorOnlyModified ?? ''}
          checked={modifiedOnly}
          label={t('editor.onlyModified')}
          onChange={setModifiedOnly}
        />
      </div>
      {searching ? (
        <p className={css.editorResults}>{formatLocale(t('editor.results'), { count: resultCount })}</p>
      ) : null}
      <div className={css.editorScroll}>
        <div className={css.tokenHead}>
          <span>{t('editor.table.token')}</span>
          <span>{t('editor.scheme.light')}</span>
          <span>{t('editor.scheme.dark')}</span>
          <span />
        </div>
        {resultCount === 0 ? <p className={css.modalText}>{t('editor.emptySearch')}</p> : null}
        {visibleGroups.map(({ category, group, tokens }) => (
          <section key={group.prefix} className={css.tokenSection}>
            {multiSection ? (
              <h3 className={css.tokenSectionTitle}>
                <span className={css.tokenSectionName}>{navName(category, group)}</span>
                <span className={css.tokenSectionCount}>{tokens.length}</span>
              </h3>
            ) : null}
            {tokens.map((token) => {
              const description = hasTokenDescription(token) ? t(`token.${token}` as ThemeStudioKey) : ''
              const rowModified = modified.has(token)
              const rowError = errorTokens.has(token)
              return (
                <div key={token} className={css.tokenRow}>
                  <div className={css.tokenNameCell}>
                    <span className={css.tokenNameLine}>
                      {rowModified ? <span className={css.modDot} aria-hidden="true" /> : null}
                      <span
                        className={rowError ? css.tokenNameError : css.tokenName}
                        title={token}
                      >
                        {shortTokenName(group, token)}
                      </span>
                    </span>
                    {description === '' ? null : <span className={css.tokenDesc}>{description}</span>}
                  </div>
                  {SCHEMES.map(scheme => renderValueCell(token, scheme))}
                  <span className={css.tokenAction}>
                    {rowModified ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={css.tokenReset ?? ''}
                        aria-label={formatLocale(t('editor.resetToken'), { token })}
                        disabled={!settingsReady}
                        onClick={() => {
                          const light = compiled?.light[token]
                          const dark = compiled?.dark[token]
                          if (light === undefined || dark === undefined) return
                          update({
                            ...draft,
                            values: {
                              light: { ...draft.values.light, [token]: light },
                              dark: { ...draft.values.dark, [token]: dark },
                            },
                          })
                        }}
                      >
                        <RefreshIcon />
                      </Button>
                    ) : null}
                  </span>
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('editor.title')}
      closeLabel={t('action.close')}
      className={css.editorDialog ?? ''}
      contentClassName={css.editorBody ?? ''}
      footer={(
        <div className={css.editorFooter}>
          <div className={css.statusArea}>
            {saveError ? (
              <span role="alert"><Tag tone="danger">{t('status.saveFailed')}</Tag></span>
            ) : null}
            {errors.length > 0 ? (
              <Menu
                open={problemsOpen}
                onClose={() => { setProblemsOpen(false) }}
                items={problemItems}
                onSelect={(id) => {
                  const index = Number(id.replace('ts-editor-problem-', ''))
                  jumpTo(errors[index]?.path)
                  setProblemsOpen(false)
                }}
                align="start"
                side="top"
                portal
                anchor={(
                  <button
                    type="button"
                    className={css.statusTagButton}
                    aria-haspopup="menu"
                    aria-expanded={problemsOpen}
                    onClick={() => { setProblemsOpen(open => !open) }}
                  >
                    <Tag tone="danger">{formatLocale(t('editor.problems'), { count: errors.length })}</Tag>
                  </button>
                )}
              />
            ) : validation !== null && validation.ok ? (
              <Tag tone={validation.summary.failed + validation.summary.unknown === 0 ? 'success' : 'warning'}>
                {validation.summary.failed + validation.summary.unknown === 0
                  ? t('editor.status.contrastPass')
                  : formatLocale(t('editor.status.contrastWarn'), {
                    failed: validation.summary.failed,
                    unknown: validation.summary.unknown,
                  })}
              </Tag>
            ) : null}
            {modified.size > 0 ? (
              <Tag tone="neutral">{formatLocale(t('editor.modifiedCount'), { count: modified.size })}</Tag>
            ) : null}
          </div>
          <div className={css.footerButtons}>
            <Button onClick={onClose}>{t('action.cancel')}</Button>
            <Button
              variant="primary"
              disabled={!settingsReady || draft === null || validation === null || !validation.ok}
              onClick={submit}
            >
              {t('editor.save')}
            </Button>
          </div>
        </div>
      )}
    >
      {draft === null || resolveMaps === null ? null : (
        <div className={css.editorShell}>
          <ul className={css.live}>
            {errors.map((error, index) => (
              <li key={index} id={`ts-editor-error-${index}`}>{message(error)}</li>
            ))}
          </ul>
          <nav className={css.editorNav} aria-label={t('editor.nav')}>
            <button
              type="button"
              className={css.navItem}
              aria-current={selection.kind === 'meta' ? 'page' : undefined}
              onClick={() => { setSelection({ kind: 'meta' }); setSearch('') }}
            >
              <span className={css.navItemName}>{t('editor.navMeta')}</span>
            </button>
            {categories.map(cat => (
              <div key={cat.prefix} className={css.navGroup}>
                <button
                  type="button"
                  className={css.navCaption}
                  aria-current={selection.kind === 'category' && selection.prefix === cat.prefix ? 'page' : undefined}
                  onClick={() => { setSelection({ kind: 'category', prefix: cat.prefix }); setSearch('') }}
                >
                  {cat.prefix}
                </button>
                {cat.groups.map(group => {
                  const status = groupStatus(group)
                  const selected = selection.kind === 'group' && selection.prefix === group.prefix
                  return (
                    <button
                      key={group.prefix}
                      type="button"
                      className={css.navItem}
                      aria-current={selected ? 'page' : undefined}
                      onClick={() => { setSelection({ kind: 'group', prefix: group.prefix }); setSearch('') }}
                    >
                      {status !== null ? (
                        <span
                          className={status === 'error' ? css.navDotError : css.navDot}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className={css.navItemName}>{navName(cat, group)}</span>
                      <span className={css.navItemCount}>{group.tokens.length}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>
          <div className={css.editorContent}>
            {selection.kind === 'meta' && !searching ? metaPage : tokenPane}
          </div>
        </div>
      )}
    </Modal>
  )
}
