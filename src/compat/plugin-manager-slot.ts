/**
 * Local mirror of the `plugins.bundle.config` keyed-slot contract that
 * `@deepseek-ai/dsh-client-ui-plugin-manager` merges into the Slots map.
 * That package is published only from 0.1.6-alpha.2, so it cannot sit in
 * peer or development dependencies across the support range; the contract is
 * restated here, narrowed to the `view` member this contribution reads.
 */

/** The view the page asks a configuration entry for. */
export interface PluginConfigViewProps {
  /** `summary` renders the one-liner alone; `page` renders the form with its save control. */
  readonly view: 'summary' | 'page'
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * A bundle's own configuration, keyed by the bundle's package name and
     * rendered on the bundle's page between its description and its rows
     * (`view: 'page'` only).
     */
    'plugins.bundle.config': {
      kind: 'keyed'
      scope: 'root'
      owner: PluginConfigViewProps
    }
  }
}
