import { computed, onUnmounted, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { useClickOutside } from './useClickOutside'

const VIEWPORT_EDGE = 8
const DEFAULT_MAX_WIDTH = 480
const SCROLL_OPTS: AddEventListenerOptions = { capture: true, passive: true }

type TriggerTarget = HTMLElement | { $el: HTMLElement } | null

export interface FloatingPanelOptions {
  minWidth?: number
  maxWidth?: number
  width?: number | 'trigger' | 'auto'
  side?: 'below' | 'above'
  align?: MaybeRefOrGetter<'start' | 'center' | 'end'>
  gap?: number
  hover?: { openDelay: number; closeDelay: number }
  model?: Ref<boolean>
}

export function useFloatingPanel(opts: FloatingPanelOptions = {}) {
  const isOpen = opts.model ?? ref(false)
  const locked = ref(false)
  const containerRef = ref<HTMLElement | null>(null)
  const triggerRef = ref<TriggerTarget>(null)
  const panelRef = ref<HTMLElement | null>(null)
  const panelStyle = ref<Record<string, string>>({})

  const triggerEl = computed(() => {
    const raw = triggerRef.value
    return raw instanceof HTMLElement ? raw : (raw?.$el ?? null)
  })
  const anchorEl = computed(() => containerRef.value ?? triggerEl.value)

  let openTimer: ReturnType<typeof setTimeout> | null = null
  let closeTimer: ReturnType<typeof setTimeout> | null = null
  let resizeObserver: ResizeObserver | null = null

  function widthStyle(rect: DOMRect, style: Record<string, string>): number {
    const panelWidth = panelRef.value?.getBoundingClientRect().width ?? 0
    if (opts.width === 'trigger') {
      style.width = `${rect.width}px`
      return rect.width
    }
    if (typeof opts.width === 'number') {
      style.width = `${opts.width}px`
      return opts.width
    }
    if (opts.width === 'auto') return panelWidth
    const floor = Math.max(rect.width, opts.minWidth ?? 0)
    const cap = Math.max(
      floor,
      Math.min(opts.maxWidth ?? DEFAULT_MAX_WIDTH, window.innerWidth - VIEWPORT_EDGE * 2),
    )
    style.width = 'max-content'
    style.minWidth = `${floor}px`
    style.maxWidth = `${cap}px`
    return panelWidth || floor
  }

  function opensAbove(rect: DOMRect, gap: number): boolean {
    const height = panelRef.value?.getBoundingClientRect().height ?? 0
    const below = window.innerHeight - rect.bottom - gap
    const above = rect.top - gap
    const preferBelow = (opts.side ?? 'below') === 'below'
    const [primary, secondary] = preferBelow ? [below, above] : [above, below]
    const flip = height > 0 && primary < height && secondary > primary
    return preferBelow === flip
  }

  function updatePosition() {
    const trigger = triggerEl.value
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = opts.gap ?? 0
    const style: Record<string, string> = { position: 'fixed' }
    const width = widthStyle(rect, style)
    const align = toValue(opts.align)
    const left = align === 'end' ? rect.right - width : align === 'center' ? rect.left + (rect.width - width) / 2 : rect.left
    style.left = `${Math.max(VIEWPORT_EDGE, Math.min(left, window.innerWidth - VIEWPORT_EDGE - width))}px`
    if (opensAbove(rect, gap)) style.bottom = `${window.innerHeight - rect.top + gap}px`
    else style.top = `${rect.bottom + gap}px`
    panelStyle.value = style
  }

  function clearTimers() {
    if (openTimer) clearTimeout(openTimer)
    if (closeTimer) clearTimeout(closeTimer)
    openTimer = null
    closeTimer = null
  }

  function open() {
    clearTimers()
    updatePosition()
    isOpen.value = true
  }

  function close() {
    clearTimers()
    isOpen.value = false
    locked.value = false
  }

  function toggle() {
    if (isOpen.value && (locked.value || !opts.hover)) {
      close()
      return
    }
    open()
    locked.value = true
  }

  function scheduleClose() {
    if (!opts.hover || locked.value) return
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(close, opts.hover.closeDelay)
  }

  function onTriggerEnter() {
    if (!opts.hover) return
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = null
    if (isOpen.value) return
    openTimer = setTimeout(open, opts.hover.openDelay)
  }

  function onTriggerLeave() {
    if (openTimer) clearTimeout(openTimer)
    openTimer = null
    scheduleClose()
  }

  function onReposition() {
    updatePosition()
  }

  useClickOutside(anchorEl, () => isOpen.value, close, { ignoreRefs: [panelRef] })

  watch(isOpen, (value) => {
    if (value) {
      updatePosition()
      window.addEventListener('scroll', onReposition, SCROLL_OPTS)
      window.addEventListener('resize', onReposition, { passive: true })
    } else {
      locked.value = false
      window.removeEventListener('scroll', onReposition, SCROLL_OPTS)
      window.removeEventListener('resize', onReposition)
    }
  }, { immediate: true })

  watch(
    panelRef,
    (el) => {
      resizeObserver?.disconnect()
      resizeObserver = null
      if (!el) return
      updatePosition()
      resizeObserver = new ResizeObserver(updatePosition)
      resizeObserver.observe(el)
    },
    { flush: 'post' },
  )

  onUnmounted(() => {
    clearTimers()
    resizeObserver?.disconnect()
    window.removeEventListener('scroll', onReposition, SCROLL_OPTS)
    window.removeEventListener('resize', onReposition)
  })

  return {
    isOpen,
    locked,
    containerRef,
    triggerRef,
    panelRef,
    panelStyle,
    open,
    close,
    toggle,
    onTriggerEnter,
    onTriggerLeave,
    onPanelEnter: clearTimers,
    onPanelLeave: scheduleClose,
  }
}
