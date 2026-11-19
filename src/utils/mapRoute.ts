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

function difficultyQuery(input: { difficulty?: string | null; characteristic?: string | null }): Record<string, string> {
  const query: Record<string, string> = {}
  if (input.difficulty) query.difficulty = difficultyToSlug(input.difficulty)
  if (input.characteristic && input.characteristic.toLowerCase() !== 'standard') {
    query.characteristic = input.characteristic
  }
  return query
}

export function buildMapRoute(input: MapRouteInput): RouteLocationRaw {
  if (input.beatsaverCode) return { path: `/maps/${input.beatsaverCode}`, query: difficultyQuery(input) }
  return { path: `/maps/${input.mapId}`, query: input.difficultyId ? { difficultyId: input.difficultyId } : {} }
}

export interface HubRouteInput {
  id: string
  beatsaverCode?: string | null
  difficulty: string
  characteristic: string
}

export function buildHubRoute(input: HubRouteInput, byId = false): RouteLocationRaw {
  if (!input.beatsaverCode || byId) return { path: `/ranked-queue/${input.id}` }
  return { path: `/ranked-queue/${input.beatsaverCode}`, query: difficultyQuery(input) }
}

export function buildRankingMapRoute(input: HubRouteInput, byId = false): RouteLocationRaw {
  if (!input.beatsaverCode || byId) return { name: 'ranking-map-detail', params: { ref: input.id } }
  return { name: 'ranking-map-detail', params: { ref: input.beatsaverCode }, query: difficultyQuery(input) }
}
