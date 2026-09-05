import type { CategoryCode } from '@/types/display'
import type { ItemResponse } from './items'

export type MissionType =
  | 'PLAY_N_MAPS'
  | 'XP_IN_WINDOW'
  | 'ACC_ON_MAP'
  | 'AP_ON_MAP'
  | 'PB_SPECIFIC_MAP'
  | 'PB_ABOVE_THRESHOLD'
  | 'SNIPE_PLAYER_ON_MAP'
  | 'STREAK_ON_MAP'
  | 'STREAK_N_IN_CATEGORY'
  | 'STREAK_SUM_N'
  | 'COMEBACK_PB'
  | 'SCORES_N'
  | 'SNIPE_RIVAL_ANY_MAP'
  | 'AP_GAIN_OVERALL'
  | 'BATCH_PLAY_N'
  | 'PB_RANKED_BEFORE_N'
  | 'CAMPAIGN_COMPLETE_N'

export type MissionPool = 'daily' | 'weekly' | 'event' | 'community'

export type MissionStatus = 'active' | 'completed' | 'expired' | 'voided'

export type MissionBand = 'easy' | 'medium' | 'hard' | 'extreme'

export interface MissionResponse {
  id: string
  name: string
  description: string
  type: MissionType
  pool: MissionPool

  categoryId?: string
  categoryCode?: CategoryCode

  targetMapDifficultyId?: string
  targetMapSongName?: string

  targetPlayerId?: string
  targetPlayerName?: string

  targetAcc?: number
  targetAp?: number
  targetScore?: number
  targetCount?: number
  targetXp?: number
  targetThresholdAp?: number
  targetStreak?: number

  xpReward?: number
  itemReward?: ItemResponse

  status?: MissionStatus
  band?: MissionBand
  progressCount?: number
  progressValue?: number
  targetValue?: number
  assignedAt?: string
  expiresAt?: string
  completedAt?: string

  code?: string
  week?: number
  unlocksAt?: string
  completableUntil?: string
  unlocked?: boolean
  open?: boolean
  repeatable?: boolean
  maxCompletions?: number

  contributors?: number
  yourContribution?: number
  endsWithWeek?: boolean
}

export interface MissionListParams {
  pool?: MissionPool
}

export interface CommunityMissionListParams {
  eventId?: string
  active?: boolean
}

export interface CommunityContributorResponse {
  rank: number
  userId: string
  userName: string
  userCountry: string
  userAvatarUrl?: string
  userCdnAvatarUrl?: string
  contribution: number
  firstAt: string
  lastAt: string
  rewardedAt?: string
}
