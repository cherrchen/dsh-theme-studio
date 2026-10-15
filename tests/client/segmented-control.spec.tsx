// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'

afterEach(cleanup)

function NativeSegmented() {
  return <div data-testid="native-segmented" />
}

async function loadAdapter(exports: Record<string, unknown>) {
  vi.resetModules()
  // Missing names must be present-but-undefined: vitest mocks throw on
  // absent exports, while real older bundles resolve them to undefined.
  vi.doMock('@deepseek-ai/dsh-client-ui-primitives', () => ({
    SegmentedControl: undefined,
    ...exports,
  }))
  return import('../../src/compat/segmented-control.tsx')
}

const OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'gesture', label: 'Gesture' },
  { value: 'catalog', label: 'Catalog' },
] as const

describe('segmented-control compat adapter', () => {
  it('binds the published SegmentedControl where it exists', async () => {
    const adapter = await loadAdapter({ SegmentedControl: NativeSegmented })
    expect(adapter.SegmentedControl).toBe(NativeSegmented)
  })

  it('falls back to a local tablist where the export is absent', async () => {
    const adapter = await loadAdapter({})
    const onChange = vi.fn()
    render(createElement(adapter.SegmentedControl, {
      id: 'creator',
      value: 'gesture',
      options: OPTIONS,
      onChange,
      label: 'Theme creator',
    }))
    const list = screen.getByRole('tablist', { name: 'Theme creator' })
    const gesture = screen.getByRole('tab', { name: 'Gesture' })
    const catalog = screen.getByRole('tab', { name: 'Catalog' })
    expect(list.contains(gesture)).toBe(true)
    expect(gesture.id).toBe('creator-gesture')
    expect(gesture.getAttribute('aria-selected')).toBe('true')
    expect(gesture.getAttribute('aria-controls')).toBe('creator-gesture-panel')
    expect(gesture.tabIndex).toBe(0)
    expect(catalog.tabIndex).toBe(-1)
    fireEvent.click(catalog)
    expect(onChange).toHaveBeenCalledWith('catalog')
    // The selected tab is never re-offered to the owner.
    fireEvent.click(gesture)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('walks enabled options on arrow keys in the fallback', async () => {
    const adapter = await loadAdapter({})
    const onChange = vi.fn()
    render(createElement(adapter.SegmentedControl, {
      id: 'creator',
      value: 'off',
      options: OPTIONS,
      onChange,
      label: 'Theme creator',
    }))
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Off' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('gesture')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Off' }), { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('catalog')
  })

  it('locks every fallback segment while disabled', async () => {
    const adapter = await loadAdapter({})
    const onChange = vi.fn()
    render(createElement(adapter.SegmentedControl, {
      id: 'creator',
      value: 'gesture',
      options: OPTIONS,
      onChange,
      label: 'Theme creator',
      disabled: true,
    }))
    const catalog = screen.getByRole('tab', { name: 'Catalog' })
    expect((catalog as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(catalog)
    expect(onChange).not.toHaveBeenCalled()
  })
})
