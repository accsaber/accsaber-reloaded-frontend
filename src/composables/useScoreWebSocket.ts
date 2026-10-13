import { useSocket } from '@/composables/useSocket'
import type { ScoreResponse } from '@/types/api/users'
import type { ConnectionStatus, ScoreFeedEntry } from '@/types/display'
import { toScoreFeedEntry } from '@/utils/mappers'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import { ref, type Ref } from 'vue'

const MAX_ENTRIES = 50
const HEARTBEAT_MS = 30000

interface UseScoreWebSocketReturn {
  scores: Ref<ScoreFeedEntry[]>
  status: Ref<ConnectionStatus>
  connect: () => void
  disconnect: () => void
}

export function useScoreWebSocket(): UseScoreWebSocketReturn {
  const scores = ref<ScoreFeedEntry[]>([])

  const categoryStore = useCategoryStore()
  const modifierStore = useModifierStore()

  let entryCounter = 0

  function toFeedEntry(raw: ScoreResponse): ScoreFeedEntry {
    return toScoreFeedEntry(
      raw,
      modifierStore.resolveModifierCodes(raw.modifierIds ?? []),
      categoryStore.getCategoryCode(raw.categoryId),
      `${raw.id}-${entryCounter++}`,
    )
  }

  const { status, connect, disconnect } = useSocket<ScoreResponse>({
    path: '/ws/scores',
    autoConnect: false,
    heartbeatMs: HEARTBEAT_MS,
    onMessage: (raw) => {
      scores.value = [toFeedEntry(raw), ...scores.value].slice(0, MAX_ENTRIES)
    },
  })

  return { scores, status, connect, disconnect }
}
