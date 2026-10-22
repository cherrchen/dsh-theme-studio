// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement, forwardRef } from 'react'

afterEach(cleanup)

function NativeCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return <button data-testid="native-checkbox" data-checked={checked} onClick={() => onChange(!checked)}>{label}</button>
}

const NativeSurface = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function NativeSurface(props, ref) {
    return <section ref={ref} data-testid="native-surface" {...props} />
  },
)

async function loadAdapter(exports: Record<string, unknown>) {
  vi.resetModules()
  // Missing names must be present-but-undefined: vitest mocks throw on
  // absent exports, while real older bundles resolve them to undefined.
  vi.doMock('@deepseek-ai/dsh-client-ui-primitives', () => ({
    MenuSurface: undefined,
    Checkbox: undefined,
    ...exports,
  }))
  return import('../../src/compat/ui-atoms.tsx')
}

describe('ui-atoms compat adapter', () => {
  it('binds the host MenuSurface and Checkbox where published', async () => {
    const adapter = await loadAdapter({ MenuSurface: NativeSurface, Checkbox: NativeCheckbox })
    expect(adapter.MenuSurface).toBe(NativeSurface)
    expect(adapter.Checkbox).toBe(NativeCheckbox)
  })

  it('falls back to local atoms on pre-0.1.7 hosts', async () => {
    const adapter = await loadAdapter({})
    render(createElement(adapter.MenuSurface, { 'data-testid': 'surface' }))
    expect(screen.getByTestId('surface').tagName).toBe('DIV')
    const spy = vi.fn()
    render(createElement(adapter.Checkbox, { checked: false, label: 'Transparent', onChange: spy }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Transparent' }))
    expect(spy).toHaveBeenCalledWith(true)
  })
})
