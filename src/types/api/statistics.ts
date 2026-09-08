import type { CampaignRequirementType, Difficulty } from '../enums'
import type { ItemRarity, ItemTypeKey } from './items'
import type { MissionBand, MissionPool, MissionType } from './missions'

export interface MapAvgApResponse {
  mapDifficultyId: string
  mapId: string
  songName: string
  songSubName: string | null
  songAuthor: string
  mapAuthor: string
  coverUrl: string
  cdnCoverUrl?: string | null
  difficulty: string
  characteristic?: string
  beatsaverCode?: string | null
  categoryId: string
  categoryName: string
  averageWeightedAp: number
  scoreCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface MapRetryResponse {
  mapDifficultyId: string
  mapId: string
  songName: string
  songSubName: string | null
  songAuthor: string
  mapAuthor: string
  coverUrl: string
  cdnCoverUrl?: string | null
  difficulty: string
  characteristic?: string
  beatsaverCode?: string | null
  categoryId: string
  categoryName: string
  supersededCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface UserImprovementsResponse {
  userId: string
  userName: string
  avatarUrl: string
  cdnAvatarUrl?: string | null
  country: string
  improvementCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface UserMapImprovementsResponse {
  userId: string
  userName: string
  avatarUrl: string
  cdnAvatarUrl?: string | null
  country: string
  mapDifficultyId: string
  mapId: string
  songName: string
  songSubName: string | null
  songAuthor: string
  mapAuthor: string
  coverUrl: string
  cdnCoverUrl?: string | null
  difficulty: string
  categoryId: string
  categoryName: string
  improvementCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface MilestoneCollectorResponse {
  userId: string
  userName: string
  avatarUrl: string
  cdnAvatarUrl?: string | null
  country: string
  milestoneCount: number
}

export interface ItemStatsPlayerRef {
  userId: string
  userName: string
  avatarUrl: string
  cdnAvatarUrl?: string | null
  country: string
}

export interface UserItemCountResponse extends ItemStatsPlayerRef {
  itemCount: number
}

export interface UserCrateCountResponse extends ItemStatsPlayerRef {
  crateCount: number
}

export interface UserInventoryValueResponse extends ItemStatsPlayerRef {
  itemsValue: number
  essenceBalance: number
  totalValue: number
}

export interface UserFirstEditionResponse extends ItemStatsPlayerRef {
  firstEditionCount: number
}

export interface UserCollectionResponse extends ItemStatsPlayerRef {
  ownedCount: number
  catalogTotal: number
  completionPercent: number
}

export interface UserTraderResponse extends ItemStatsPlayerRef {
  tradeCount: number
  itemsTraded: number
}

export interface RarestUnboxedResponse extends ItemStatsPlayerRef {
  linkId: string
  itemId: string
  itemName: string
  iconUrl?: string | null
  rarity: ItemRarity
  typeKey: ItemTypeKey
  serialNumber: number | null
  modifierCount: number
  modifiers: string[]
  unusualEffect?: string | null
}

export interface FirstEditionHolderResponse extends ItemStatsPlayerRef {
  linkId: string
  itemId: string
  itemName: string
  iconUrl?: string | null
  rarity: ItemRarity
  typeKey: ItemTypeKey
  serialNumber: number | null
}

export interface ItemScarcityResponse {
  itemId: string
  itemName: string
  iconUrl: string | null
  rarity: ItemRarity
  typeKey: ItemTypeKey
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
  userId: string
  userName: string
  avatarUrl: string | null
  cdnAvatarUrl?: string | null
  country: string
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
  mapDifficultyId: string
  songName: string
  songSubName: string | null
  songAuthor: string
  mapAuthor: string
  coverUrl: string | null
  cdnCoverUrl?: string | null
  difficulty: Difficulty
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
  userId: string
  userName: string
  avatarUrl: string | null
  cdnAvatarUrl?: string | null
  country: string
  completed: number
  inProgress: number
  nodesCleared: number
  campaignXp: number
}

export interface CampaignCreatorResponse {
  userId: string
  userName: string
  avatarUrl: string | null
  cdnAvatarUrl?: string | null
  country: string
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
  userId: string
  userName: string
  avatarUrl: string | null
  cdnAvatarUrl?: string | null
  country: string
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
