import type { EventResponse } from '@/types/api/events'
import { formatDuration } from '@/utils/events'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const TICK_MS = 30_000

function formatCountdown(ms: number): string {
  return ms <= 0 ? 'ending' : formatDuration(ms)
}

export function useCurrentEvent() {
  const event = ref<EventResponse | null>(null)
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  const phase = computed<{ verb: string; at: number } | null>(() => {
    if (!event.value) return null
    const starts = new Date(event.value.startsAt).getTime()
    const ends = new Date(event.value.endsAt).getTime()
    if (now.value < starts) return { verb: 'starts', at: starts }
    if (now.value < ends) return { verb: 'ends', at: ends }
    return null
  })

  const visible = computed(() => phase.value !== null)
  const verb = computed(() => phase.value?.verb ?? '')
  const countdown = computed(() =>
    phase.value ? formatCountdown(phase.value.at - now.value) : '',
  )

  onMounted(async () => {
    try {
      const { getCurrentEvent } = await import('@/api/events')
      event.value = await getCurrentEvent()
    } catch {
      event.value = null
    }
    timer = setInterval(() => {
      now.value = Date.now()
    }, TICK_MS)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { event, visible, verb, countdown }
}
