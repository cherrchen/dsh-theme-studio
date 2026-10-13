// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

afterEach(cleanup)

function NativeSurface(props: ComponentPropsWithoutRef<'div'>) {
  return <div data-testid="native-surface" {...props} />
}

function NativeCheck({ className }: { className?: string }) {
  return <svg data-testid="native-check" className={className} />
}

async function loadAdapter(exports: Record<string, unknown>) {
  vi.resetModules()
  // Missing names must be present-but-undefined: vitest mocks throw on
  // absent exports, while real older bundles resolve them to undefined.
  vi.doMock('@deepseek-ai/dsh-client-ui-primitives', () => ({
    MenuSurface: undefined,
    IconCheckOutlineRegular: undefined,
    ...exports,
  }))
  return import('../../src/compat/menu-surface.tsx')
}

describe('menu-surface compat adapter', () => {
  it('binds the published MenuSurface and check icon when the host exports them', async () => {
    const adapter = await loadAdapter({
      MenuSurface: NativeSurface,
      IconCheckOutlineRegular: NativeCheck,
    })
    expect(adapter.MenuSurfaceLike).toBe(NativeSurface)
    expect(adapter.CheckIcon).toBe(NativeCheck)
    render(createElement(adapter.MenuSurfaceLike, { role: 'listbox' }, 'items'))
    expect(screen.getByRole('listbox').textContent).toBe('items')
  })

  it('falls back to local painting when the host publishes neither export', async () => {
    const adapter = await loadAdapter({})
    render(
      createElement(adapter.MenuSurfaceLike, { role: 'listbox', 'aria-label': 'Themes' }, 'items'),
    )
    const surface = screen.getByRole('listbox')
    expect(surface.textContent).toBe('items')
    expect((surface as HTMLElement).style.position).toBe('relative')
    const check = render(createElement(adapter.CheckIcon, { className: 'check' }))
    const path = check.container.querySelector('svg path')
    expect(path?.getAttribute('d')).toContain('M2.25 8.5')
    expect(path?.getAttribute('stroke')).toBe('currentColor')
  })

  it('detects each export independently for hosts that publish only the icon', async () => {
    const adapter = await loadAdapter({ IconCheckOutlineRegular: NativeCheck })
    expect(adapter.CheckIcon).toBe(NativeCheck)
    render(createElement(adapter.MenuSurfaceLike, { role: 'listbox' }, 'items'))
    expect(screen.queryByTestId('native-surface')).toBeNull()
    expect(screen.getByRole('listbox')).toBeDefined()
  })
})
