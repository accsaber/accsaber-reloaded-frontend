export const ADMIN_TABS = [
  { key: 'users', label: 'Users' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'items', label: 'Items' },
  { key: 'news', label: 'News' },
  { key: 'events', label: 'Events' },
  { key: 'clans', label: 'Clans' },
  { key: 'operations', label: 'Operations' },
] as const

export type AdminTab = (typeof ADMIN_TABS)[number]['key']

export const DEFAULT_ADMIN_TAB: AdminTab = 'users'

const LABELS = new Map<string, string>(ADMIN_TABS.map((t) => [t.key, t.label]))

export function isAdminTab(value: unknown): value is AdminTab {
  return typeof value === 'string' && LABELS.has(value)
}

export function adminTabLabel(tab: AdminTab): string {
  return LABELS.get(tab) as string
}
