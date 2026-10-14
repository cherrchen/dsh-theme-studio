/**
 * Themes preference row registered into the General section item slot:
 * title, description, and a language-row-style selector. The trigger pill
 * opens a Menu whose rows preview on hover; closing the menu restores the
 * applied theme; selecting an option applies it. The menu footer carries
 * theme-file management: import, export, and remove.
 */
import { useEffect, useRef, useState } from 'react'
import { Button, Menu, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ChevronDownIcon } from '../compat/menu-icons.tsx'
import { DEFAULT_PREVIEW } from './presets.ts'
import { THEME_FILE_MAX_LENGTH } from './theme-file.ts'
import type { ImportResolution, ThemeFileInspection } from './theme-import.ts'
import type { ThemeFileError } from './theme-file.ts'
import type { ThemeStudioCard } from './store.ts'
import type { ThemePreview } from './types.ts'
import type { createThemeStudioRowStore } from './store.ts'
import { formatLocale, type ThemeStudioKey } from './locales.ts'
import css from './ThemeStudioRow.module.css'

/** Injected business face: overlay writes and theme-file management. */
export interface ThemeStudioRowInjected {
  /** Start a transient preview; `null` previews Default. */
  previewTheme: (id: string | null) => void
  /** Persist a theme, or Default when `id` is `null`. */
  activateTheme: (id: string | null) => void
  /** Drop the transient preview. */
  cancelPreview: () => void
  /** Parse and inspect one theme file's text without persisting anything. */
  inspectThemeFile: (text: string) => ThemeFileInspection
  /**
   * Persist one imported theme file.
   * @returns the id the theme lands under.
   */
  saveImportedTheme: (source: Record<string, unknown>, mode: ImportResolution) => string
  /** Drop one imported theme from the durable list. */
  removeImportedTheme: (id: string) => void
  /** Download one theme as a `dsh-theme.json` file. */
  exportTheme: (id: string) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type ThemeStudioRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createThemeStudioRowStore>>
  & PropsLocale<'settings.theme-studio'> & ThemeStudioRowInjected

export const NAME_KEYS: Record<string, ThemeStudioKey> = {
  'dsh-theme-studio.claude': 'claude.name',
  'dsh-theme-studio.codex': 'codex.name',
  'dsh-theme-studio.claude-cream': 'claude-cream.name',
  'dsh-theme-studio.graphite': 'graphite.name',
  'dsh-theme-studio.oled': 'oled.name',
  'dsh-theme-studio.nordic': 'nordic.name',
  'dsh-theme-studio.paper': 'paper.name',
  'dsh-theme-studio.warm': 'warm.name',
}

/** MenuItem ids are strings; the Default card carries a `null` theme id. */
const DEFAULT_ITEM_ID = 'default'
/* Menu action ids contain a colon, which theme-file ids cannot carry. */
const ACTION_IMPORT = 'theme-studio:import'
const ACTION_MANAGE = 'theme-studio:manage'

type ImportOk = Extract<ThemeFileInspection, { ok: true }>

type DialogState =
  | { kind: 'error'; error: ThemeFileError }
  | { kind: 'confirm'; inspection: ImportOk }
  | { kind: 'duplicate'; inspection: ImportOk }
  | { kind: 'manage' }

/**
 * Render the Themes row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function ThemeStudioRow({
  t, useStore, previewTheme, activateTheme, cancelPreview,
  inspectThemeFile, saveImportedTheme, removeImportedTheme, exportTheme,
}: ThemeStudioRowComponentProps) {
  const cards = useStore(s => s.cards)
  const activeThemeId = useStore(s => s.activeThemeId)
  const previewThemeId = useStore(s => s.previewThemeId)
  const previewing = useStore(s => s.previewing)
  const settingsStatus = useStore(s => s.settingsStatus)
  const saveError = useStore(s => s.saveError)
  const droppedImports = useStore(s => s.droppedImports)
  const [open, setOpen] = useState(false)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  // A host that unmounts the row while the menu is open (e.g. an Escape that
  // closes the whole Settings surface before Menu's own onClose runs) must
  // not leak the transient preview.
  useEffect(() => () => { cancelPreview() }, [cancelPreview])
  const activeCard = cards.find(card => card.id === activeThemeId)
  const previewCard = cards.find(card => card.id === previewThemeId)
  const previewName = previewing ? cardName(previewCard ?? cards.find(card => card.id === null), t) : ''
  const settingsUnavailable = settingsStatus === 'unavailable'
  const settingsReady = settingsStatus === 'ready'

  const menuItems: MenuEntry[] = []
  let importedHeader = false
  for (const card of cards) {
    if (card.imported === true && !importedHeader) {
      importedHeader = true
      menuItems.push(
        { type: 'separator', id: 'theme-studio:sep-imported' },
        { type: 'label', id: 'theme-studio:lbl-imported', text: t('group.imported') },
      )
    }
    menuItems.push({
      id: card.id ?? DEFAULT_ITEM_ID,
      icon: <Mosaic preview={card.preview.light} onMouseEnter={() => { previewTheme(card.id) }} />,
      label: (
        <span className={css.itemLabel} onMouseEnter={() => { previewTheme(card.id) }}>
          {cardName(card, t)}
        </span>
      ),
    })
  }

  const closeDialog = (): void => { setDialog(null) }
  const confirmImport = (inspection: ImportOk, mode: ImportResolution): void => {
    if (!settingsReady) return
    saveImportedTheme(inspection.source, mode)
    closeDialog()
  }
  const pickFile = async (file: File): Promise<void> => {
    if (file.size > THEME_FILE_MAX_LENGTH) {
      setDialog({ kind: 'error', error: { code: 'too-large', detail: `${file.size} bytes` } })
      return
    }
    const inspection = inspectThemeFile(await file.text())
    if (!inspection.ok) setDialog({ kind: 'error', error: inspection.error })
    else if (inspection.collision === 'imported') setDialog({ kind: 'duplicate', inspection })
    else setDialog({ kind: 'confirm', inspection })
  }

  const manageCards = cards.filter(card => card.id !== null)

  return (
    <div className={css.row}>
      <div className={css.rowText}>
        <div className={css.title}>{t('title')}</div>
        <p className={css.description}>{t('description')}</p>
        {settingsStatus === 'loading' ? <p className={css.status}>{t('status.loading')}</p> : null}
        {settingsUnavailable ? <p className={css.status}>{t('status.unavailable')}</p> : null}
        {saveError ? <p className={css.alert} role="alert">{t('status.saveFailed')}</p> : null}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className={css.fileInput}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (settingsReady && file !== undefined) void pickFile(file)
        }}
      />
      <Menu
        open={open}
        onClose={() => {
          cancelPreview()
          setOpen(false)
        }}
        items={menuItems}
        selectedId={activeThemeId ?? DEFAULT_ITEM_ID}
        onSelect={(id) => {
          if (id === ACTION_IMPORT) { if (settingsReady) fileInput.current?.click() }
          else if (id === ACTION_MANAGE) { if (settingsReady) setDialog({ kind: 'manage' }) }
          else activateTheme(id === DEFAULT_ITEM_ID ? null : id)
          setOpen(false)
        }}
        footer={[
          { id: ACTION_IMPORT, label: t('action.import'), disabled: !settingsReady },
          { id: ACTION_MANAGE, label: t('action.manage'), disabled: !settingsReady },
        ]}
        align="end"
        portal
        closeOnPointerLeave
        anchor={(
          <button
            type="button"
            className={css.selector}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => {
              // Toggling the selector closed bypasses Menu's own onClose;
              // the mounted row still owns the transient preview.
              if (open) cancelPreview()
              setOpen(v => !v)
            }}
          >
            <Mosaic preview={activeCard?.preview.light ?? DEFAULT_PREVIEW.light} />
            {activeCard === undefined ? t('default.name') : cardName(activeCard, t)}
            <ChevronDownIcon className={css.chevron} />
          </button>
        )}
      />
      <div className={css.live} role="status" aria-live="polite">
        {previewing ? formatLocale(t('previewing'), { name: previewName }) : ''}
      </div>

      <Modal
        open={dialog?.kind === 'error'}
        onClose={closeDialog}
        title={t('import.error.title')}
        closeLabel={t('action.close')}
        footer={<Button onClick={closeDialog} data-modal-autofocus>{t('action.close')}</Button>}
      >
        {dialog?.kind === 'error' ? (
          <p className={css.modalText}>{importErrorMessage(t, dialog.error)}</p>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'confirm'}
        onClose={closeDialog}
        title={t('import.confirm.title')}
        closeLabel={t('action.close')}
        footer={dialog?.kind === 'confirm' ? (
          <>
            <Button onClick={closeDialog}>{t('action.cancel')}</Button>
            <Button variant="primary" disabled={!settingsReady} data-modal-autofocus onClick={() => { confirmImport(dialog.inspection, 'append') }}>
              {t('action.confirmImport')}
            </Button>
          </>
        ) : null}
      >
        {dialog?.kind === 'confirm' ? (
          <>
            <p className={css.modalText}>
              {formatLocale(t('import.confirm.body'), { name: dialog.inspection.file.name, id: dialog.inspection.file.id })}
            </p>
            <p className={dialog.inspection.summary.failed + dialog.inspection.summary.unknown === 0 ? css.modalText : css.modalWarn}>
              {dialog.inspection.summary.failed + dialog.inspection.summary.unknown === 0
                ? t('import.contrast.pass')
                : formatLocale(t('import.contrast.warn'), {
                  failed: dialog.inspection.summary.failed,
                  unknown: dialog.inspection.summary.unknown,
                })}
            </p>
          </>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'duplicate'}
        onClose={closeDialog}
        title={t('import.duplicate.title')}
        closeLabel={t('action.close')}
        footer={dialog?.kind === 'duplicate' ? (
          <>
            <Button onClick={closeDialog}>{t('action.cancel')}</Button>
            <Button disabled={!settingsReady} onClick={() => { confirmImport(dialog.inspection, 'rename') }}>
              {t('import.duplicate.rename')}
            </Button>
            <Button variant="primary" disabled={!settingsReady} data-modal-autofocus onClick={() => { confirmImport(dialog.inspection, 'replace') }}>
              {t('import.duplicate.replace')}
            </Button>
          </>
        ) : null}
      >
        {dialog?.kind === 'duplicate' ? (
          <p className={css.modalText}>
            {formatLocale(t('import.duplicate.body'), { id: dialog.inspection.file.id })}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'manage'}
        onClose={closeDialog}
        title={t('manage.title')}
        closeLabel={t('action.close')}
        contentClassName={css.manageBody ?? ''}
        footer={<Button onClick={closeDialog}>{t('action.close')}</Button>}
      >
        {dialog?.kind === 'manage' ? (
          <>
            {droppedImports > 0 ? (
              <p className={css.modalWarn}>{formatLocale(t('manage.dropped'), { count: droppedImports })}</p>
            ) : null}
            <p className={css.manageGroup}>{t('manage.builtin')}</p>
            {manageCards.filter(card => card.imported !== true).map(card => (
              <ManageRow key={card.id} card={card} t={t} onExport={exportTheme} />
            ))}
            <p className={css.manageGroup}>{t('manage.imported')}</p>
            {manageCards.filter(card => card.imported === true).map(card => (
              <ManageRow key={card.id} card={card} t={t} onExport={exportTheme} onRemove={removeImportedTheme} removeDisabled={!settingsReady} />
            ))}
            {cards.some(card => card.imported === true) ? null : (
              <p className={css.modalText}>{t('manage.empty')}</p>
            )}
          </>
        ) : null}
      </Modal>
    </div>
  )
}

function Mosaic({ preview, onMouseEnter }: { preview: ThemePreview; onMouseEnter?: () => void }) {
  return (
    <div className={css.mosaic} aria-hidden="true" onMouseEnter={onMouseEnter}>
      <span style={{ background: preview.background }} />
      <span style={{ background: preview.surface }} />
      <span style={{ background: preview.foreground }} />
      <span style={{ background: preview.accent }} />
    </div>
  )
}

function ManageRow({ card, t, onExport, onRemove, removeDisabled = false }: {
  card: ThemeStudioCard
  t: (key: ThemeStudioKey) => string
  onExport: (id: string) => void
  onRemove?: (id: string) => void
  removeDisabled?: boolean
}) {
  const id = card.id as string
  return (
    <div className={css.manageRow}>
      <Mosaic preview={card.preview.light} />
      <span className={css.manageName}>{cardName(card, t)}</span>
      <span className={css.manageId}>{id}</span>
      <Button size="sm" onClick={() => { onExport(id) }}>{t('action.export')}</Button>
      {onRemove === undefined ? null : (
        <Button size="sm" disabled={removeDisabled} className={css.removeButton} onClick={() => { onRemove(id) }}>{t('action.remove')}</Button>
      )}
    </div>
  )
}

function cardName(
  card: Pick<ThemeStudioCard, 'name' | 'nameKey'> | undefined,
  t: (key: ThemeStudioKey) => string,
): string {
  if (card === undefined) return t('default.name')
  return card.name ?? t(card.nameKey as ThemeStudioKey)
}

function importErrorMessage(
  t: (key: ThemeStudioKey) => string,
  error: ThemeFileError,
): string {
  const key = `import.error.${error.code}` as ThemeStudioKey
  return formatLocale(t(key), { path: error.path ?? '', detail: error.detail ?? '' })
}
