import { parseApiError } from '@/api/client'
import type { ClanWarParticipantResponse } from '@/types/api/clans'
import type { ScoreResponse } from '@/types/api/users'
import { ref } from 'vue'

const BOARD_SIZE = 100

export interface WarMapBoard {
  scores: ScoreResponse[] | null
  fighters: ClanWarParticipantResponse[] | null
  error: string | null
}

export function useWarMapBoards(warId: () => string) {
  const expanded = ref<string | null>(null)
  const boards = ref<Record<string, WarMapBoard>>({})
  let generation = 0

  async function fetchFighters(war: string, mapId: string) {
    const { getClanWarParticipants } = await import('@/api/clans')
    const page = await getClanWarParticipants(war, { page: 0, size: BOARD_SIZE, mapDifficultyId: mapId })
    return page.content
  }

  async function fetchScores(war: string, mapId: string) {
    const { getDifficultyScores } = await import('@/api/maps')
    const page = await getDifficultyScores(mapId, { page: 0, size: BOARD_SIZE, sort: 'ap,desc', warId: war })
    return page.content
  }

  async function load(mapId: string) {
    const current = generation
    const war = warId()
    boards.value[mapId] = { scores: null, fighters: null, error: null }
    try {
      const [scores, fighters] = await Promise.all([fetchScores(war, mapId), fetchFighters(war, mapId)])
      if (current === generation) boards.value[mapId] = { scores, fighters, error: null }
    } catch (err) {
      if (current !== generation) return
      boards.value[mapId] = { scores: [], fighters: [], error: parseApiError(err, 'Could not load this map.').message }
    }
  }

  function open(mapId: string) {
    expanded.value = mapId
    if (!boards.value[mapId]) void load(mapId)
  }

  function toggle(mapId: string) {
    if (expanded.value === mapId) expanded.value = null
    else open(mapId)
  }

  function invalidate() {
    generation += 1
    boards.value = {}
    if (expanded.value) void load(expanded.value)
  }

  function reset() {
    expanded.value = null
    invalidate()
  }

  return { expanded, boards, open, toggle, invalidate, reset }
}
