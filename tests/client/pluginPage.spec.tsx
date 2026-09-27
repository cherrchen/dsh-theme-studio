// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ThemeStudioSettings } from '../../src/constants.ts'
import { THEME_STUDIO_VERSION } from '../../src/constants.ts'
import { apply, inject } from '../../src/client/index.ts'
import { formatLocale } from '../../src/client/locales.ts'
import {
  PLUGINS_NS, THEME_STUDIO_ITEM_ID, THEME_STUDIO_PACKAGE,
} from '../../src/client/plugin-page/index.ts'
import { en } from '../../src/client/plugin-page/locales.ts'
import { ThemeStudioPluginBadge } from '../../src/client/plugin-page/ThemeStudioPluginBadge.tsx'
import { ThemeStudioPluginCard } from '../../src/client/plugin-page/ThemeStudioPluginCard.tsx'
import { ThemeStudioPluginSection } from '../../src/client/plugin-page/ThemeStudioPluginSection.tsx'
import { stubLocale, stubSettingsScope, stubSlots } from '../harness.ts'

afterEach(cleanup)

const DICT: Record<string, string> = en

/** Translate one Plugins-page key, interpolating `{name}` placeholders. */
const t = (key: string, params?: Record<string, unknown>): string =>
  formatLocale(DICT[key] ?? key, params ?? {})

async function bench() {
  const ctx = new Context()
  const locale = stubLocale()
  ctx.provide('locale', locale)
  ctx.provide('theme', { overrideTokens: () => () => {} } as never)
  ctx.provide('connection', { isLoopback: true } as never)
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope<ThemeStudioSettings>().scope } as never)
  const slots = stubSlots({ declared: ['settings.general.item'] })
  ctx.provide('slots', slots)
  await ctx.plugin({ inject: [...inject], apply }).await()
  return { ctx, locale, slots }
}

const labelOf = (entry: { options: { label?: string | (() => string) } }): string =>
  typeof entry.options.label === 'function' ? entry.options.label() : String(entry.options.label)

describe('Theme Studio Plugins-page entry', () => {
  it('registers nothing until the Plugins page declares its slots', async () => {
    const b = await bench()
    expect(b.slots.entries()).toHaveLength(1)
    expect(b.slots.entries('plugins.item')).toEqual([])
  })

  it('registers the card, badge, and section on declaration, with the localized title', async () => {
    const b = await bench()
    b.slots.declare('plugins.item')
    b.slots.declare('plugins.detail.badge')
    b.slots.declare('plugins.detail.section')
    const cards = b.slots.entries('plugins.item')
    expect(cards).toHaveLength(1)
    expect(cards[0]!.options).toMatchObject({
      name: 'plugins.item',
      id: THEME_STUDIO_ITEM_ID,
      order: 130,
      locale: PLUGINS_NS,
    })
    expect(labelOf(cards[0]!)).toBe('主题工作室')
    b.locale.setLocale('en')
    expect(labelOf(cards[0]!)).toBe('Theme Studio')
    const badges = b.slots.entries('plugins.detail.badge')
    expect(badges.map(entry => entry.options)).toMatchObject([
      { id: 'theme-studio-badge', order: 20, locale: PLUGINS_NS },
    ])
    const sections = b.slots.entries('plugins.detail.section')
    expect(sections.map(entry => entry.options)).toMatchObject([
      { id: 'theme-studio-components', order: 100, locale: PLUGINS_NS },
    ])
  })

  it('registers the card alone on a host that declares only plugins.item', async () => {
    const b = await bench()
    b.slots.declare('plugins.item')
    expect(b.slots.entries('plugins.item')).toHaveLength(1)
    expect(b.slots.entries('plugins.detail.badge')).toEqual([])
    expect(b.slots.entries('plugins.detail.section')).toEqual([])
  })

  it('releases every contribution when the declaration collapses', async () => {
    const b = await bench()
    b.slots.declare('plugins.item')
    b.slots.declare('plugins.detail.badge')
    b.slots.declare('plugins.detail.section')
    b.slots.undeclare('plugins.item')
    b.slots.undeclare('plugins.detail.badge')
    b.slots.undeclare('plugins.detail.section')
    expect(b.slots.entries('plugins.item')).toEqual([])
    expect(b.slots.entries('plugins.detail.badge')).toEqual([])
    expect(b.slots.entries('plugins.detail.section')).toEqual([])
    expect(b.slots.entries()).toHaveLength(1)
  })

  it('keeps the published version in step with package.json', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version: string }
    expect(manifest.version).toBe(THEME_STUDIO_VERSION)
  })

  it('renders the card one-liner and no page body', () => {
    const summary = render(<ThemeStudioPluginCard view="summary" t={t} />)
    expect(screen.getByText(en.description)).toBeDefined()
    summary.unmount()
    const page = render(<ThemeStudioPluginCard view="page" t={t} />)
    expect(page.container.firstChild).toBeNull()
  })

  it('tags its own detail page only', () => {
    const own = render(<ThemeStudioPluginBadge subject={{ kind: 'item', id: THEME_STUDIO_ITEM_ID }} t={t} />)
    expect(screen.getByText(`v${THEME_STUDIO_VERSION}`)).toBeDefined()
    expect(screen.getByText(THEME_STUDIO_PACKAGE)).toBeDefined()
    expect(screen.queryByText('Desktop')).toBeNull()
    own.unmount()
    const foreign = render(<ThemeStudioPluginBadge subject={{ kind: 'item', id: 'web-search' }} t={t} />)
    expect(foreign.container.firstChild).toBeNull()
    foreign.unmount()
    const bundle = render(
      <ThemeStudioPluginBadge
        subject={{ kind: 'bundle', pkg: { name: THEME_STUDIO_PACKAGE, installed: true, enabled: true, rows: [] } }}
        t={t}
      />,
    )
    expect(bundle.container.firstChild).toBeNull()
  })

  it('lists its component row on its own detail page only', () => {
    const own = render(<ThemeStudioPluginSection subject={{ kind: 'item', id: THEME_STUDIO_ITEM_ID }} t={t} />)
    expect(screen.getByRole('heading', { level: 4, name: 'Components' })).toBeDefined()
    expect(screen.getByText('1 total')).toBeDefined()
    expect(screen.getByText(THEME_STUDIO_PACKAGE)).toBeDefined()
    expect(screen.getByText(THEME_STUDIO_ITEM_ID)).toBeDefined()
    expect(screen.getByText(en.description)).toBeDefined()
    expect(screen.queryByRole('switch')).toBeNull()
    own.unmount()
    const foreign = render(<ThemeStudioPluginSection subject={{ kind: 'item', id: 'web-search' }} t={t} />)
    expect(foreign.container.firstChild).toBeNull()
    foreign.unmount()
    const bundle = render(
      <ThemeStudioPluginSection
        subject={{ kind: 'bundle', pkg: { name: THEME_STUDIO_PACKAGE, installed: true, enabled: true, rows: [] } }}
        t={t}
      />,
    )
    expect(bundle.container.firstChild).toBeNull()
  })
})
