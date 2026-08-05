import { onMounted, onUnmounted } from 'vue'

const BLURRED_FPS = 15

export interface RenderLoop {
  start: () => void
  stop: () => void
}

export function useRenderLoop(frame: (now: number) => void, enabled?: () => boolean): RenderLoop {
  let rafId: number | null = null
  let isVisible = true
  let isFocused = true
  let lastFrameAt = 0

  function allowed(): boolean {
    return isVisible && enabled?.() !== false
  }

  function frameGap(): number {
    return isFocused ? 0 : 1000 / BLURRED_FPS
  }

  function loop(now: number) {
    if (!allowed()) {
      rafId = null
      return
    }
    rafId = requestAnimationFrame(loop)
    const gap = frameGap()
    if (gap > 0) {
      if (now - lastFrameAt < gap) return
      lastFrameAt = Math.max(lastFrameAt + gap, now - gap)
    }
    frame(now)
  }

  function start() {
    if (rafId !== null || !allowed()) return
    lastFrameAt = performance.now() - 1000
    rafId = requestAnimationFrame(loop)
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function onVisibility() {
    isVisible = !document.hidden
    if (isVisible) start()
    else stop()
  }

  function onFocusChange() {
    isFocused = document.hasFocus()
  }

  onMounted(() => {
    isVisible = !document.hidden
    isFocused = document.hasFocus()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocusChange)
    window.addEventListener('blur', onFocusChange)
  })

  onUnmounted(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onFocusChange)
    window.removeEventListener('blur', onFocusChange)
  })

  return { start, stop }
}
