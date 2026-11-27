// Looks for a new app version while the splash screen is up, so an update never
// reloads the page after the user has started using it. A new service worker
// waits until this code tells it to take over, and that only happens at launch.

/** How long the splash waits to hear whether there is an update. */
export const UPDATE_CHECK_TIMEOUT_MS = 2500
/** How long the splash waits for a found update to download. */
export const UPDATE_INSTALL_TIMEOUT_MS = 10_000
/** How long a downloaded update gets to take over before the app opens anyway. */
export const UPDATE_ACTIVATE_TIMEOUT_MS = 5000

export type LaunchUpdateResult = 'reloading' | 'continue'

export interface LaunchUpdateOptions {
  /** `navigator.serviceWorker`, or undefined where service workers are unsupported. */
  container: ServiceWorkerContainer | undefined
  scriptUrl: string
  scope: string
  isOnline: () => boolean
  reload: () => void
  /** Called once an update is known to exist. */
  onUpdating?: () => void
  checkTimeoutMs?: number
  installTimeoutMs?: number
  activateTimeoutMs?: number
}

/** Resolves when `promise` settles or the time is up, whichever is first. Never rejects. */
function settleWithin(promise: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    const done = () => {
      clearTimeout(timer)
      resolve()
    }
    promise.then(done, done)
  })
}

/** Resolves once the worker has finished installing, successfully or not. */
function whenInstalled(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (worker.state === 'installing') return
      worker.removeEventListener('statechange', check)
      resolve()
    }
    worker.addEventListener('statechange', check)
    check()
  })
}

/** Tells a waiting worker to take over and resolves to whether it did in time. */
function activate(container: ServiceWorkerContainer, worker: ServiceWorker, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (activated: boolean) => {
      clearTimeout(timer)
      container.removeEventListener('controllerchange', onChange)
      resolve(activated)
    }
    const onChange = () => finish(true)
    const timer = setTimeout(() => finish(false), ms)
    container.addEventListener('controllerchange', onChange)
    // The message the generated Workbox service worker listens for.
    worker.postMessage({ type: 'SKIP_WAITING' })
  })
}

/**
 * Resolves to 'reloading' when the page is being reloaded into a new version (keep
 * the splash up), otherwise 'continue'. Never rejects: a failed update must not
 * stop the app from opening. An update that is too slow keeps downloading and is
 * applied at the next launch.
 */
export async function applyUpdateAtLaunch(options: LaunchUpdateOptions): Promise<LaunchUpdateResult> {
  const { container, scriptUrl, scope, isOnline, reload, onUpdating } = options
  if (!container) return 'continue'

  try {
    const registration = await container.getRegistration(scope)
    // First visit, or a page no worker controls: it already came from the network,
    // so there is nothing to wait for. Register for next time.
    if (!registration || !container.controller) {
      void container.register(scriptUrl, { scope }).catch(() => {})
      return 'continue'
    }

    // Downloaded during an earlier run and not applied yet.
    if (registration.waiting) onUpdating?.()

    // Asked even when a version is already waiting, so a newer one is picked up now
    // instead of causing a second update at the next launch.
    if (!registration.installing && isOnline()) {
      await settleWithin(registration.update(), options.checkTimeoutMs ?? UPDATE_CHECK_TIMEOUT_MS)
    }

    if (registration.installing) {
      onUpdating?.()
      await settleWithin(whenInstalled(registration.installing), options.installTimeoutMs ?? UPDATE_INSTALL_TIMEOUT_MS)
    }

    const waiting = registration.waiting
    if (!waiting) return 'continue'
    onUpdating?.()
    if (!await activate(container, waiting, options.activateTimeoutMs ?? UPDATE_ACTIVATE_TIMEOUT_MS)) return 'continue'
    reload()
    return 'reloading'
  } catch {
    return 'continue'
  }
}
