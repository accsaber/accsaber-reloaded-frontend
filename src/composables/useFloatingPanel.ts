import { nextTick, onMounted, onUnmounted, ref } from 'vue'

const VIEWPORT_EDGE = 8
const DEFAULT_MAX_WIDTH = 480

export function useFloatingPanel(opts?: {
  minWidth?: number
  maxWidth?: number
  flipThreshold?: number
}) {
  const isOpen = ref(false)
  const containerRef = ref<HTMLElement | null>(null)
  const triggerRef = ref<HTMLElement | null>(null)
  const panelRef = ref<HTMLElement | null>(null)
  const panelStyle = ref<Record<string, string>>({})

  const flipThreshold = opts?.flipThreshold ?? 300

  function updatePosition() {
    const trigger = triggerRef.value
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUp = spaceBelow < flipThreshold && spaceAbove > spaceBelow
    const floor = Math.max(rect.width, opts?.minWidth ?? 0)
    const cap = Math.max(
      floor,
      Math.min(opts?.maxWidth ?? DEFAULT_MAX_WIDTH, window.innerWidth - VIEWPORT_EDGE * 2),
    )
    const panelWidth = panelRef.value?.getBoundingClientRect().width ?? floor
    const left = Math.min(rect.left, window.innerWidth - VIEWPORT_EDGE - panelWidth)
    const style: Record<string, string> = {
      position: 'fixed',
      left: `${Math.max(VIEWPORT_EDGE, left)}px`,
      width: 'max-content',
      minWidth: `${floor}px`,
      maxWidth: `${cap}px`,
    }
    if (openUp) style.bottom = `${window.innerHeight - rect.top}px`
    else style.top = `${rect.bottom}px`
    panelStyle.value = style
  }

  function open() {
    isOpen.value = true
    updatePosition()
    nextTick(updatePosition)
  }

  function close() {
    isOpen.value = false
  }

  function toggle() {
    if (isOpen.value) close()
    else open()
  }

  function onClickOutside(e: MouseEvent) {
    const target = e.target as Node
    if (containerRef.value?.contains(target)) return
    if (panelRef.value?.contains(target)) return
    isOpen.value = false
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') isOpen.value = false
  }

  function onReposition() {
    if (isOpen.value) updatePosition()
  }

  onMounted(() => {
    document.addEventListener('click', onClickOutside)
    document.addEventListener('keydown', onKeydown)
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
  })

  onUnmounted(() => {
    document.removeEventListener('click', onClickOutside)
    document.removeEventListener('keydown', onKeydown)
    window.removeEventListener('scroll', onReposition, true)
    window.removeEventListener('resize', onReposition)
  })

  return { isOpen, containerRef, triggerRef, panelRef, panelStyle, open, close, toggle, updatePosition }
}
