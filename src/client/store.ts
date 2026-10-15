/**
 * Themes row slot store: a mirror of ThemeStudioRuntime. The plugin apply
 * listener is the only writer; the row reads via props.useStore.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import type { ThemePreview } from './types.ts'
import type { ThemeStudioSnapshot } from './runtime.ts'

/** One card in the Themes row, including Default. */
export interface ThemeStudioCard {
  /** Builtin or imported id, or `null` for Default. */
  id: string | null
  /** Locale key for the card name; ignored when `name` is set. */
  nameKey: string
  /** Locale key for the card description; ignored when `description` is set. */
  descriptionKey: string
  /** Verbatim name from an imported theme file. */
  name?: string
  /** Verbatim description from an imported theme file. */
  description?: string
  /** True for themes that came from a `dsh-theme.json` import. */
  imported?: boolean
  /** Mosaic colors for each official color scheme. */
  preview: { light: ThemePreview; dark: ThemePreview }
}

/** Store state mirrored from the runtime snapshot plus the theme cards. */
export interface ThemeStudioRowState extends ThemeStudioSnapshot {
  /** Default plus builtin plus imported cards in display order. */
  cards: readonly ThemeStudioCard[]
}

/** Declared action shape giving the exported factory a stable return type. */
type ThemeStudioRowActions = {
  sync: (draft: ThemeStudioRowState, snapshot: ThemeStudioSnapshot) => void
  setCards: (draft: ThemeStudioRowState, cards: readonly ThemeStudioCard[]) => void
}

/**
 * Declares the Themes row state and write surface.
 * @param cards - Default plus builtin cards; refreshed via `setCards` when the
 * imported section changes.
 * @returns the store handle.
 */
export function createThemeStudioRowStore(
  cards: readonly ThemeStudioCard[],
): EngineStoreHandle<ThemeStudioRowState, ThemeStudioRowActions> {
  return defineStore({
    init: (): ThemeStudioRowState => ({
      activeThemeId: null,
      previewThemeId: null,
      previewing: false,
      settingsStatus: 'loading',
      saveError: false,
      droppedImports: 0,
      revision: -1,
      cards,
    }),
    actions: {
      sync: (draft, snapshot: ThemeStudioSnapshot) => {
        if (snapshot.revision <= draft.revision) return
        draft.activeThemeId = snapshot.activeThemeId
        draft.previewThemeId = snapshot.previewThemeId
        draft.previewing = snapshot.previewing
        draft.settingsStatus = snapshot.settingsStatus
        draft.saveError = snapshot.saveError === true
        draft.droppedImports = snapshot.droppedImports
        draft.revision = snapshot.revision
      },
      setCards: (draft, cards: readonly ThemeStudioCard[]) => {
        draft.cards = cards
      },
    },
  })
}
