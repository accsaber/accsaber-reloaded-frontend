import type { EventResponse } from '@/types/api/events'
import { useNow } from '@/composables/useNow'
import { formatDuration } from '@/utils/formatters'
import { computed, onMounted, ref } from 'vue'

export function useCurrentEvent() {
  const event = ref<EventResponse | null>(null)
  const now = useNow(30_000)

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
    phase.value ? formatDuration(phase.value.at - now.value, { zero: 'ending' }) : '',
  )

  onMounted(async () => {
    try {
      const { getCurrentEvent } = await import('@/api/events')
      event.value = await getCurrentEvent()
    } catch {
      event.value = null
    }
  })

  return { event, visible, verb, countdown }
}
