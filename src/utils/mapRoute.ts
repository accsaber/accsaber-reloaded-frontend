import type { RouteLocationRaw } from 'vue-router'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function difficultyToSlug(difficulty: string): string {
  return difficulty.toLowerCase().replace(/_/g, '-')
}

export function slugToDifficulty(slug: string): string {
  return slug.toUpperCase().replace(/-/g, '_')
}

export interface MapRouteInput {
  beatsaverCode?: string | null
  mapId: string
  difficulty?: string | null
  difficultyId?: string | null
  characteristic?: string | null
}

export function buildMapRoute(input: MapRouteInput): RouteLocationRaw {
  const query: Record<string, string> = {}

  if (input.beatsaverCode) {
    if (input.difficulty) query.difficulty = difficultyToSlug(input.difficulty)
    if (input.characteristic && input.characteristic.toLowerCase() !== 'standard') {
      query.characteristic = input.characteristic
    }
    return { path: `/maps/${input.beatsaverCode}`, query }
  }

  if (input.difficultyId) query.difficultyId = input.difficultyId
  return { path: `/maps/${input.mapId}`, query }
}
