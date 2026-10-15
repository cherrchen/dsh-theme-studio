/** Theme Creator registration: mode→invocation mapping and watch lifecycle. */

import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'
import {
  creatorRegistration, createCreatorSectionSource, watchCreatorAgent,
} from '../../src/creator/register.ts'
import type { ThemeStudioHostSection } from '../../src/compat/settings-host.ts'
import { apply } from '../../src/index.ts'

function registry() {
  const registered: SkillRegistration[] = []
  const disposers: (() => void)[] = []
  return {
    registered,
    disposers,
    register: vi.fn((skill: SkillRegistration) => {
      registered.push(skill)
      const dispose = vi.fn(() => {})
      disposers.push(dispose)
      return dispose
    }),
  }
}

function section(value: unknown) {
  const listeners = new Set<() => void>()
  return {
    listeners,
    scope: {
      get: () => value,
      watch: (listener: () => void) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
    } satisfies ThemeStudioHostSection,
    notify: () => { for (const listener of [...listeners]) listener() },
  }
}

describe('creatorRegistration', () => {
  it('maps gesture mode to a user-only invocation', () => {
    const skill = creatorRegistration('gesture', '/tmp/validate-theme.js')
    expect(skill.name).toBe('dsh-theme-creator')
    expect(skill.invocation).toEqual({ modelInvocable: false, userInvocable: true })
    expect(skill.description.length).toBeGreaterThan(0)
    expect(skill.source).toBe('bundled')
  })

  it('maps catalog mode to model and user invocation', () => {
    const skill = creatorRegistration('catalog', '/tmp/validate-theme.js')
    expect(skill.invocation).toEqual({ modelInvocable: true, userInvocable: true })
  })

  it('embeds the quoted validator command into the skill body', () => {
    const skill = creatorRegistration('gesture', '/tmp/validate-theme.js')
    expect(skill.content).toContain('node "/tmp/validate-theme.js"')
    expect(skill.content).toContain('dsh-theme.json')
  })
})

describe('watchCreatorAgent', () => {
  it('registers the skill with the mode from the accepted section', () => {
    const skills = registry()
    const source = createCreatorSectionSource()
    const { scope } = section({ creatorAgentMode: 'gesture' })
    source.set(scope)
    const stop = watchCreatorAgent(skills, source)
    expect(skills.register).toHaveBeenCalledOnce()
    expect(skills.registered[0]?.invocation.modelInvocable).toBe(false)
    stop()
    expect(skills.disposers[0]).toHaveBeenCalledOnce()
  })

  it('registers nothing while the mode is off or the section is absent', () => {
    const skills = registry()
    const source = createCreatorSectionSource()
    const stop = watchCreatorAgent(skills, source)
    expect(skills.register).not.toHaveBeenCalled()
    const { scope } = section({ creatorAgentMode: 'off' })
    source.set(scope)
    expect(skills.register).not.toHaveBeenCalled()
    stop()
  })

  it('re-registers when the durable mode flips', () => {
    const skills = registry()
    const source = createCreatorSectionSource()
    let value: unknown = { creatorAgentMode: 'gesture' }
    const { scope, notify } = section(value)
    Object.defineProperty(scope, 'get', { value: () => value })
    source.set(scope)
    const stop = watchCreatorAgent(skills, source)
    expect(skills.registered).toHaveLength(1)

    value = { creatorAgentMode: 'catalog' }
    notify()
    expect(skills.disposers[0]).toHaveBeenCalledOnce()
    expect(skills.registered).toHaveLength(2)
    expect(skills.registered[1]?.invocation.modelInvocable).toBe(true)

    value = { creatorAgentMode: 'off' }
    notify()
    expect(skills.disposers[1]).toHaveBeenCalledOnce()
    expect(skills.registered).toHaveLength(2)
    stop()
  })

  it('unregisters when the settings section detaches', () => {
    const skills = registry()
    const source = createCreatorSectionSource()
    const { scope } = section({ creatorAgentMode: 'catalog' })
    source.set(scope)
    const stop = watchCreatorAgent(skills, source)
    expect(skills.registered).toHaveLength(1)
    source.set(undefined)
    expect(skills.disposers[0]).toHaveBeenCalledOnce()
    stop()
  })

  it('falls back to the default mode for an unknown stored value', () => {
    const skills = registry()
    const source = createCreatorSectionSource()
    const { scope } = section({ creatorAgentMode: 'surprise' })
    source.set(scope)
    const stop = watchCreatorAgent(skills, source)
    expect(skills.registered[0]?.invocation.modelInvocable).toBe(false)
    stop()
  })
})

describe('host apply creator wiring', () => {
  it('registers the skill once settings attach with a section and skills service exists', async () => {
    const ctx = new Context()
    const { scope } = section({ creatorAgentMode: 'gesture' })
    ctx.provide('settings', { register: vi.fn(() => scope) } as never)
    const skills = registry()
    ctx.provide('skills', skills as never)
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    expect(skills.register).toHaveBeenCalledOnce()
    await fiber.dispose()
    expect(skills.disposers[0]).toHaveBeenCalledOnce()
  })

  it('registers nothing when only the skills service exists', async () => {
    const ctx = new Context()
    const skills = registry()
    ctx.provide('skills', skills as never)
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    expect(skills.register).not.toHaveBeenCalled()
    await fiber.dispose()
  })
})
