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

function NativeSegmented({ options }: { options: { value: string; label: string }[] }) {
  return <div data-testid="native-segmented">{options.length}</div>
}

async function loadSegmented(exports: Record<string, unknown>) {
  vi.resetModules()
  vi.doMock('@deepseek-ai/dsh-client-ui-primitives', () => ({
    MenuSurface: undefined,
    Checkbox: undefined,
    Input: undefined,
    SegmentedControl: undefined,
    ...exports,
  }))
  return import('../../src/compat/ui-atoms.tsx')
}

describe('ui-atoms SegmentedControl adapter', () => {
  it('binds the host SegmentedControl where published', async () => {
    const adapter = await loadSegmented({ SegmentedControl: NativeSegmented })
    expect(adapter.SegmentedControl).toBe(NativeSegmented)
  })

  it('replicates the tablist contract on pre-0.1.7 hosts', async () => {
    const adapter = await loadSegmented({})
    const changed = vi.fn()
    render(createElement(adapter.SegmentedControl, {
      id: 'pick-mode',
      label: 'Switch input mode',
      value: 'literal',
      onChange: changed,
      options: [
        { value: 'literal', label: 'RGB' },
        { value: 'expression', label: 'color-mix' },
      ],
    }))
    const rgb = screen.getByRole('tab', { name: 'RGB' })
    const mix = screen.getByRole('tab', { name: 'color-mix' })
    expect(rgb.id).toBe('pick-mode-literal')
    expect(rgb.getAttribute('aria-controls')).toBe('pick-mode-literal-panel')
    expect(rgb.getAttribute('aria-selected')).toBe('true')
    expect(mix.tabIndex).toBe(-1)
    fireEvent.click(mix)
    expect(changed).toHaveBeenCalledWith('expression')
  })

  it('walks tabs with arrow keys like the published control', async () => {
    const adapter = await loadSegmented({})
    const changed = vi.fn()
    render(createElement(adapter.SegmentedControl, {
      id: 'pick-mode',
      label: 'Switch input mode',
      value: 'literal',
      onChange: changed,
      options: [
        { value: 'literal', label: 'RGB' },
        { value: 'expression', label: 'color-mix' },
      ],
    }))
    fireEvent.keyDown(screen.getByRole('tab', { name: 'RGB' }), { key: 'ArrowRight' })
    expect(changed).toHaveBeenCalledWith('expression')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'RGB' }), { key: 'End' })
    expect(changed).toHaveBeenLastCalledWith('expression')
    // Home targets the already-selected value, so the owner is not called again.
    fireEvent.keyDown(screen.getByRole('tab', { name: 'RGB' }), { key: 'Home' })
    expect(changed).toHaveBeenCalledTimes(2)
  })
})
