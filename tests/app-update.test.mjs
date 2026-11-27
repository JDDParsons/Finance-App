import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { applyUpdateAtLaunch } from '../utils/appUpdate.ts'

class FakeWorker extends EventTarget {
  constructor(state, container) {
    super()
    this.state = state
    this.container = container
    this.messages = []
    this.takesOver = true
  }

  setState(state) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }

  postMessage(message) {
    this.messages.push(message)
    if (this.takesOver) queueMicrotask(() => this.container.dispatchEvent(new Event('controllerchange')))
  }
}

function setup({ controlled = true, registered = true, online = true } = {}) {
  const container = new EventTarget()
  const calls = { update: 0, register: 0, reload: 0, updating: 0 }
  const registration = {
    installing: null,
    waiting: null,
    update: async () => { calls.update++ },
  }
  container.controller = controlled ? {} : null
  container.getRegistration = async () => (registered ? registration : undefined)
  container.register = async () => { calls.register++ }

  const run = (overrides = {}) => applyUpdateAtLaunch({
    container,
    scriptUrl: '/sw.js',
    scope: '/',
    isOnline: () => online,
    reload: () => { calls.reload++ },
    onUpdating: () => { calls.updating++ },
    checkTimeoutMs: 20,
    installTimeoutMs: 40,
    activateTimeoutMs: 20,
    ...overrides,
  })

  // Puts a new version into the "installing" slot, then finishes it after a delay.
  const download = (outcome = 'installed', delayMs = 5) => {
    const worker = new FakeWorker('installing', container)
    registration.installing = worker
    if (outcome) {
      setTimeout(() => {
        registration.installing = null
        if (outcome === 'installed') registration.waiting = worker
        worker.setState(outcome)
      }, delayMs)
    }
    return worker
  }

  return { container, registration, calls, run, download }
}

test('no service worker support opens the app', async () => {
  const { run } = setup()
  assert.equal(await run({ container: undefined }), 'continue')
})

test('a first visit registers the worker and does not wait', async () => {
  const { run, calls } = setup({ registered: false, controlled: false })
  assert.equal(await run(), 'continue')
  assert.equal(calls.register, 1)
  assert.equal(calls.update, 0)
})

test('no update opens the app without showing the indicator', async () => {
  const { run, calls } = setup()
  assert.equal(await run(), 'continue')
  assert.deepEqual(calls, { update: 1, register: 0, reload: 0, updating: 0 })
})

test('an update found by the check is installed and reloads', async () => {
  const { run, calls, registration, download } = setup()
  let worker
  registration.update = async () => { worker = download() }
  assert.equal(await run(), 'reloading')
  assert.deepEqual(worker.messages, [{ type: 'SKIP_WAITING' }])
  assert.equal(calls.reload, 1)
  assert.ok(calls.updating > 0)
})

test('offline skips the check', async () => {
  const { run, calls } = setup({ online: false })
  assert.equal(await run(), 'continue')
  assert.equal(calls.update, 0)
})

test('an already downloaded update is applied even offline', async () => {
  const { run, calls, registration, container } = setup({ online: false })
  registration.waiting = new FakeWorker('installed', container)
  assert.equal(await run(), 'reloading')
  assert.equal(calls.reload, 1)
})

test('a failing check opens the app', async () => {
  const { run, registration } = setup()
  registration.update = async () => { throw new TypeError('Failed to fetch') }
  assert.equal(await run(), 'continue')
})

test('a hanging check times out and opens the app', async () => {
  const { run, calls, registration } = setup()
  registration.update = () => new Promise(() => {})
  assert.equal(await run(), 'continue')
  assert.equal(calls.updating, 0)
})

test('a slow download opens the app and never reloads afterwards', async () => {
  const { run, calls, registration, download } = setup()
  let worker
  registration.update = async () => { worker = download('installed', 80) }
  assert.equal(await run(), 'continue')
  await new Promise(resolve => setTimeout(resolve, 80))
  assert.equal(registration.waiting, worker)
  assert.deepEqual(worker.messages, [])
  assert.equal(calls.reload, 0)
})

test('a download already running at launch is waited for', async () => {
  const { run, calls, download } = setup()
  download()
  assert.equal(await run(), 'reloading')
  assert.equal(calls.update, 0)
})

test('a failed download opens the app', async () => {
  const { run, calls, registration, download } = setup()
  registration.update = async () => { download('redundant') }
  assert.equal(await run(), 'continue')
  assert.equal(calls.reload, 0)
})

test('an update that does not take over opens the app and is not reloaded later', async () => {
  const { run, calls, registration, container } = setup()
  registration.waiting = new FakeWorker('installed', container)
  registration.waiting.takesOver = false
  assert.equal(await run(), 'continue')
  container.dispatchEvent(new Event('controllerchange'))
  assert.equal(calls.reload, 0)
})

test('the app applies updates only through the launch check', async () => {
  const config = await readFile(new URL('../nuxt.config.ts', import.meta.url), 'utf8')
  assert.match(config, /registerType: 'prompt'/)
  assert.match(config, /registerPlugin: false/)
})
