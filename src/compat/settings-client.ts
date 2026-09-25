/**
 * Client settings handle shared by `settingsScope.bind` and `configForms.get`.
 * Callers probe the service that is actually on the context.
 */

/** Snapshot fields Theme Studio reads from either settings transport. */
export interface ThemeSettingsSnapshot<T> {
  /** Sync state of the durable section. */
  status: 'loading' | 'ready' | 'unavailable'
  /** Last accepted section. */
  value: T | undefined
}

/**
 * Durable Theme Studio section. `set` may resolve `void` or `boolean`;
 * callers only wait for settlement.
 */
export interface ThemeSettingsHost<T> {
  /** @returns the current sync snapshot. */
  getSnapshot(): ThemeSettingsSnapshot<T>
  /**
   * Observe snapshot replacements.
   * @param listener - invoked after each snapshot change.
   * @returns the disposer removing this listener.
   */
  subscribe(listener: () => void): () => void
  /**
   * Write one field.
   * @param field - scalar field inside the section.
   * @param value - JSON-shaped value.
   * @returns settlement of the write.
   */
  set(field: string, value: unknown): Promise<unknown>
}

/** Older client settings service. */
export interface SettingsScopeCarrier {
  /** Namespace binder. */
  settingsScope?: {
    /**
     * Open one namespace.
     * @param spec - namespace registered by the Host plugin.
     */
    bind<T>(spec: { namespace: string }): ThemeSettingsHost<T>
  }
}

/** Newer client settings service. */
export interface ConfigFormsCarrier {
  /** Profile-entry forms. */
  configForms?: {
    /**
     * Open the form for one profile entry id.
     * @param entryId - profile entry id.
     */
    get<T>(entryId: string): ThemeSettingsHost<T>
  }
}

