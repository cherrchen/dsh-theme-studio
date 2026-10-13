// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { transform } from 'lightningcss'
import { describe, expect, it } from 'vitest'

const PACKAGE_NAME = '@dsh-electron/dsh-theme-studio'

function injectStyle(tagId: string, css: string) {
  const selector = `style[data-plugin-css=${JSON.stringify(tagId)}]`
  if (document.querySelector(selector) === null) {
    const tag = document.createElement('style')
    tag.dataset.plugin = PACKAGE_NAME
    tag.dataset.pluginCss = tagId
    tag.textContent = css
    document.head.appendChild(tag)
  }
}

describe('Theme Studio CSS module injection', () => {
  it('compiles class mappings and injects one style tag that outlives an overlay cleanup', () => {
    const source = readFileSync('src/client/ThemeStudioRow.module.css')
    const result = transform({
      filename: 'ThemeStudioRow.module.css',
      code: source,
      cssModules: { pattern: '[hash]_[local]' },
      minify: true,
    })
    const classes = Object.fromEntries(Object.entries(result.exports ?? {}).map(([local, value]) => [local, value.name]))
    expect(classes.group).toMatch(/_group$/)
    expect(classes.list).toMatch(/_list$/)
    expect(classes.option).toMatch(/_option$/)
    expect(classes.title).toMatch(/_title$/)
    const css = result.code.toString()
    expect(css).toContain(classes.group)
    expect(css).not.toContain('.module.css')
    const tagId = `${PACKAGE_NAME}/ThemeStudioRow.module.css`
    injectStyle(tagId, css)
    injectStyle(tagId, css)
    expect(document.head.querySelectorAll(`style[data-plugin-css=${JSON.stringify(tagId)}]`)).toHaveLength(1)
    document.body.style.setProperty('--dsw-alias-bg-base', '#112233')
    document.body.style.removeProperty('--dsw-alias-bg-base')
    expect(document.head.querySelectorAll('style')).toHaveLength(1)
  })
})
