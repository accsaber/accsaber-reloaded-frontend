import type {
  ClanArena,
  ClanCapacity,
  ClanItemSource,
  ClanRole,
  ClanRuleset,
  ClanSeasonResponse,
  ClanStandingSource,
  ClanUnlocksResponse,
  ClanXpSource,
} from '@/types/api/clans'

export const CLAN_ROLE_LABEL: Record<ClanRole, string> = {
  member: 'Member',
  officer: 'Officer',
  commander: 'Commander',
  founder: 'Founder',
}

export const CLAN_ROLE_ORDER: ClanRole[] = ['founder', 'commander', 'officer', 'member']

export const CLAN_ROLE_PLURAL: Record<ClanRole, string> = {
  member: 'Members',
  officer: 'Officers',
  commander: 'Commanders',
  founder: 'Founder',
}

export const CLAN_CAPACITY_LABEL: Record<ClanCapacity, string> = {
  member_slots: 'member slots',
  mission_slots: 'mission slots',
  ally_slots: 'ally slots',
  lend_slots: 'lend slots',
  receive_slots: 'borrow slots',
  officer_slots: 'officer slots',
  commander_slots: 'commander slots',
}

export const CLAN_ARENA_LABEL: Record<ClanArena, string> = {
  mixed: 'Mixed pools',
  random: 'Random pools',
  category_turf: 'Category turf',
  complexity_turf: 'Complexity turf',
}

export const CLAN_RULESET_LABEL: Record<ClanRuleset, string> = {
  duel: 'Duels',
  berserker: 'Berserker',
}

export const CLAN_XP_SOURCE_LABEL: Record<ClanXpSource, string> = {
  daily_play: 'Daily play',
  mission: 'Mission',
  war_break: 'War break',
  war_win: 'War win',
  war_loan: 'War loan',
}

export const CLAN_STANDING_SOURCE_LABEL: Record<ClanStandingSource, string> = {
  war_break: 'War break',
  mission: 'Mission',
}

export const CLAN_ITEM_SOURCE_LABEL: Record<ClanItemSource, string> = {
  level: 'Level',
  season: 'Season',
  war: 'War',
  manual: 'Granted',
}

export function unlockLines(unlocks: ClanUnlocksResponse): string[] {
  const lines: string[] = []
  for (const [capacity, amount] of Object.entries(unlocks.capacities) as [ClanCapacity, number][]) {
    if (amount) lines.push(`+${amount} ${CLAN_CAPACITY_LABEL[capacity]}`)
  }
  for (const arena of unlocks.arenas) lines.push(CLAN_ARENA_LABEL[arena])
  for (const ruleset of unlocks.rulesets) lines.push(CLAN_RULESET_LABEL[ruleset])
  return lines
}

export function isSeasonRunning(season: ClanSeasonResponse, now = Date.now()): boolean {
  if (season.closedAt) return false
  return new Date(season.startsAt).getTime() <= now && new Date(season.endsAt).getTime() > now
}

export function formatStanding(value: number): string {
  return Math.round(value).toLocaleString()
}

export function formatSignedStanding(value: number): string {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString()}`
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now'
  const totalMinutes = Math.floor(ms / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
