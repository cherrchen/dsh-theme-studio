/**
 * Real browser journey for the web profile.
 *
 * This does not run unless DSH_BROWSER_E2E=1. A jsdom test is not a substitute
 * and is not reported as a pass from here. When the flag is unset the process
 * exits 0 with status `not-run` so local unit runs stay quiet; the browser CI
 * job sets the flag and treats a missing browser as a failure.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  assertIsolatedHome, captureDsh, developmentPin, ensureDshCli, REPO_ROOT, scratchHome,
} from './lib/dsh-cli.mjs'

const required = process.env.DSH_BROWSER_E2E === '1'
if (!required) {
  console.log(JSON.stringify({
    status: 'not-run',
    reason: 'DSH_BROWSER_E2E is not set. This is not a browser pass.',
  }, null, 2))
  process.exit(0)
}

const home = scratchHome(`browser-${process.pid}`)
const evidence = process.env.DSH_MATRIX_EVIDENCE ? resolve(process.env.DSH_MATRIX_EVIDENCE) : join(REPO_ROOT, 'matrix-evidence')
mkdirSync(evidence, { recursive: true })
const report = { status: 'failed', version: developmentPin(), notes: [], consoleErrors: [] }
let server
let browser
let page
let logs = ''

function note(message) {
  report.notes.push(message)
  console.log(`[smoke:client] ${message}`)
}

async function startServer(cli) {
  server = spawn(process.execPath, [cli, '--profile', 'web', '--no-open', '--port', '0'], {
    env: { ...process.env, DSH_HOME: home },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let currentLogs = ''
  const record = chunk => { currentLogs += chunk; logs += chunk }
  server.stdout.on('data', record)
  server.stderr.on('data', record)
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`web server did not print a URL\n${currentLogs}`)), 120000)
    const watch = () => {
      const match = currentLogs.match(/https?:\/\/127\.0\.0\.1:\d+(?:\/[^\s\u001b]*)?/u)
      if (match !== null) {
        clearTimeout(timer)
        resolve(match[0])
      }
    }
    server.stdout.on('data', watch)
    server.stderr.on('data', watch)
    server.on('exit', () => {
      clearTimeout(timer)
      reject(new Error(`web server exited before printing a URL\n${currentLogs}`))
    })
  })
}

async function stopServer() {
  if (server === undefined || server.exitCode !== null) return
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { server.kill('SIGKILL'); reject(new Error('web server did not stop')) }, 20000)
    server.once('exit', () => { clearTimeout(timer); resolve() })
    server.kill('SIGTERM')
  })
}

try {
  if (!existsSync(join(REPO_ROOT, 'lib/client.js'))) throw new Error('lib/ is missing — run pnpm build first')
  let playwright
  try {
    const specifier = process.env.PLAYWRIGHT_MODULE
    playwright = specifier === undefined || specifier === ''
      ? await import('playwright')
      : await import(pathToFileURL(specifier).href)
    playwright = playwright.chromium ? playwright : playwright.default
  } catch {
    throw new Error('playwright is not installed. The browser job must install it before setting DSH_BROWSER_E2E=1.')
  }
  rmSync(home, { recursive: true, force: true })
  mkdirSync(home, { recursive: true })
  assertIsolatedHome(home)
  const cli = ensureDshCli(report.version)
  const target = existsSync(join(REPO_ROOT, '.pack/plugin.tgz')) ? join(REPO_ROOT, '.pack/plugin.tgz') : REPO_ROOT
  const init = captureDsh(cli, ['plugin', '--profile', 'web', 'install'], home)
  if (init.code !== 0) throw new Error(`web profile install failed\n${init.stderr}`)
  const add = captureDsh(cli, ['plugin', '--profile', 'web', 'add', target], home)
  if (add.code !== 0) throw new Error(`plugin add failed\n${add.stderr}`)

  let url = await startServer(cli)
  note(`opened ${new URL(url).origin}`)
  browser = await playwright.chromium.launch({ headless: true })
  page = await browser.newPage()
  page.on('pageerror', (error) => report.consoleErrors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text())
  })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
  // Newer shells nest Settings inside the sidebar account menu; older hosts
  // keep a direct Settings button. Either entry marks the shell as ready.
  const openSettings = page.getByRole('button', { name: /^设置$|^Settings$/u }).first()
  const accountMenu = page.getByRole('button', { name: /^账号菜单$|^Account menu$/u }).first()
  const settingsEntry = openSettings.or(accountMenu)
  // The Settings panel is itself an aria-modal dialog named by its title;
  // first-run dismissal must skip it or its own Close button shuts the panel.
  const settingsName = /^设置$|^Settings$/u
  const settingsDialog = page.getByRole('dialog', { name: settingsName }).first()
  const modalDialogs = page.locator('[role="dialog"][aria-modal="true"]')
  const dialogName = async (dialog) => dialog.evaluate((element) => {
    const label = element.getAttribute('aria-label')
    if (label !== null) return label
    return (element.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/u)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim()
  }).catch(() => '')
  // First-run overlays mount asynchronously once their settings snapshot
  // resolves, and mark the app root inert behind a mask. Each foreign dialog
  // exits through its own Close affordance or advances through a Continue/
  // Configure-later button; one with neither is waited out. Returns whether
  // any first-run dialog was up during the pass.
  const dismissFirstRunDialogs = async () => {
    let seen = false
    for (let attempts = 0; attempts < 30; attempts += 1) {
      let acted = false
      let waiting = 0
      const count = await modalDialogs.count()
      for (let index = 0; index < count; index += 1) {
        const dialog = modalDialogs.nth(index)
        if (!await dialog.isVisible().catch(() => false)) continue
        if (settingsName.test(await dialogName(dialog))) continue
        seen = true
        const close = dialog.getByRole('button', { name: /^关闭$|^Close$/u }).first()
        if (await close.isVisible().catch(() => false)) {
          await close.click().catch(() => {})
          acted = true
          break
        }
        const advance = dialog.getByRole('button', { name: /^继续$|^Continue$|^稍后配置$|^Configure later$/u }).first()
        if (await advance.isVisible().catch(() => false)) {
          await advance.click().catch(() => {})
          acted = true
          break
        }
        waiting += 1
      }
      if (acted) continue
      if (waiting === 0) return seen
      await page.waitForTimeout(400)
    }
    return seen
  }
  const openSettingsPanel = async () => {
    const deadline = Date.now() + 60000
    for (;;) {
      await dismissFirstRunDialogs()
      try {
        // A delayed first-run dialog takes down or masks the panel; only
        // drive the entry when the panel is not open yet.
        if (!await settingsDialog.isVisible().catch(() => false)) {
          if (await openSettings.isVisible()) {
            await openSettings.click({ timeout: 8000 })
          } else {
            await accountMenu.click({ timeout: 8000 })
            await page.getByRole('menuitem', { name: /^设置$|^Settings$/u }).first().click({ timeout: 8000 })
          }
        }
        // A dialog can still mount after the click, so return only after a
        // quiet window in which the panel stays up and its content receives
        // pointer events (the trial click runs actionability without clicking).
        let quietSince = Date.now()
        for (;;) {
          if (Date.now() >= deadline) throw new Error('the settings panel never stayed interactable')
          if (await dismissFirstRunDialogs()) {
            quietSince = Date.now()
            continue
          }
          if (!await settingsDialog.isVisible().catch(() => false)) {
            throw new Error('the settings panel closed right after opening')
          }
          try {
            await settingsDialog.getByText(/通用|General/u).first().click({ trial: true, timeout: 3000 })
          } catch {
            quietSince = Date.now()
            continue
          }
          if (Date.now() - quietSince >= 1500) return
          await page.waitForTimeout(200)
        }
      } catch (error) {
        if (Date.now() >= deadline) throw error
      }
    }
  }
  await settingsEntry.waitFor({ timeout: 30000 })
  note('client shell is ready')
  await openSettingsPanel()
  note('opened Settings')
  const general = page.getByText(/通用|General/u).first()
  if (await general.count()) await general.click()
  note('selected General')
  const themes = page.getByText(/^主题$|^Themes$/u).first()
  const appearance = page.getByText(/^外观$|^Appearance$/u).first()
  await themes.waitFor({ timeout: 30000 })
  await appearance.waitFor({ timeout: 30000 })
  note('Themes and Appearance are both visible')
  const background = () => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim())
  const before = await background()
  // The Themes row selector shows the applied theme name; opening it renders
  // the shared Menu (one menuitem per card plus Default).
  const pill = page.getByRole('button', { name: /^Default$|^默认$/u }).first()
  await pill.click()
  const menu = page.getByRole('menu')
  await menu.first().waitFor({ timeout: 30000 })
  const itemCount = await menu.first().getByRole('menuitem').count()
  if (itemCount < 2) throw new Error(`theme menu opened with ${itemCount} items`)
  note(`theme selector opened a menu with ${itemCount} options`)
  const second = menu.first().getByRole('menuitem').nth(1)
  await second.hover()
  await page.waitForTimeout(300)
  const previewed = await background()
  if (previewed === before) throw new Error('preview did not change --dsw-alias-bg-base')
  note('hovering a menu option previewed the theme')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const cancelled = await background()
  if (cancelled !== before) throw new Error('closing the menu did not restore --dsw-alias-bg-base')
  note('closing the menu restored the background variable')
  // Older hosts close the whole Settings dialog on Escape; reopen it before
  // driving the selector again.
  if (!await pill.isVisible()) {
    await openSettingsPanel()
    const general = page.getByText(/通用|General/u).first()
    if (await general.count()) await general.click()
  }
  await pill.click()
  await menu.first().waitFor({ timeout: 30000 })
  await menu.first().getByRole('menuitem').nth(1).click()
  await page.waitForTimeout(500)
  const applied = await background()
  if (applied !== previewed) throw new Error('apply did not commit the previewed background variable')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await settingsEntry.waitFor({ timeout: 30000 })
  await page.waitForFunction(value => getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim() === value, applied)
  const restored = await background()
  if (restored !== applied) throw new Error('reload did not keep the applied background variable')
  note('reload kept the applied theme')
  await page.goto('about:blank')
  await stopServer()
  url = await startServer(cli)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await settingsEntry.waitFor({ timeout: 30000 })
  await page.waitForFunction(value => getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim() === value, applied)
  note('a fresh Host process restored the applied theme from the isolated profile')
  const related = report.consoleErrors.filter(line => /^pageerror:|theme-studio|Theme Studio|overrideTokens/u.test(line.split('\n')[0]))
  if (related.length > 0) throw new Error(`related console errors:\n${related.join('\n')}`)
  if (report.consoleErrors.length > 0) note(`unrelated console errors were recorded (${report.consoleErrors.length})`)
  report.status = 'passed'
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error)
  console.error(`[smoke:client] ${report.error}`)
} finally {
  if (page !== undefined) {
    await page.screenshot({ path: join(evidence, `browser-${report.version}.png`), fullPage: true }).catch(() => {})
    writeFileSync(join(evidence, `browser-${report.version}.html`), await page.content().catch(() => ''))
  }
  if (browser !== undefined) await browser.close()
  await stopServer().catch(error => { report.status = 'failed'; report.error = error.message })
  writeFileSync(join(evidence, `browser-${report.version}-server.log`), logs.replace(/token=[^\s]+/gu, 'token=<redacted>'))
  if (process.env.DSH_SMOKE_KEEP !== '1') rmSync(home, { recursive: true, force: true })
  writeFileSync(join(evidence, `browser-${report.version}.json`), `${JSON.stringify(report, null, 2)}\n`)
}
if (report.status !== 'passed') process.exit(1)
console.log('[smoke:client] passed')
