import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from 'vitest'
import { cleanup as rtlCleanup } from '@testing-library/react'

afterEach(() => {
  rtlCleanup()
  cleanup?.()
  document.documentElement.classList.remove('dark')
  document.body.style.overflow = ''
  try {
    window.localStorage.clear()
  } catch {
    /* ignore */
  }
})

/* ---------------------------------------------------------------------------
 * prefers-reduced-motion mock.
 * Tests run with reduced motion ON by default: that makes the typewriter and
 * scroll animations resolve immediately, which keeps assertions deterministic.
 * Set `window.__setReducedMotion(false)` before render() to exercise the
 * animated path instead.
 * ------------------------------------------------------------------------- */
let reducedMotion = true
const mediaListeners = new Set()

const createMediaQueryList = (query) => ({
  media: query,
  matches: /prefers-reduced-motion/.test(query) ? reducedMotion : false,
  onchange: null,
  addEventListener: (_type, listener) => mediaListeners.add(listener),
  removeEventListener: (_type, listener) => mediaListeners.delete(listener),
  addListener: (listener) => mediaListeners.add(listener),
  removeListener: (listener) => mediaListeners.delete(listener),
  dispatchEvent: () => false,
})

window.matchMedia = createMediaQueryList
globalThis.matchMedia = createMediaQueryList

globalThis.__setReducedMotion = (value) => {
  reducedMotion = value
  mediaListeners.forEach((listener) => listener({ matches: value }))
}

/* ---------------------------------------------------------------------------
 * IntersectionObserver mock — tests can fire entries manually.
 * ------------------------------------------------------------------------- */
const intersectionObservers = new Set()

globalThis.IntersectionObserver = class IntersectionObserverMock {
  constructor(callback, options = {}) {
    this.callback = callback
    this.options = options
    this.elements = new Set()
    this.disconnected = false
    intersectionObservers.add(this)
  }

  observe(element) {
    this.elements.add(element)
  }

  unobserve(element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
    this.disconnected = true
    intersectionObservers.delete(this)
  }

  takeRecords() {
    return []
  }
}

globalThis.__fireIntersection = (entries) => {
  intersectionObservers.forEach((observer) => observer.callback(entries, observer))
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

