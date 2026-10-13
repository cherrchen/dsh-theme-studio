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
