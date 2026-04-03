/**
 * iOS PWA standalone navigation fix.
 *
 * On iOS, any <a href> click that is not intercepted by JavaScript causes the
 * OS to open the URL in a full Safari window, exiting the PWA shell. Vue Router
 * handles <NuxtLink> correctly via history.pushState, but third-party UI
 * components (e.g. @nuxt/ui) can render plain <a> tags that bypass the router.
 *
 * This plugin intercepts every anchor click while in standalone mode and
 * re-routes internal links through vue-router so the app stays fullscreen.
 */
export default defineNuxtPlugin(() => {
  // Only applies to iOS standalone PWA mode
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (!nav.standalone) return

  const router = useRouter()

  document.addEventListener('click', (event) => {
    // Walk up the DOM tree to find the closest <a> element
    let target = event.target as HTMLElement | null
    while (target && target.nodeName !== 'A') {
      target = target.parentElement
    }
    if (!target) return

    const anchor = target as HTMLAnchorElement

    // Skip: no href, external link, explicit new tab, or non-http scheme
    if (!anchor.href) return
    if (anchor.target === '_blank') return
    if (anchor.hostname !== window.location.hostname) return
    if (!anchor.protocol.startsWith('http')) return

    // This is an internal same-origin link — prevent Safari from opening it
    event.preventDefault()
    router.push(anchor.pathname + anchor.search + anchor.hash)
  })
})
