import type {
  ClanArena,
  ClanAuditAction,
  ClanAuditEntryResponse,
  ClanCapacity,
  ClanItemSource,
  ClanLevelStepResponse,
  ClanResponse,
  ClanRole,
  ClanRuleset,
  ClanSeasonResponse,
  ClanStandingSource,
  ClanUnlocksResponse,
  ClanWarOutcome,
  ClanWarParticipantResponse,
  ClanWarRefResponse,
  ClanWarResponse,
  ClanWarStatus,
  ClanWarStrikeRulesResponse,
  ClanWarTargeting,
  ClanWarTeam,
  ClanWarTeamResponse,
  ClanXpGrantResponse,
  ClanXpSource,
  PublicClanResponse,
} from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { Rule } from '@/types/display'
import { formatDuration, formatRelativeDate } from '@/utils/formatters'
import { hueOf, parseHex } from '@/utils/color'

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

export const CLAN_CAPACITY_LABEL: Record<ClanCapacity, string> = {
  member_slots: 'member slots',
  ally_slots: 'ally slots',
  officer_slots: 'officer slots',
  commander_slots: 'commander slots',
}

export const CLAN_ARENA_LABEL: Record<ClanArena, string> = {
  mixed: 'Mixed pools',
  random: 'Random pools',
  modern_random: 'Modern random',
  category_turf: 'Category turf',
  complexity_turf: 'Complexity turf',
}

export function isRandomArena(arena: ClanArena): boolean {
  return arena === 'random' || arena === 'modern_random'
}

export const CLAN_RULESET_LABEL: Record<ClanRuleset, string> = {
  duel: 'Duels',
  berserker: 'Berserker',
}

export const CLAN_WAR_TARGETING_LABEL: Record<ClanWarTargeting, string> = {
  follow: 'Follow commands',
  auto: 'Auto',
  manual: 'Pick',
}

const CLAN_WAR_STATUS_LABEL: Record<ClanWarStatus, string> = {
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

export const CLAN_WAR_TEAM_LABEL: Record<ClanWarTeam, string> = {
  attack: 'Attack',
  defend: 'Defend',
}

export const OPPOSING_TEAM: Record<ClanWarTeam, ClanWarTeam> = {
  attack: 'defend',
  defend: 'attack',
}

export const WAR_TEAMS: ClanWarTeam[] = ['attack', 'defend']

export function warTeamOf(war: ClanWarResponse, clanId: string): ClanWarTeam | null {
  return WAR_TEAMS.find((team) => war[team].sides.some((side) => side.clan.id === clanId)) ?? null
}

export function warClan(war: ClanWarResponse, clanId: string): PublicClanResponse | null {
  for (const team of WAR_TEAMS) {
    const side = war[team].sides.find((s) => s.clan.id === clanId)
    if (side) return side.clan
  }
  return null
}

export function warLeadSide(team: ClanWarTeamResponse) {
  return team.sides.find((side) => side.clan.id === team.lead.id) ?? null
}

export function warLeadFallen(team: ClanWarTeamResponse): boolean {
  return !!warLeadSide(team)?.fallen
}

export function warOpponent(war: ClanWarResponse, clanId: string): PublicClanResponse {
  return war[OPPOSING_TEAM[warTeamOf(war, clanId) ?? 'defend']].lead
}

export interface WarWipe {
  wipedAt: number
  at: number
}

export function warWipe(war: ClanWarResponse, rules: ClanWarStrikeRulesResponse): WarWipe | null {
  if (!war.wipedAt) return null
  const wipedAt = Date.parse(war.wipedAt)
  return { wipedAt, at: wipedAt + rules.wipeDurationHours * 3_600_000 }
}

export function guardBackAt(brokenAt: string, reviveAt: string, wipe: WarWipe | null): number {
  const own = Date.parse(reviveAt)
  return wipe && Date.parse(brokenAt) <= wipe.wipedAt ? Math.min(own, wipe.at) : own
}

export function isPacifist(clan: ClanResponse, now = Date.now()): boolean {
  return !!clan.pacifistFrom && new Date(clan.pacifistFrom).getTime() <= now
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

export type WarAimReason = 'commander' | 'pick' | 'auto' | 'halt' | 'unpicked'

export function warAim(viewer: ClanWarParticipantResponse): { target: PlayerRef | null; reason: WarAimReason } {
  const orders = viewer.orders
  if (orders?.targeting === 'manual') return viewer.target ? { target: viewer.target, reason: 'pick' } : { target: null, reason: 'unpicked' }
  if (orders?.targeting === 'follow' && orders.order === 'halt') return { target: null, reason: 'halt' }
  if (orders?.targeting === 'follow' && orders.order === 'target' && orders.target) return { target: orders.target, reason: 'commander' }
  return { target: null, reason: 'auto' }
}

export function isWarRosterOpen(war: Pick<ClanWarResponse, 'status'>): boolean {
  return war.status === 'preparing' || war.status === 'active'
}

export function warResultFor(war: ClanWarResponse, clanId: string): string {
  const outcome = war.outcome
  if (!outcome) return CLAN_WAR_STATUS_LABEL[war.status]
  const attacking = warTeamOf(war, clanId) === 'attack'
  if (outcome === 'attacker_won') return attacking ? 'Won' : 'Lost'
  if (outcome === 'defender_won') return attacking ? 'Lost' : 'Won'
  if (outcome === 'retreated') return attacking ? 'Retreated' : 'Enemy retreated'
  return CLAN_WAR_OUTCOME_LABEL[outcome]
}

const DAY_MS = 86400000
const WAR_MAX_MS = 28 * DAY_MS

export interface WarClock {
  label: string
  value: string
}

export function warClock(war: ClanWarResponse, now: number, viewerTeam: ClanWarTeam | null = null): WarClock {
  if (war.status === 'picking' && war.picksDueAt) {
    return { label: 'Picks due', value: formatDuration(new Date(war.picksDueAt).getTime() - now, { zero: 'now' }) }
  }
  if (war.status === 'preparing' && war.startsAt) {
    return { label: 'Starts in', value: formatDuration(new Date(war.startsAt).getTime() - now, { zero: 'now' }) }
  }
  if (war.status === 'active' && war.retreatAt) {
    const label = viewerTeam === 'defend' ? 'Strike back before it ends' : 'Retreating, ends in'
    return { label, value: formatDuration(new Date(war.retreatAt).getTime() - now, { zero: 'now' }) }
  }
  if (war.status === 'active' && war.startsAt) {
    return { label: 'Time limit', value: formatDuration(new Date(war.startsAt).getTime() + WAR_MAX_MS - now, { zero: 'now' }) }
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
}


export function warRewardReach(topContributors?: number): string {
  return topContributors == null ? 'Everyone who contributes' : `Top ${topContributors} by contribution`
}

export function formatClanXp(xp: number): string {
  return xp.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export function clanXpGrantLabel(grant: ClanXpGrantResponse): string {
  if (grant.source !== 'play') return CLAN_XP_SOURCE_LABEL[grant.source]
  return grant.count > 1 ? `Plays x${grant.count}` : 'Play'
}

export function clanXpGrantWhen(grant: ClanXpGrantResponse, now = Date.now()): string {
  if (grant.source !== 'play') return formatRelativeDate(grant.createdAt, now)
  const days = Math.floor(now / DAY_MS) - Math.floor(new Date(grant.createdAt).getTime() / DAY_MS)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return new Date(grant.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
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

export interface RankSlot {
  role: ClanRole
  level: number
  open: boolean
}

const RANK_SLOT_CAPACITY: Partial<Record<ClanRole, ClanCapacity>> = {
  commander: 'commander_slots',
  officer: 'officer_slots',
}

export function rankSlots(steps: ClanLevelStepResponse[], level: number): RankSlot[] {
  const slots: RankSlot[] = []
  const ordered = [...steps].sort((a, b) => a.level - b.level)
  for (const [role, capacity] of Object.entries(RANK_SLOT_CAPACITY) as [ClanRole, ClanCapacity][]) {
    for (const step of ordered) {
      const amount = step.unlocks.capacities[capacity] ?? 0
      for (let i = 0; i < amount; i++) slots.push({ role, level: step.level, open: step.level <= level })
    }
  }
  return slots
}

export function hasUnlocks(unlocks: ClanUnlocksResponse): boolean {
  return (
    unlocks.cosmetics.length > 0 ||
    unlocks.arenas.length > 0 ||
    unlocks.rulesets.length > 0 ||
    Object.values(unlocks.capacities).some(Boolean)
  )
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

function hueLightness(hex: string): [number, number] {
  const rgb = parseHex(hex) ?? [0, 0, 0]
  const light = (Math.max(...rgb) + Math.min(...rgb)) / 510
  return [hueOf(hex) ?? 0, light]
}

function similarColors(a: string | null, b: string | null): boolean {
  if (!a || !b) return a === b
  const [ha, la] = hueLightness(a)
  const [hb, lb] = hueLightness(b)
  const hueGap = Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb))
  return hueGap < 30 && Math.abs(la - lb) < 0.2
}

export type WarSideStyles = Record<ClanWarTeam, Record<string, string>>

function clashSide(clan: PublicClanResponse): string {
  return clan.secondaryColor ? 'var(--clan-accent-2)' : 'oklch(from var(--clan-accent) l c calc(h + 150))'
}

export function warSideStyles(war: ClanWarResponse): WarSideStyles {
  const attack = war.attack.lead
  const defend = war.defend.lead
  const clash = similarColors(attack.primaryColor ?? attack.tagColor, defend.primaryColor ?? defend.tagColor)
  return {
    attack: { ...clanColorVars(attack), '--war-side': 'var(--clan-accent)' },
    defend: { ...clanColorVars(defend), '--war-side': clash ? clashSide(defend) : 'var(--clan-accent)' },
  }
}

export function warHeadline(war: ClanWarResponse): string | null {
  if (!war.outcome) return null
  if (war.outcome === 'attacker_won') return `${war.attack.lead.tag} wins`
  if (war.outcome === 'defender_won') return `${war.defend.lead.tag} wins`
  if (war.outcome === 'retreated') return `${war.attack.lead.tag} retreated`
  return CLAN_WAR_OUTCOME_LABEL[war.outcome]
}

type WarRuleset = Pick<ClanWarRefResponse, 'status' | 'ruleset'>

export function isBerserkerOffer(war: WarRuleset): boolean {
  return war.status === 'picking' && war.ruleset === 'berserker'
}

export function warRulesetLabel(war: WarRuleset): string {
  return isBerserkerOffer(war) ? 'Berserker offered' : CLAN_RULESET_LABEL[war.ruleset]
}

export function warModeLine(war: ClanWarResponse): string {
  return `${CLAN_ARENA_LABEL[war.arena]}, ${warRulesetLabel(war)}`
}

export const CLAN_RULES_LEAD = 'Clans are public. Keep yours within these rules:'

export const CLAN_RULES_NOTE =
  'By creating a clan, you agree to these rules. Breaking them results in an automatic, indefinite suspension from every AccSaber feature.'

export const CLAN_RULES: Rule[] = [
  {
    title: 'Keep artwork clean.',
    text: 'No NSFW or questionable imagery in clan icons, banners, or names.',
  },
  {
    title: 'No AI.',
    text: 'No AI-generated icons, banners, or text.',
  },
  {
    title: 'No hate.',
    text: 'No homophobia, racism, or slurs anywhere: names, tags, descriptions, or chat.',
  },
  {
    title: 'No mocking.',
    text: 'Do not build a clan to make fun of, call out, or disrespect other players or clans.',
  },
]
