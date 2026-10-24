import type { PaginationParams } from '../pagination'
import type { MapDifficultyRef, PlayerRef } from './common'
import type { ItemResponse } from './items'
import type { PublicMapDifficultyResponse } from './maps'
import type { MyScoreSummary } from './users'
import type { LevelResponse } from './users'

export type ClanRole = 'member' | 'officer' | 'commander' | 'founder'

export type ClanJoinDirection = 'invite' | 'request'

export type ClanJoinStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'

export type ClanAuditAction =
  | 'profile_updated'
  | 'cosmetic_equipped'
  | 'role_changed'
  | 'founder_transferred'
  | 'founder_claimed'
  | 'member_kicked'
  | 'alliance_formed'
  | 'alliance_ended'
  | 'disbanded'

export type ClanXpSource = 'play' | 'mission' | 'war_break' | 'war_win'

export type ClanCapacity =
  | 'member_slots'
  | 'ally_slots'
  | 'officer_slots'
  | 'commander_slots'

export type ClanWarModeAxis = 'arena' | 'ruleset'

export type ClanAllianceStatus = 'pending' | 'active' | 'declined' | 'ended'

export type ClanStandingSource = 'war_break' | 'mission'

export type ClanItemSource = 'level' | 'season' | 'war' | 'manual'

export type ClanArena = 'mixed' | 'random' | 'modern_random' | 'category_turf' | 'complexity_turf'

export type ClanRuleset = 'duel' | 'berserker'

export type ClanWarTargeting = 'follow' | 'auto' | 'manual'

export type ClanWarOrder = 'auto' | 'target' | 'halt'

export type ClanWarStatus = 'picking' | 'preparing' | 'active' | 'ended'

export type ClanWarOutcome =
  | 'attacker_won'
  | 'defender_won'
  | 'drawn'
  | 'retreated'
  | 'forfeited'
  | 'season_ended'

export type ClanWarTeam = 'attack' | 'defend'

export type ClanWarAidDirection = 'request' | 'offer'

export type ClanWarAidStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export type ClanWarPoolSource = 'pick' | 'replacement' | 'random'

export interface PublicClanResponse {
  id: string
  slug: string
  name: string
  tag: string
  tagColor: string | null
  primaryColor: string | null
  secondaryColor: string | null
  iconUrl: string | null
  equipped: ItemResponse[]
}

export interface ClanResponse {
  clan: PublicClanResponse
  description: string | null
  bannerUrl: string | null
  acceptingRequests: boolean
  level: LevelResponse
  standing: number
  memberCount: number
  memberCap: number
  founder: PlayerRef | null
  pacifistFrom: string | null
  createdAt: string
}

export interface ClanMembershipResponse {
  role: ClanRole
  joinedAt: string
  joinCooldownEndsAt: string
  online: boolean
  lastPlayedAt: string | null
  strengthShare: number
  skill: number
  seasonPlayXp: number
  seasonHits: number
  seasonBreaks: number
}

export interface ClanJoinRequestResponse {
  id: string
  clan: PublicClanResponse
  player: PlayerRef
  direction: ClanJoinDirection
  status: ClanJoinStatus
  createdBy: PlayerRef
  resolvedBy: PlayerRef | null
  createdAt: string
  resolvedAt: string | null
}

export interface ClanAuditEntryResponse {
  id: string
  action: ClanAuditAction
  actor: PlayerRef | null
  target: PlayerRef | null
  details: Record<string, unknown> | null
  createdAt: string
}

export interface ClanUnlocksResponse {
  capacities: Partial<Record<ClanCapacity, number>>
  arenas: ClanArena[]
  rulesets: ClanRuleset[]
  cosmetics: ItemResponse[]
}

export interface ClanLevelResponse {
  progress: LevelResponse
  unlocked: ClanUnlocksResponse
  rosterFactor?: number
  seasonXpBySource?: Partial<Record<ClanXpSource, number>>
}

export interface ClanLevelStepResponse {
  level: number
  totalXpRequired: number
  unlocks: ClanUnlocksResponse
}

export interface ClanItemResponse {
  item: ItemResponse
  source: ClanItemSource
  acquiredAt: string
  equipped: boolean
}

export interface ClanXpGrantResponse {
  id: string | null
  source: ClanXpSource
  sourceId: string | null
  count: number
  rawAmount: number
  rosterFactor: number
  amount: number
  createdAt: string
}

export interface ClanSeasonResponse {
  id: string
  name: string
  slug: string
  startsAt: string
  endsAt: string
  closedAt: string | null
}

export interface ClanSeasonRewardResponse {
  id: string
  rankFrom: number
  rankTo: number
  item: ItemResponse
  quantity: number
}

export interface ClanStandingResponse {
  clan: PublicClanResponse
  rank: number
  standing: number
  baseStanding: number
  earned: number
}

export interface ClanStandingEventResponse {
  id: string
  source: ClanStandingSource
  sourceId: string | null
  amount: number
  createdAt: string
}

export interface ClanAllianceResponse {
  id: string
  ally: PublicClanResponse
  status: ClanAllianceStatus
  incoming: boolean
  proposedBy: PlayerRef | null
  endedBy: PlayerRef | null
  warsFoughtTogether: number
  createdAt: string
  acceptedAt: string | null
  endedAt: string | null
}

export interface ClanRivalResponse {
  clan: PublicClanResponse
  incoming: boolean
  declaredBy: PlayerRef | null
  since: string
}

export interface ClanArenaSpec {
  categoryId?: string
  complexityMin?: number
  complexityMax?: number
  poolSize: number
  attackerPicks: number
  defenderPicks: number
}

export interface ClanWarSideResponse {
  clan: PublicClanResponse
  team: ClanWarTeam
  lead: PlayerRef | null
  stake: number
  stakeRemaining: number
  standingAtDeclare: number
  picksSubmittedAt: string | null
  joinedAt: string
  leftAt: string | null
  fallen: boolean
}

export interface ClanWarTeamResponse {
  lead: PublicClanResponse
  stake: number
  stakeRemaining: number
  sides: ClanWarSideResponse[]
}

export interface ClanWarResponse {
  id: string
  arena: ClanArena
  arenaSpec: ClanArenaSpec
  ruleset: ClanRuleset
  status: ClanWarStatus
  outcome: ClanWarOutcome | null
  declaredBy: PlayerRef | null
  attack: ClanWarTeamResponse
  defend: ClanWarTeamResponse
  declaredAt: string
  picksDueAt: string | null
  startsAt: string | null
  retreatAt: string | null
  endedAt: string | null
  wipedAt?: string | null
}

export interface ClanWarRefResponse {
  id: string
  arena: ClanArena
  ruleset: ClanRuleset
  status: ClanWarStatus
  outcome: ClanWarOutcome | null
}

export interface ClanWarPoolEntryResponse {
  difficulty: PublicMapDifficultyResponse
  pickedBy: PublicClanResponse | null
  source: ClanWarPoolSource
  viewerScore: MyScoreSummary | null
  target: PlayerRef | null
  targetScore: MyScoreSummary | null
  targetPicked: boolean
}

export interface ClanWarTimelinePointResponse {
  at: string
  clanId: string
  damage: number
  hits: number
  breaks: number
  standingMoved: number
}

export interface ClanWarDetailResponse {
  war: ClanWarResponse
  pool: ClanWarPoolEntryResponse[]
  timeline: ClanWarTimelinePointResponse[]
  strikeRules: ClanWarStrikeRulesResponse
  lastStand?: Record<ClanWarTeam, number>
}

export interface ClanWarStrikeRulesResponse {
  guard: number
  baseDamage: number
  escalation: number
  disparityExponent: number
  missingScoreMultiplier: number
  missingScoreEscalation: number
  chipEscalation: number
  mapBreakDecay: number
  mapBreakFloor: number
  lastStandDamage: number
  lastStandFrom: number
  chipDamage: number
  chipWindow: number
  chipSkillExponent: number
  brokenDurationHours: number
  wipeDurationHours: number
}

export interface ClanWarStrikeMapResponse {
  targetScore?: number
  repeatMap: boolean
  mapPenalty: number
}

export interface ClanWarStrikePreviewResponse {
  damage: number
  hitsToBreak: number
  hitsThisCycle: number
  noScoreHitsThisCycle: number
  chipsThisCycle: number
  attackerSkill: number
  victimSkill: number
  disparity: number
  lastStand: number
  standingTaken: number
  standingGained: number
  onMap?: ClanWarStrikeMapResponse
}

export type ClanFeedFrame =
  | { type: 'war'; warId: string; data: ClanWarResponse }
  | { type: 'hit'; warId: string; data: ClanWarHitResponse }

export interface ClanWarOrdersResponse {
  targeting: ClanWarTargeting
  order: ClanWarOrder
  target: PlayerRef | null
}

export interface ClanWarParticipantResponse {
  player: PlayerRef
  clanId: string
  target: PlayerRef | null
  orders?: ClanWarOrdersResponse
  skill: number
  standingWeight: number
  guard: number
  guardCycle: number
  brokenAt?: string
  breaksSuffered: number
  contribution: number
  joinedAt: string
  leftAt: string | null
  strikePreview: ClanWarStrikePreviewResponse | null
}

export interface ClanWarHitResponse {
  id: string
  attacker: PlayerRef
  victim: PlayerRef
  victimCycle: number
  map: MapDifficultyRef
  missingScore: boolean
  chip: boolean
  damage: number
  guardAfter: number
  broke: boolean
  standingMoved: number
  xpAwarded: number | null
  createdAt: string
}

export interface ClanWarAidResponse {
  id: string
  war: ClanWarRefResponse
  clan: PublicClanResponse
  lead: PublicClanResponse
  team: ClanWarTeam
  direction: ClanWarAidDirection
  status: ClanWarAidStatus
  requestedBy: PlayerRef
  createdAt: string
  resolvedAt: string | null
}

export interface ClanWarRewardItemResponse {
  id: string
  item: ItemResponse
  quantity: number
  topContributors?: number
  active: boolean
}

export interface ClanWarRewardsResponse {
  pool: ClanWarRewardItemResponse[]
  winClanXp: number
  winStanding: number
  clans: { clan: PublicClanResponse; clanXp: number; standing: number; items: ClanWarRewardItemResponse[] }[]
  players: { player: PlayerRef; clan: PublicClanResponse; xp: number; items: ClanWarRewardItemResponse[] }[]
}

export interface ClanStatsResponse {
  clan: PublicClanResponse | null
  role: ClanRole | null
  joinedAt: string | null
  warsFought: number
  warsWon: number
  hits: number
  breaksDealt: number
  breaksSuffered: number
  standingMoved: number
  contribution: number
  warXp: number
}

export interface ClanListParams extends PaginationParams {
  search?: string
}

export interface ClanWarAidListParams extends PaginationParams {
  warId?: string
  clanId?: string
  status?: ClanWarAidStatus
}

export interface ClanWarListParams extends PaginationParams {
  clanId?: string
  open?: boolean
  search?: string
}

export interface ClanStandingParams {
  season?: string
}

export interface ClanStandingEventParams extends PaginationParams {
  season?: string
}

export interface ClanRivalListParams extends PaginationParams {
  incoming?: boolean
}

export interface ClanMissionListParams extends PaginationParams {
  current?: boolean
}

export interface CreateClanRequest {
  name: string
  tag: string
  description?: string
  tagColor?: string
  primaryColor?: string
  secondaryColor?: string
  acceptingRequests?: boolean
  pacifist?: boolean
}

export interface UpdateClanRequest {
  name?: string
  tag?: string
  description?: string
  tagColor?: string
  primaryColor?: string
  secondaryColor?: string
  acceptingRequests?: boolean
}

export interface UpdateClanMemberRequest {
  role: ClanRole
}

export interface TransferClanFounderRequest {
  userId: string
}

export interface CreateClanJoinRequest {
  userId?: string
}

export interface ResolveClanJoinRequest {
  status: ClanJoinStatus
}

export interface EquipClanItemRequest {
  itemId: string
  variantKey?: string
}

export interface CreateClanAllianceRequest {
  clanId: string
}

export interface ResolveClanAllianceRequest {
  status: ClanAllianceStatus
}

export interface CreateClanRivalRequest {
  clanId: string
}

export interface DeclareClanWarRequest {
  clanId: string
  arena: ClanArena
  ruleset: ClanRuleset
  categoryId?: string
  complexityMin?: number
  complexityMax?: number
  mapDifficultyIds: string[]
}

export interface SubmitClanWarPicksRequest {
  mapDifficultyIds: string[]
  berserker?: boolean
}

export interface UpdateClanWarRequest {
  status: ClanWarStatus
}

export interface RequestClanWarAidRequest {
  clanId: string
}

export interface OfferClanWarAidRequest {
  team: ClanWarTeam
}

export interface ResolveClanWarAidRequest {
  status: ClanWarAidStatus
}

export interface UpdateClanWarSideRequest {
  left: boolean
}

export interface ChooseClanWarTargetRequest {
  targeting: ClanWarTargeting
  userId?: string | null
}

export interface GiveClanWarOrderRequest {
  userId: string
  order: ClanWarOrder
  targetUserId?: string
}

export interface UpdateClanPacifismRequest {
  enabled: boolean
}

export interface ClanCapacityRequest {
  amount: number
}

export interface ClanWarModeRequest {
  level: number
}

export interface ClanSeasonRequest {
  name?: string
  slug?: string
  startsAt?: string
  endsAt?: string
}

export interface ClanSeasonRewardRequest {
  rankFrom: number
  rankTo: number
  itemId: string
  quantity?: number
}

export interface ClanWarRewardItemRequest {
  itemId?: string
  quantity?: number
  topContributors?: number
  active?: boolean
}

export type ClanMediaKind = 'icon' | 'banner'

export interface ModerateClanRequest {
  changes: UpdateClanRequest
  removeMedia?: ClanMediaKind[]
  reason: string
}
