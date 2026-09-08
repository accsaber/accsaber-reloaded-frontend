export type SectionKey = 'leaderboards' | 'items' | 'platform' | 'missions' | 'campaigns' | 'events'

export interface StatsSection {
  key: SectionKey
  label: string
  title: string
}

export const STATS_SECTIONS: StatsSection[] = [
  { key: 'leaderboards', label: 'Leaderboards', title: 'Extra Leaderboards' },
  { key: 'items', label: 'Items', title: 'Item Stats' },
  { key: 'missions', label: 'Missions', title: 'Mission Stats' },
  { key: 'campaigns', label: 'Campaigns', title: 'Campaign Stats' },
  { key: 'events', label: 'Events', title: 'Event Stats' },
  { key: 'platform', label: 'Platform', title: 'Platform Stats' },
]

const SECTION_KEYS = new Set<string>(STATS_SECTIONS.map((s) => s.key))

export function resolveSection(raw: unknown): SectionKey {
  return typeof raw === 'string' && SECTION_KEYS.has(raw) ? (raw as SectionKey) : 'leaderboards'
}

export function sectionTitle(key: SectionKey): string {
  return STATS_SECTIONS.find((s) => s.key === key)?.title ?? 'Stats'
}
