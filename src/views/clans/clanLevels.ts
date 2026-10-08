import type { ClanLevelStepResponse } from '@/types/api/clans'

let table: Promise<ClanLevelStepResponse[]> | null = null

export function loadClanLevels(): Promise<ClanLevelStepResponse[]> {
  table ??= import('@/api/clans')
    .then((api) => api.getClanLevels())
    .catch((err: unknown) => {
      table = null
      throw err
    })
  return table
}
