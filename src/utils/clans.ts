import type {
  ClanArena,
  ClanAuditAction,
  ClanAuditEntryResponse,
  ClanCapacity,
  ClanItemSource,
  ClanLevelStepResponse,
  ClanRole,
  ClanRuleset,
  ClanSeasonResponse,
  ClanStandingSource,
  ClanUnlocksResponse,
  ClanWarLoanStatus,
  ClanWarOutcome,
  ClanWarPoolSource,
  ClanWarResponse,
  ClanWarStatus,
  ClanXpSource,
  PublicClanResponse,
} from '@/types/api/clans'
import { formatRelativeDate } from '@/utils/formatters'

export const CLAN_ROLE_LABEL: Record<ClanRole, string> = {
  member: 'Member',
  officer: 'Officer',
  commander: 'Commander',
  founder: 'Founder',
}

export const CLAN_ROLE_ORDER: ClanRole[] = ['founder', 'commander', 'officer', 'member']

const CLAN_ROLE_RANK: Record<ClanRole, number> = { member: 0, officer: 1, commander: 2, founder: 3 }

export function hasClanRole(role: ClanRole | null | undefined, minimum: ClanRole): boolean {
  return !!role && CLAN_ROLE_RANK[role] >= CLAN_ROLE_RANK[minimum]
}

export function outranks(viewer: ClanRole | null | undefined, target: ClanRole): boolean {
  return !!viewer && CLAN_ROLE_RANK[viewer] > CLAN_ROLE_RANK[target]
}

export function assignableRoles(viewer: ClanRole | null | undefined, target: ClanRole): ClanRole[] {
  if (!outranks(viewer, target)) return []
  const options: ClanRole[] = hasClanRole(viewer, 'founder')
    ? ['member', 'officer', 'commander']
    : hasClanRole(viewer, 'commander')
      ? ['member', 'officer']
      : []
  return options.filter((role) => role !== target)
}

export const CLAN_ROLE_PLURAL: Record<ClanRole, string> = {
  member: 'Members',
  officer: 'Officers',
  commander: 'Commanders',
  founder: 'Founder',
}

export const CLAN_CAPACITY_LABEL: Record<ClanCapacity, string> = {
  member_slots: 'member slots',
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

export const CLAN_WAR_STATUS_LABEL: Record<ClanWarStatus, string> = {
  picking: 'Picking',
  preparing: 'Preparing',
  active: 'Active',
  ended: 'Ended',
}

export const CLAN_WAR_OUTCOME_LABEL: Record<ClanWarOutcome, string> = {
  attacker_won: 'Attacker won',
  defender_won: 'Defender won',
  drawn: 'Draw',
  retreated: 'Retreated',
  forfeited: 'Forfeited',
  season_ended: 'Season ended',
}

export const CLAN_WAR_POOL_SOURCE_LABEL: Record<ClanWarPoolSource, string> = {
  pick: 'Pick',
  replacement: 'Swapped in',
  random: 'Random',
}

export const CLAN_LOAN_STATUS_LABEL: Record<ClanWarLoanStatus, string> = {
  pending: 'Pending',
  accepted: 'Fighting',
  declined: 'Declined',
  cancelled: 'Cancelled',
  ended: 'Ended',
}

export const WAR_POOL_SIZE = 10
export const WAR_MAX_UNDERDOG_SHARE = 0.85

export function attackerPickCount(attackerStanding: number, defenderStanding: number): number {
  const stronger = Math.max(attackerStanding, defenderStanding)
  const ratio = stronger > 0 ? Math.min(attackerStanding, defenderStanding) / stronger : 1
  const underdog = 0.5 + (WAR_MAX_UNDERDOG_SHARE - 0.5) * (1 - ratio)
  const share = attackerStanding < defenderStanding ? underdog : 1 - underdog
  return Math.round(WAR_POOL_SIZE * share)
}

export function warResultFor(war: ClanWarResponse, clanId: string): string {
  const outcome = war.outcome
  if (!outcome) return CLAN_WAR_STATUS_LABEL[war.status]
  const attacking = war.attacker.clan.id === clanId
  if (outcome === 'attacker_won') return attacking ? 'Won' : 'Lost'
  if (outcome === 'defender_won') return attacking ? 'Lost' : 'Won'
  if (outcome === 'retreated') return attacking ? 'Retreated' : 'Enemy retreated'
  return CLAN_WAR_OUTCOME_LABEL[outcome]
}

export interface WarClock {
  label: string
  value: string
}

export function warClock(war: ClanWarResponse, now: number): WarClock {
  if (war.status === 'picking' && war.picksDueAt) {
    return { label: 'Picks due', value: formatCountdown(new Date(war.picksDueAt).getTime() - now) }
  }
  if (war.status === 'preparing' && war.startsAt) {
    return { label: 'Starts in', value: formatCountdown(new Date(war.startsAt).getTime() - now) }
  }
  if (war.status === 'active' && war.startsAt) {
    return { label: 'Running for', value: formatCountdown(now - new Date(war.startsAt).getTime()) }
  }
  if (war.endedAt) {
    return { label: war.outcome ? CLAN_WAR_OUTCOME_LABEL[war.outcome] : 'Ended', value: formatRelativeDate(war.endedAt, now) }
  }
  return { label: CLAN_WAR_STATUS_LABEL[war.status], value: '' }
}

export const CLAN_XP_SOURCE_LABEL: Record<ClanXpSource, string> = {
  play: 'Plays',
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

export interface LockedRankSlot {
  role: ClanRole
  level: number
}

const RANK_SLOT_CAPACITY: Partial<Record<ClanRole, ClanCapacity>> = {
  commander: 'commander_slots',
  officer: 'officer_slots',
}

export function lockedRankSlots(steps: ClanLevelStepResponse[], level: number): LockedRankSlot[] {
  const slots: LockedRankSlot[] = []
  const upcoming = steps.filter((s) => s.level > level).sort((a, b) => a.level - b.level)
  for (const [role, capacity] of Object.entries(RANK_SLOT_CAPACITY) as [ClanRole, ClanCapacity][]) {
    for (const step of upcoming) {
      const amount = step.unlocks.capacities[capacity] ?? 0
      for (let i = 0; i < amount; i++) slots.push({ role, level: step.level })
    }
  }
  return slots
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

export const CLAN_AUDIT_LABEL: Record<ClanAuditAction, string> = {
  profile_updated: 'Profile updated',
  cosmetic_equipped: 'Cosmetic changed',
  role_changed: 'Rank changed',
  founder_transferred: 'Founder transferred',
  founder_claimed: 'Clan claimed',
  member_kicked: 'Member kicked',
  alliance_formed: 'Alliance formed',
  alliance_ended: 'Alliance ended',
  disbanded: 'Disbanded',
}

const PROFILE_FIELD_LABEL: Record<string, string> = {
  name: 'Name',
  tag: 'Tag',
  description: 'Description',
  tagColor: 'Tag colour',
  primaryColor: 'Primary colour',
  secondaryColor: 'Secondary colour',
  icon: 'Icon',
  acceptingRequests: 'Taking requests',
  reason: 'Reason',
}

function isClanRole(value: unknown): value is ClanRole {
  return typeof value === 'string' && value in CLAN_ROLE_LABEL
}

export function auditDetailLines(entry: ClanAuditEntryResponse): string[] {
  const details = entry.details
  if (!details) return []
  if (entry.action === 'role_changed' && isClanRole(details.from) && isClanRole(details.to)) {
    return [`${CLAN_ROLE_LABEL[details.from]} to ${CLAN_ROLE_LABEL[details.to]}`]
  }
  if (entry.action === 'cosmetic_equipped') {
    const slot = String(details.itemType ?? '').replace(/^clan_/, '').replace(/_/g, ' ')
    return [details.itemId ? `Equipped ${slot}` : `Unequipped ${slot}`]
  }
  if (entry.action === 'alliance_formed' || entry.action === 'alliance_ended') {
    return typeof details.name === 'string' ? [details.name] : []
  }
  return Object.entries(details)
    .filter(([key]) => key in PROFILE_FIELD_LABEL)
    .map(([key, value]) => {
      const shown = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
      return `${PROFILE_FIELD_LABEL[key]}: ${shown}`
    })
}

export interface ClanProfileDraft {
  name: string
  tag: string
  description: string
  tagColor: string
  primaryColor: string
  secondaryColor: string
}

export function emptyClanDraft(): ClanProfileDraft {
  return { name: '', tag: '', description: '', tagColor: '', primaryColor: '', secondaryColor: '' }
}

export function clanDraftFrom(clan: PublicClanResponse, description: string | null): ClanProfileDraft {
  return {
    name: clan.name,
    tag: clan.tag,
    description: description ?? '',
    tagColor: clan.tagColor ?? '',
    primaryColor: clan.primaryColor ?? '',
    secondaryColor: clan.secondaryColor ?? '',
  }
}

type ClanColors = Pick<PublicClanResponse, 'tagColor' | 'primaryColor' | 'secondaryColor'>

export function clanColorVars(clan: ClanColors): Record<string, string> {
  const vars: Record<string, string> = {}
  const primary = clan.primaryColor ?? clan.tagColor
  if (primary) vars['--clan-primary'] = primary
  if (clan.secondaryColor) vars['--clan-secondary'] = clan.secondaryColor
  return vars
}

export const WAR_GUARD_MAX = 100

function hueLightness(hex: string): [number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const light = (max + min) / 2
  if (max === min) return [0, light]
  const d = max - min
  const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [hue * 60, light]
}

function similarColors(a: string | null, b: string | null): boolean {
  if (!a || !b) return a === b
  const [ha, la] = hueLightness(a)
  const [hb, lb] = hueLightness(b)
  const hueGap = Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb))
  return hueGap < 30 && Math.abs(la - lb) < 0.2
}

export interface WarSideStyles {
  attacker: Record<string, string>
  defender: Record<string, string>
}

function clashSide(clan: PublicClanResponse): string {
  return clan.secondaryColor ? 'var(--clan-accent-2)' : 'oklch(from var(--clan-accent) l c calc(h + 150))'
}

export function warSideStyles(war: ClanWarResponse): WarSideStyles {
  const attacker = war.attacker.clan
  const defender = war.defender.clan
  const clash = similarColors(attacker.primaryColor ?? attacker.tagColor, defender.primaryColor ?? defender.tagColor)
  return {
    attacker: { ...clanColorVars(attacker), '--war-side': 'var(--clan-accent)' },
    defender: { ...clanColorVars(defender), '--war-side': clash ? clashSide(defender) : 'var(--clan-accent)' },
  }
}

export function warHeadline(war: ClanWarResponse): string | null {
  if (!war.outcome) return null
  if (war.outcome === 'attacker_won') return `${war.attacker.clan.tag} wins`
  if (war.outcome === 'defender_won') return `${war.defender.clan.tag} wins`
  if (war.outcome === 'retreated') return `${war.attacker.clan.tag} retreated`
  return CLAN_WAR_OUTCOME_LABEL[war.outcome]
}

export function warModeLine(war: ClanWarResponse): string {
  return `${CLAN_ARENA_LABEL[war.arena]}, ${CLAN_RULESET_LABEL[war.ruleset]}`
}
