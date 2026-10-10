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
  const openSettings = page.getByRole('button', { name: /^设置$|^Settings$/u }).first()
  await openSettings.waitFor({ timeout: 30000 })
  note('client shell is ready')
  const continueButton = page.getByRole('button', { name: /^继续$|^Continue$/u }).first()
  await continueButton.waitFor({ timeout: 5000 }).catch(() => {})
  if (await continueButton.isVisible()) await continueButton.click()
  const later = page.getByRole('button', { name: /^稍后配置$|^Configure later$/u }).first()
  await later.waitFor({ timeout: 5000 }).catch(() => {})
  if (await later.isVisible()) await later.click()
  await openSettings.click()
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
  const preview = page.getByRole('button', { name: /预览|Preview/u }).nth(1)
  await preview.click()
  await page.waitForTimeout(300)
  const previewed = await background()
  if (previewed === before) throw new Error('preview did not change --dsw-alias-bg-base')
  note('preview changed the page background variable')
  await page.getByRole('button', { name: /取消|Cancel/u }).click()
  await page.waitForTimeout(300)
  const cancelled = await background()
  if (cancelled !== before) throw new Error('cancel did not restore --dsw-alias-bg-base')
  note('cancel restored the background variable')
  await preview.click()
  await page.getByRole('button', { name: /^应用$|^Apply$/u }).click()
  await page.waitForTimeout(500)
  const applied = await background()
  if (applied !== previewed) throw new Error('apply did not commit the previewed background variable')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await openSettings.waitFor({ timeout: 30000 })
  await page.waitForFunction(value => getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim() === value, applied)
  const restored = await background()
  if (restored !== applied) throw new Error('reload did not keep the applied background variable')
  note('reload kept the applied theme')
  await page.goto('about:blank')
  await stopServer()
  url = await startServer(cli)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await openSettings.waitFor({ timeout: 30000 })
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
