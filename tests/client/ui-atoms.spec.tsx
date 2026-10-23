// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement, createRef, forwardRef, type InputHTMLAttributes } from 'react'

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
    Input: undefined,
    ...exports,
  }))
  return import('../../src/compat/ui-atoms.tsx')
}

describe('ui-atoms compat adapter', () => {
  it('preserves a ref-forwarding host Input', async () => {
    const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
      function Input(props, ref) { return <input {...props} ref={ref} /> },
    )
    const adapter = await loadAdapter({ Input })
    expect(adapter.RefInput).toBe(Input)
    const ref = createRef<HTMLInputElement>()
    const view = render(<adapter.RefInput ref={ref} aria-label="Name" />)
    expect(ref.current).toBe(screen.getByRole('textbox', { name: 'Name' }))
    view.unmount()
    expect(ref.current).toBeNull()
  })

  it('binds the actual input on legacy hosts and releases callback refs', async () => {
    function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
      return <span className={className}><input {...props} /></span>
    }
    const adapter = await loadAdapter({ Input })
    const ref = vi.fn()
    const changed = vi.fn()
    const view = render(<adapter.RefInput ref={ref} className="host-input" aria-label="Name" onChange={changed} />)
    const input = screen.getByRole('textbox', { name: 'Name' })
    expect(ref).toHaveBeenLastCalledWith(input)
    expect(input.parentElement?.className).toBe('host-input')
    ref.mock.calls.at(-1)![0].focus()
    expect(document.activeElement).toBe(input)
    fireEvent.change(input, { target: { value: 'Ocean' } })
    expect(changed).toHaveBeenCalledOnce()
    const replacement = createRef<HTMLInputElement>()
    view.rerender(<adapter.RefInput ref={replacement} aria-label="Name" disabled />)
    expect(ref).toHaveBeenLastCalledWith(null)
    expect(replacement.current).toBe(input)
    expect(replacement.current?.disabled).toBe(true)
    view.unmount()
    expect(replacement.current).toBeNull()
  })

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
