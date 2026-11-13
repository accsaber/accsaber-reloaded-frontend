export type SectionKey = 'leaderboards' | 'items' | 'platform' | 'missions' | 'campaigns' | 'events'

export const STATS_SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: 'leaderboards', label: 'Leaderboards', icon: 'bars' },
  { key: 'items', label: 'Items', icon: 'package' },
  { key: 'missions', label: 'Missions', icon: 'target' },
  { key: 'campaigns', label: 'Campaigns', icon: 'nodes' },
  { key: 'events', label: 'Events', icon: 'calendar' },
  { key: 'platform', label: 'Platform', icon: 'pie' },
]

const SECTION_KEYS = new Set<string>(STATS_SECTIONS.map((s) => s.key))

export function resolveSection(raw: unknown): SectionKey {
  return typeof raw === 'string' && SECTION_KEYS.has(raw) ? (raw as SectionKey) : 'leaderboards'
}
