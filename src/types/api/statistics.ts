import type { CampaignRequirementType } from '../enums'
import type { MapDifficultyRef, PlayerRef } from './common'
import type { ItemResponse } from './items'
import type { MissionBand, MissionPool, MissionType } from './missions'

export interface MapAvgApResponse {
  map: MapDifficultyRef
  averageWeightedAp: number
  scoreCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface MapRetryResponse {
  map: MapDifficultyRef
  supersededCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface UserImprovementsResponse {
  player: PlayerRef
  improvementCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface UserMapImprovementsResponse {
  player: PlayerRef
  map: MapDifficultyRef
  improvementCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface MilestoneCollectorResponse {
  player: PlayerRef
  milestoneCount: number
}

export interface UserItemCountResponse {
  player: PlayerRef
  itemCount: number
}

export interface UserCrateCountResponse {
  player: PlayerRef
  crateCount: number
}

export interface UserInventoryValueResponse {
  player: PlayerRef
  itemsValue: number
  essenceBalance: number
  totalValue: number
}

export interface UserFirstEditionResponse {
  player: PlayerRef
  firstEditionCount: number
}

export interface UserCollectionResponse {
  player: PlayerRef
  ownedCount: number
  catalogTotal: number
  completionPercent: number
}

export interface UserTraderResponse {
  player: PlayerRef
  tradeCount: number
  itemsTraded: number
}

export interface RarestUnboxedResponse {
  player: PlayerRef
  linkId: string
  itemId: string
  item: ItemResponse | null
  serialNumber: number | null
  modifierCount: number
  modifiers: string[]
  unusualEffect?: string | null
}

export interface FirstEditionHolderResponse {
  player: PlayerRef
  linkId: string
  itemId: string
  item: ItemResponse | null
  serialNumber: number | null
}

export interface ItemScarcityResponse {
  itemId: string
  item: ItemResponse | null
  ownerCount: number
  instanceCount: number
}

export interface TimeSeriesPointResponse {
  date: string
  value: number
}

export interface DistributionEntryResponse {
  label: string
  count: number
}

export type MissionTier = 'unknown' | 'new' | 'casual' | 'moderate' | 'strong' | 'top' | 'elite'

export type MissionProgressAxis = 'COUNT' | 'XP' | 'AP' | 'BINARY'

export type CampaignStatsStatus = 'published' | 'editing' | 'curated' | 'loved' | 'official'

export interface MissionCalibrationResponse {
  templateId: string
  templateCode: string
  templateName: string
  type: MissionType
  pool: MissionPool
  band: MissionBand | null
  categoryId: string | null
  categoryName: string | null
  tier: MissionTier | null
  eventWeek: number | null
  assigned: number
  completed: number
  expired: number
  stillOpen: number
  completionRate: number | null
  progressed: number | null
  progressedCompletionRate: number | null
  averageHoursToComplete: number | null
  averageXpReward: number | null
  itemsAwarded: number
}

export interface MissionXpResponse {
  templateId: string
  templateCode: string
  templateName: string
  type: MissionType
  pool: MissionPool
  band: MissionBand
  completed: number
  xpPaid: number
  averageXp: number | null
  medianXp: number | null
  p90Xp: number | null
  shareOfMissionXp: number | null
  itemsAwarded: number
}

export interface MissionShortfallResponse {
  band: MissionBand
  axis: MissionProgressAxis
  failed: number
  measured: number
  medianReachedFraction: number | null
  buckets: DistributionEntryResponse[]
}

export interface MissionCompletorResponse {
  player: PlayerRef
  missionsCompleted: number
  missionXp: number
}

export interface CampaignFunnelResponse {
  campaignId: string
  name: string
  slug: string
  iconUrl: string | null
  status: string
  official: boolean
  loved: boolean
  participants: number
  inProgress: number
  completed: number
  abandoned: number
  completionRate: number | null
  abandonRate: number | null
  medianDaysToComplete: number | null
  nodeCount: number
}

export interface CampaignNodeDifficultyResponse {
  campaignDifficultyId: string
  map: MapDifficultyRef
  barrier: boolean
  terminal: boolean
  requirementType: CampaignRequirementType | null
  requirementValue: number | null
  xp: number
  unlocked: number
  cleared: number
  clearRate: number | null
  medianDaysToClear: number | null
}

export interface CampaignCompletorResponse {
  player: PlayerRef
  completed: number
  inProgress: number
  nodesCleared: number
  campaignXp: number
}

export interface CampaignCreatorResponse {
  player: PlayerRef
  campaigns: number
  curatedCampaigns: number
  participants: number
  completions: number
  completionRate: number | null
}

export interface EventWeekStatsResponse {
  week: number
  missionsAssigned: number
  missionsCompleted: number
  missionsExpired: number
  missionsOpen: number
  completionRate: number | null
  xpPaid: number
  participantsReached: number
  participantsStoppedHere: number
}

export interface EventMissionStatsResponse {
  templateId: string
  templateCode: string
  templateName: string
  type: MissionType
  week: number
  repeatable: boolean
  players: number
  playersCompleted: number
  playersExpired: number
  playersOpen: number
  completions: number
  completionRate: number | null
  medianCompletionsPerPlayer: number | null
  xpPaid: number
  itemsAwarded: number
}

export interface EventMissionLeaderboardResponse {
  rank: number
  player: PlayerRef
  completions: number
  xpEarned: number
  itemsAwarded: number
  lastCompletedAt: string | null
}

export interface EventSummaryResponse {
  eventId: string
  title: string
  slug: string
  startsAt: string
  endsAt: string
  daysRan: number
  totalWeeks: number
  week: number | null
  participants: number
  finishers: number
  finishRate: number | null
  averageMissionsCompleted: number | null
  medianMissionsCompleted: number | null
  bonusXpPaid: number
  missionXpPaid: number
  totalXpPaid: number
  missionsAssigned: number
  missionsCompleted: number
  missionsExpired: number
  missionsOpen: number
  missionCompletionRate: number | null
  weeks: EventWeekStatsResponse[]
  missions: EventMissionStatsResponse[]
}

export interface EventParticipationResponse {
  eventId: string
  title: string
  slug: string
  iconUrl: string | null
  startsAt: string
  endsAt: string
  participants: number
  finishers: number
  finishRate: number | null
  missionsCompleted: number
  averageMissionsPerParticipant: number | null
}

export interface MissionStatsParams {
  pool?: MissionPool[]
  type?: MissionType[]
  templateId?: string
  categoryId?: string[]
  band?: MissionBand[]
  tier?: MissionTier[]
  skillMin?: number
  skillMax?: number
  country?: string
  from?: string
  to?: string
  minAssigned?: number
}

export interface CampaignStatsParams {
  status?: CampaignStatsStatus[]
  country?: string
  minParticipants?: number
}

export interface StatsChartRange {
  amount?: number
  unit?: string
}
