import type { MapDifficultyResponse } from '@/types/api/maps'
import { ref, watch, type Ref } from 'vue'

export interface DifficultyDrift {
  newHash: string
  oldHash: string
  oldBlLeaderboardId: string | null
  newBlLeaderboardId: string | null
  oldSsLeaderboardId: string | null
  newSsLeaderboardId: string | null
}

export function useDifficultyDrift(
  difficulty: Ref<MapDifficultyResponse | null>,
  canRefresh: Ref<boolean>,
) {
  const driftInfo = ref<DifficultyDrift | null>(null)
  const checking = ref(false)

  async function fetchSongHash(d: MapDifficultyResponse): Promise<string | null> {
    try {
      const { getRankingMap } = await import('@/api/ranking/maps')
      return (await getRankingMap(d.mapId)).songHash ?? null
    } catch {
      return null
    }
  }

  async function detect(d: MapDifficultyResponse, beatsaverCode: string, songHash: string) {
    checking.value = true
    try {
      const { detectDifficultyDrift } = await import('@/utils/beatsaver')
      const result = await detectDifficultyDrift({
        beatsaverCode,
        currentHash: songHash,
        difficulty: d.difficulty,
        characteristic: d.characteristic,
      })
      if (result.drift && result.newHash) {
        driftInfo.value = {
          oldHash: result.oldHash,
          newHash: result.newHash,
          oldBlLeaderboardId: d.blLeaderboardId,
          newBlLeaderboardId: result.newBlLeaderboardId,
          oldSsLeaderboardId: d.ssLeaderboardId,
          newSsLeaderboardId: result.newSsLeaderboardId,
        }
      }
    } catch {
      driftInfo.value = null
    } finally {
      checking.value = false
    }
  }

  async function recheck() {
    driftInfo.value = null
    const d = difficulty.value
    if (!d?.beatsaverCode || !canRefresh.value) return
    const songHash = await fetchSongHash(d)
    if (songHash) await detect(d, d.beatsaverCode, songHash)
  }

  watch(() => difficulty.value?.id, recheck)

  return { driftInfo, checking, recheck }
}
