import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { formatLocale, type ThemeStudioKey } from './locales.ts'
import {
  editorTokenGroups, themeEditorId, validateThemeEditor,
  type ThemeEditorDraft, type ThemeEditorError, type ThemeEditorScheme,
} from './theme-editor.ts'
import { readId, uniqueThemeId } from './theme-file.ts'
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

export function ThemeEditorDialog({
  open, draft, onDraftChange, bases, createDraft, takenIds, settingsReady, saveError, onSave, onClose, t,
}: ThemeEditorDialogProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [search, setSearch] = useState('')
  const [submitErrors, setSubmitErrors] = useState<readonly ThemeEditorError[] | null>(null)
  const [pendingFocus, setPendingFocus] = useState<string | null>(null)
  const fields = useRef(new Map<string, HTMLElement>())
  const groups = useMemo(() => editorTokenGroups(), [])
  const takenKey = takenIds().join(' ')
  const validation = useMemo(
    () => draft === null ? null : validateThemeEditor(draft, new Set(takenIds())),
    [draft, takenKey, takenIds],
  )
  const errors: readonly ThemeEditorError[] = submitErrors
    ?? (validation !== null && !validation.ok ? validation.errors : [])
  const invalid = new Set(errors.map(error => error.path).filter((path): path is string => path !== undefined))
  const FOCUSABLE_META = new Set(['name', 'id', 'description', 'author'])
  const focusable = (path: string | undefined): boolean => {
    if (path === undefined) return false
    if (FOCUSABLE_META.has(path)) return true
    const token = TOKEN_PATH.exec(path)?.[1]
    return token !== undefined && groups.some(group => group.tokens.includes(token))
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
  }, [pendingFocus, expanded, search, draft])

  const jumpTo = (path: string | undefined): void => {
    if (!focusable(path)) return
    const token = TOKEN_PATH.exec(path ?? '')?.[1]
    if (token !== undefined) {
      const owner = groups.find(group => group.tokens.includes(token))
      if (owner !== undefined) setExpanded(current => new Set(current).add(owner.prefix))
      setSearch('')
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
  const visibleGroups = groups
    .map(group => ({ prefix: group.prefix, tokens: group.tokens.filter(token => token.toLowerCase().includes(query)) }))
    .filter(group => group.tokens.length > 0)

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
      {draft === null ? null : (
        <div className={css.editorFields}>
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
              rows={2}
              aria-invalid={invalid.has('description') || undefined}
              aria-describedby={describedBy('description')}
              onChange={(event) => { update({ ...draft, description: event.target.value }) }}
            />
          </div>
          <input
            type="search"
            className={css.editorSearch}
            value={search}
            aria-label={t('editor.search')}
            placeholder={t('editor.search')}
            onChange={(event) => { setSearch(event.target.value) }}
          />
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
                    {group.prefix} ({group.tokens.length})
                  </button>
                  {isOpen ? (
                    <div id={panelId} className={css.editorTokens}>
                      {group.tokens.map(token => (
                        <div key={token} className={css.tokenRow}>
                          <span className={css.tokenName} title={token}>{token}</span>
                          {SCHEMES.map((scheme) => {
                            const path = `overrides.${scheme}.${token}`
                            return (
                              <label key={scheme} className={css.tokenValue}>
                                <span className={css.tokenScheme}>{t(`editor.scheme.${scheme}` as ThemeStudioKey)}</span>
                                <input
                                  ref={registerField(path)}
                                  value={draft.values[scheme][token] ?? ''}
                                  aria-label={`${t(`editor.scheme.${scheme}` as ThemeStudioKey)}: ${token}`}
                                  aria-invalid={invalid.has(path) || undefined}
                                  aria-describedby={describedBy(path)}
                                  disabled={!settingsReady}
                                  onChange={(event) => {
                                    update({
                                      ...draft,
                                      values: {
                                        ...draft.values,
                                        [scheme]: { ...draft.values[scheme], [token]: event.target.value },
                                      },
                                    })
                                  }}
                                />
                              </label>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
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
      )}
    </Modal>
  )
}
