import { useSocket } from '@/composables/useSocket'
import type { ScoreResponse } from '@/types/api/users'
import type { ConnectionStatus, ScoreFeedEntry } from '@/types/display'
import { formatDifficulty, toUserRef } from '@/utils/mappers'
import { pickCoverFallback, pickCoverUrl } from '@/composables/useAvatarFallback'
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
    const categoryCode = categoryStore.getCategoryCode(raw.categoryId) ?? 'overall'
    const modifiers = modifierStore.resolveModifierCodes(raw.modifierIds ?? [])

    return {
      key: `${raw.id}-${entryCounter++}`,
      userId: raw.userId,
      player: toUserRef(raw),
      mapId: raw.mapId,
      mapDifficultyId: raw.mapDifficultyId,
      beatsaverCode: raw.beatsaverCode ?? null,
      characteristic: raw.characteristic,
      rawDifficulty: raw.difficulty,
      mapName: raw.songName ?? 'Unknown',
      mapSubName: raw.songSubName ?? null,
      artistName: raw.songAuthor ?? '',
      mapAuthor: raw.mapAuthor ?? '',
      coverUrl: pickCoverUrl(raw),
      coverFallbackUrl: pickCoverFallback(raw),
      difficulty: formatDifficulty(raw.difficulty),
      categoryCode,
      rank: raw.rank,
      score: raw.score,
      accuracy: raw.accuracy,
      ap: raw.ap,
      weightedAp: raw.weightedAp,
      modifiers,
      misses: raw.misses ?? 0,
      badCuts: raw.badCuts ?? 0,
      wallHits: raw.wallHits ?? 0,
      bombHits: raw.bombHits ?? 0,
      streak115: raw.streak115 ?? 0,
      timeSet: raw.timeSet ?? raw.createdAt,
      blScoreId: raw.blScoreId ?? undefined,
    }
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
