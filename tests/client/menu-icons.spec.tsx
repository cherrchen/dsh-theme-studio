// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'

afterEach(cleanup)

function NativeRegular({ className }: { className?: string }) {
  return <svg data-testid="native-regular" className={className} />
}

function NativeFourteen({ className }: { className?: string }) {
  return <svg data-testid="native-14" className={className} />
}

async function loadAdapter(exports: Record<string, unknown>) {
  vi.resetModules()
  // Missing names must be present-but-undefined: vitest mocks throw on
  // absent exports, while real older bundles resolve them to undefined.
  vi.doMock('@deepseek-ai/dsh-client-ui-primitives', () => ({
    IconChevronDownOutlineRegular: undefined,
    IconChevronDownOutline14: undefined,
    ...exports,
  }))
  return import('../../src/compat/menu-icons.tsx')
}

describe('menu-icons compat adapter', () => {
  it('binds IconChevronDownOutlineRegular where published', async () => {
    const adapter = await loadAdapter({ IconChevronDownOutlineRegular: NativeRegular })
    expect(adapter.ChevronDownIcon).toBe(NativeRegular)
  })

  it('binds the 0.1.5-era IconChevronDownOutline14 when Regular is absent', async () => {
    const adapter = await loadAdapter({ IconChevronDownOutline14: NativeFourteen })
    expect(adapter.ChevronDownIcon).toBe(NativeFourteen)
  })

  it('prefers Regular when a host publishes both names', async () => {
    const adapter = await loadAdapter({
      IconChevronDownOutlineRegular: NativeRegular,
      IconChevronDownOutline14: NativeFourteen,
    })
    expect(adapter.ChevronDownIcon).toBe(NativeRegular)
  })

  it('falls back to the inline artwork when neither name resolves', async () => {
    const adapter = await loadAdapter({})
    render(createElement(adapter.ChevronDownIcon, { className: 'chevron' }))
    const path = document.querySelector('svg path')
    expect(path?.getAttribute('d')).toContain('M4 6L7.29289')
    expect(path?.getAttribute('stroke')).toBe('currentColor')
  })
})

describe('menu-icons picker icon ladders', () => {
  async function loadPickerIcons(exports: Record<string, unknown>) {
    vi.resetModules()
    vi.doMock('@deepseek-ai/dsh-client-ui-primitives', () => ({
      IconChevronDownOutlineRegular: undefined,
      IconChevronDownOutline14: undefined,
      IconSearchOutlineRegular: undefined,
      IconSearchOutline16: undefined,
      IconCloseOutlineRegular: undefined,
      IconCloseOutline16: undefined,
      IconRefreshOutlineRegular: undefined,
      IconRefreshOutline16: undefined,
      ...exports,
    }))
    return import('../../src/compat/menu-icons.tsx')
  }

  it('binds the Regular picker icons where published', async () => {
    const adapter = await loadPickerIcons({
      IconSearchOutlineRegular: NativeRegular,
      IconCloseOutlineRegular: NativeRegular,
      IconRefreshOutlineRegular: NativeRegular,
    })
    expect(adapter.SearchIcon).toBe(NativeRegular)
    expect(adapter.CloseIcon).toBe(NativeRegular)
    expect(adapter.RefreshIcon).toBe(NativeRegular)
  })

  it('binds the 0.1.5-era *Outline16 names when Regular is absent', async () => {
    const adapter = await loadPickerIcons({
      IconSearchOutline16: NativeFourteen,
      IconCloseOutline16: NativeFourteen,
      IconRefreshOutline16: NativeFourteen,
    })
    expect(adapter.SearchIcon).toBe(NativeFourteen)
    expect(adapter.CloseIcon).toBe(NativeFourteen)
    expect(adapter.RefreshIcon).toBe(NativeFourteen)
  })

  it('falls back to inline artwork when no picker icon resolves', async () => {
    const adapter = await loadPickerIcons({})
    render(createElement(adapter.SearchIcon, {}))
    expect(document.querySelector('svg path')?.getAttribute('stroke')).toBe('currentColor')
    cleanup()
    render(createElement(adapter.CloseIcon, {}))
    expect(document.querySelector('svg path')?.getAttribute('d')).toContain('M2.5 2.5')
    cleanup()
    render(createElement(adapter.RefreshIcon, {}))
    expect(document.querySelector('svg path')?.getAttribute('d')).toContain('M14.5001 8')
  })
})
