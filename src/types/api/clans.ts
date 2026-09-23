import type { PaginationParams } from '../pagination'
import type { PlayerRef } from './common'
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

export type ClanXpSource = 'daily_play' | 'mission' | 'war_break' | 'war_win' | 'war_loan'

export type ClanCapacity =
  | 'member_slots'
  | 'mission_slots'
  | 'ally_slots'
  | 'lend_slots'
  | 'receive_slots'
  | 'officer_slots'
  | 'commander_slots'

export type ClanWarModeAxis = 'arena' | 'ruleset'

export type ClanAllianceStatus = 'pending' | 'active' | 'declined' | 'ended'

export type ClanStandingSource = 'war_break' | 'mission'

export type ClanItemSource = 'level' | 'season' | 'war' | 'manual'

export type ClanArena = 'mixed' | 'random' | 'category_turf' | 'complexity_turf'

export type ClanRuleset = 'duel' | 'berserker'

export type ClanWarStatus = 'picking' | 'preparing' | 'active' | 'ended'

export type ClanWarOutcome =
  | 'attacker_won'
  | 'defender_won'
  | 'drawn'
  | 'retreated'
  | 'forfeited'
  | 'season_ended'

export type ClanWarLoanStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'ended'

export type ClanWarPoolSource = 'pick' | 'replacement' | 'random'

export type ClanListSort = 'name' | 'level' | 'members' | 'standing'

export interface PublicClanResponse {
  id: string
  slug: string
  name: string
  tag: string
  tagColor: string | null
  iconUrl: string | null
  equipped: ItemResponse[]
}

export interface ClanResponse {
  clan: PublicClanResponse
  description: string | null
  acceptingRequests: boolean
  level: LevelResponse
  standing: number
  memberCount: number
  memberCap: number
  founder: PlayerRef | null
  createdAt: string
}

export interface ClanMemberResponse {
  player: PlayerRef
  role: ClanRole
  joinedAt: string
  online: boolean
  lastPlayedAt: string | null
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
  id: string
  source: ClanXpSource
  sourceId: string | null
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

export interface ClanTrustResponse {
  level: number
  loanCap: number
  contribution: number
}

export interface ClanAllianceResponse {
  id: string
  ally: PublicClanResponse
  status: ClanAllianceStatus
  incoming: boolean
  proposedBy: PlayerRef | null
  endedBy: PlayerRef | null
  trust: ClanTrustResponse | null
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
  lead: PlayerRef | null
  stake: number
  stakeRemaining: number
  standingAtDeclare: number
  picksSubmittedAt: string | null
}

export interface ClanWarResponse {
  id: string
  arena: ClanArena
  arenaSpec: ClanArenaSpec
  ruleset: ClanRuleset
  status: ClanWarStatus
  outcome: ClanWarOutcome | null
  declaredBy: PlayerRef | null
  attacker: ClanWarSideResponse
  defender: ClanWarSideResponse
  declaredAt: string
  picksDueAt: string | null
  startsAt: string | null
  endedAt: string | null
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
}

export interface ClanWarDetailResponse {
  war: ClanWarResponse
  pool: ClanWarPoolEntryResponse[]
}

export type ClanFeedFrame =
  | { type: 'war'; warId: string; data: ClanWarResponse }
  | { type: 'hit'; warId: string; data: ClanWarHitResponse }

export interface ClanWarParticipantResponse {
  player: PlayerRef
  clan: PublicClanResponse
  duelTarget: PlayerRef | null
  standingWeight: number
  guard: number
  guardCycle: number
  breaksSuffered: number
  contribution: number
  joinedAt: string
  leftAt: string | null
}

export interface ClanWarHitResponse {
  id: string
  attacker: PlayerRef
  victim: PlayerRef
  victimCycle: number
  difficulty: PublicMapDifficultyResponse
  missingScore: boolean
  damage: number
  guardAfter: number
  broke: boolean
  standingMoved: number
  xpAwarded: number | null
  createdAt: string
}

export interface ClanWarLoanResponse {
  id: string
  war: ClanWarRefResponse
  player: PlayerRef
  lendingClan: PublicClanResponse
  clan: PublicClanResponse
  status: ClanWarLoanStatus
  offeredBy: PlayerRef
  createdAt: string
  resolvedAt: string | null
  endedAt: string | null
}

export interface ClanWarRewardItemResponse {
  id: string
  item: ItemResponse
  quantity: number
  topContributors: number | null
  active: boolean
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

export interface ClanWarLoanListParams extends PaginationParams {
  status?: ClanWarLoanStatus
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
}

export interface UpdateClanRequest {
  name?: string
  tag?: string
  description?: string
  tagColor?: string
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
}

export interface UpdateClanWarRequest {
  status: ClanWarStatus
}

export interface OfferClanWarLoanRequest {
  userId: string
  clanId: string
}

export interface ResolveClanWarLoanRequest {
  status: ClanWarLoanStatus
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

export interface ModerateClanRequest {
  changes: UpdateClanRequest
  removeIcon?: boolean
  reason: string
}
