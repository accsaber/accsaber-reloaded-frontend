import type { ClanSeasonResponse } from '@/types/api/clans'
import { isSeasonRunning } from '@/utils/clans'
import { computed, ref } from 'vue'

const RECENT_SEASONS = 5

function soonestUpcoming(seasons: ClanSeasonResponse[], now: number): ClanSeasonResponse | null {
  const upcoming = seasons.filter((s) => !s.closedAt && new Date(s.startsAt).getTime() > now)
  return upcoming[upcoming.length - 1] ?? null
}

export function useCurrentClanSeason() {
  const season = ref<ClanSeasonResponse | null>(null)
  const upcoming = ref<ClanSeasonResponse | null>(null)
  const running = computed(() => season.value !== null)

  async function load() {
    try {
      const { getClanSeasons } = await import('@/api/clans')
      const { content } = await getClanSeasons({ page: 0, size: RECENT_SEASONS })
      const now = Date.now()
      season.value = content.find((s) => isSeasonRunning(s, now)) ?? null
      upcoming.value = season.value ? null : soonestUpcoming(content, now)
    } catch {
      season.value = null
      upcoming.value = null
    }
  }

  load()
  return { season, upcoming, running }
}
