import { computed, onMounted, onUnmounted, ref, type CSSProperties, type Ref } from 'vue'

interface TiltOptions {
  maxDeg?: number
  reflectionOpacity?: number
}

export function useTiltEffect(
  elementRef: Ref<HTMLElement | null>,
  options: TiltOptions = {},
) {
  const { maxDeg = 6, reflectionOpacity = 0.05 } = options

  const rotateX = ref(0)
  const rotateY = ref(0)
  const reflectionX = ref(50)
  const reflectionY = ref(50)
  const isHovering = ref(false)

  let rafId: number | null = null

  function isDisabled(): boolean {
    return (
      window.innerWidth < 768 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  function onMouseMove(e: MouseEvent) {
    if (isDisabled() || !elementRef.value) return

    if (rafId !== null) return

    rafId = requestAnimationFrame(() => {
      rafId = null
      const el = elementRef.value
      if (!el) return

      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      rotateX.value = (0.5 - y) * maxDeg * 2
      rotateY.value = (x - 0.5) * maxDeg * 2
      reflectionX.value = x * 100
      reflectionY.value = y * 100
    })
  }

  function onMouseEnter() {
    if (isDisabled()) return
    isHovering.value = true
  }

  function onMouseLeave() {
    isHovering.value = false
    rotateX.value = 0
    rotateY.value = 0
    reflectionX.value = 50
    reflectionY.value = 50
  }

  const style = computed<CSSProperties>(() => {
    if (!isHovering.value) {
      return {
        transform: 'perspective(600px) rotateX(0deg) rotateY(0deg)',
        transition: 'transform 200ms ease-out',
      }
    }
    return {
      transform: `perspective(600px) rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg)`,
      backgroundImage: `radial-gradient(circle at ${reflectionX.value}% ${reflectionY.value}%, rgba(255,255,255,${reflectionOpacity}), transparent 60%)`,
      transition: 'none',
    }
  })

  onMounted(() => {
    const el = elementRef.value
    if (!el) return
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseenter', onMouseEnter)
    el.addEventListener('mouseleave', onMouseLeave)
  })

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    const el = elementRef.value
    if (!el) return
    el.removeEventListener('mousemove', onMouseMove)
    el.removeEventListener('mouseenter', onMouseEnter)
    el.removeEventListener('mouseleave', onMouseLeave)
  })

  return { style }
}
