/** Test doubles that do not import `@deepseek-ai/dsh-client-test-runtime`. */

import { vi } from 'vitest'
import { useSyncExternalStore } from 'react'

interface SettingsScopeSnapshot<T> {
  status: 'loading' | 'ready' | 'unavailable'
  value: T | undefined
  base: unknown
  user: unknown
  revision: number | undefined
  writable: boolean
  mode: 'host' | 'memory'
}

interface SettingsScope<T> {
  getSnapshot(): SettingsScopeSnapshot<T>
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<void>
  unset(field: string): Promise<void>
}

/** Handle over one stubbed settings scope. */
export interface StubSettingsScope<T> {
  /** The scope face handed to the service under test. */
  scope: SettingsScope<T>
  /** Spy behind `scope.set`. */
  set: ReturnType<typeof vi.fn>
  /** Spy behind `scope.unset`. */
  unset: ReturnType<typeof vi.fn>
  /** @returns how many listeners are currently subscribed. */
  listenerCount(): number
  /**
   * Replace part of the snapshot and notify subscribers.
   * @param next - snapshot fields to replace.
   */
  publish(next: Partial<SettingsScopeSnapshot<T>>): void
}

/**
 * In-memory settings scope: starts loading, records writes, publishes Host acceptances.
 * @returns the stub handle.
 */
export function stubSettingsScope<T>(): StubSettingsScope<T> {
  let snapshot: SettingsScopeSnapshot<T> = {
    status: 'loading', value: undefined, base: undefined, user: undefined,
    revision: undefined, writable: false, mode: 'host',
  }
  const listeners = new Set<() => void>()
  const set = vi.fn(() => Promise.resolve())
  const unset = vi.fn(() => Promise.resolve())
  return {
    scope: {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
      set,
      unset,
    },
    set,
    unset,
    listenerCount: () => listeners.size,
    publish: (next) => {
      snapshot = { ...snapshot, ...next }
      for (const listener of [...listeners]) listener()
    },
  }
}

/**
 * Bind a snapshot store to the slot `useStore` selector hook.
 * @param store - subscribe/getSnapshot source.
 * @returns a React selector hook.
 */
export function bindSnapshotSelector<T extends object>(store: {
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
}): <S>(selector: (state: T) => S) => S {
  return function useStore<S>(selector: (state: T) => S): S {
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
    return selector(snapshot)
  }
}

/** Locale double with the runtime's register/bind face and a settable active locale. */
export function stubLocale(): {
  setLocale(next: string): void
  register(ns: string, dicts: { zh: Record<string, string>; en: Record<string, string> }): () => void
  bind(ns: string): (key: string) => string
} {
  let locale = 'zh'
  const packs = new Map<string, { zh: Record<string, string>; en: Record<string, string> }>()
  return {
    setLocale(next: string) { locale = next },
    register(ns: string, dicts: { zh: Record<string, string>; en: Record<string, string> }) {
      packs.set(ns, dicts)
      return () => { packs.delete(ns) }
    },
    bind(ns: string) {
      return (key: string) => packs.get(ns)?.[locale === 'en' ? 'en' : 'zh']?.[key] ?? key
    },
  }
}

/** One recorded slot entry from the stub registry. */
export interface StubSlotEntry {
  readonly options: { name: string; id?: string; order?: number; label?: string | (() => string); locale?: string; store?: unknown; inject?: unknown }
  readonly component: unknown
  readonly store: unknown
  readonly inject: unknown
}

/** Slot-registry double with declaration semantics: an `inject` callback runs when, and only while, its slot is declared. */
export interface StubSlots {
  /** Declare a slot: callbacks waiting on it run now, and later ones run immediately. */
  declare(name: string): void
  /** Collapse a declaration: its contributions are disposed. */
  undeclare(name: string): void
  inject(name: string, callback: () => unknown): () => void
  register(options: StubSlotEntry['options'], component: unknown): () => void
  /** Entries of one slot, or of every declared slot when `name` is omitted. */
  entries(name?: string): readonly StubSlotEntry[]
}

/**
 * In-memory slot registry over the listed declarations.
 * @param options - slots declared before the first `inject`.
 * @returns the registry double.
 */
export function stubSlots(options: { declared?: readonly string[] } = {}): StubSlots {
  const declared = new Set<string>(options.declared ?? [])
  const entriesBySlot = new Map<string, StubSlotEntry[]>()
  const disposersBySlot = new Map<string, Array<() => void>>()
  const pending = new Map<string, Array<() => unknown>>()
  let collecting: Array<() => void> | undefined

  const entriesOf = (name: string): StubSlotEntry[] => {
    let list = entriesBySlot.get(name)
    if (list === undefined) { list = []; entriesBySlot.set(name, list) }
    return list
  }
  const disposersOf = (name: string): Array<() => void> => {
    let list = disposersBySlot.get(name)
    if (list === undefined) { list = []; disposersBySlot.set(name, list) }
    return list
  }
  const addDisposer = (list: Array<() => void>, disposer: () => void): void => {
    if (!list.includes(disposer)) list.push(disposer)
  }
  // A callback returns a disposer, an iterable of them (a generator registration
  // body must be iterated to run), or nothing.
  const collectReturn = (result: unknown, into: Array<() => void>): void => {
    if (typeof result === 'function') addDisposer(into, result as () => void)
    else if (result !== null && result !== undefined && typeof (result as Iterable<unknown>)[Symbol.iterator] === 'function') {
      for (const item of result as Iterable<unknown>) if (typeof item === 'function') addDisposer(into, item as () => void)
    }
  }
  const run = (name: string, callback: () => unknown): Array<() => void> => {
    const previous = collecting
    const collected: Array<() => void> = []
    collecting = collected
    try {
      collectReturn(callback(), collected)
    } finally {
      collecting = previous
    }
    for (const disposer of collected) addDisposer(disposersOf(name), disposer)
    return collected
  }

  return {
    declare(name: string) {
      if (declared.has(name)) return
      declared.add(name)
      const queued = pending.get(name) ?? []
      pending.delete(name)
      for (const callback of queued) run(name, callback)
    },
    undeclare(name: string) {
      if (!declared.has(name)) return
      declared.delete(name)
      const disposers = disposersBySlot.get(name) ?? []
      disposersBySlot.delete(name)
      entriesBySlot.delete(name)
      for (const disposer of [...disposers].reverse()) disposer()
    },
    inject(name: string, callback: () => unknown) {
      if (!declared.has(name)) {
        const queued = pending.get(name) ?? []
        queued.push(callback)
        pending.set(name, queued)
        return () => {
          const index = queued.indexOf(callback)
          if (index >= 0) queued.splice(index, 1)
        }
      }
      const collected = run(name, callback)
      return () => { for (const disposer of [...collected].reverse()) disposer() }
    },
    register(options: StubSlotEntry['options'], component: unknown) {
      const entry: StubSlotEntry = { options, component, store: options.store, inject: options.inject }
      entriesOf(options.name).push(entry)
      const disposer = (): void => {
        const list = entriesBySlot.get(options.name)
        if (list === undefined) return
        const index = list.indexOf(entry)
        if (index >= 0) list.splice(index, 1)
      }
      if (collecting !== undefined) addDisposer(collecting, disposer)
      return disposer
    },
    entries(name?: string) {
      if (name !== undefined) return [...entriesOf(name)]
      const all: StubSlotEntry[] = []
      for (const slot of declared) all.push(...entriesOf(slot))
      return all
    },
  }
}
