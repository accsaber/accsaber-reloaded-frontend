import type { MapDifficultyRef, PlayerRef } from './common'
import type { MilestoneTier } from '../enums'
import type { MilestoneComparison, MilestoneStatus, MilestoneType } from '../enums'
import type { PaginationParams } from '../pagination'
import type { ItemResponse } from './items'

export const MILESTONE_ICON_GROUPS = [
  'AP',
  'ACCURACY',
  'RANK',
  'STREAK',
  'SCORE',
  'MAP',
  'MISTAKE',
  'XP',
  'PLAYER',
  'LEVEL',
  'MODIFIER',
  'CAMPAIGN',
  'MISSION',
  'MILESTONE',
  'ITEM',
  'CRATE',
  'MARKET',
  'TRADE',
  'ESSENCE',
  'GENERAL',
] as const

export type MilestoneIconGroup = (typeof MILESTONE_ICON_GROUPS)[number]

export interface MilestoneRewardResponse {
  item: ItemResponse
  quantity: number
}

export interface MilestoneResponse {
  id: string
  setId: string
  categoryId: string | null
  title: string
  description: string
  type: MilestoneType
  tier: MilestoneTier
  iconGroup?: MilestoneIconGroup | null
  xp: number
  querySpec: Record<string, unknown>
  targetValue: number
  comparison: MilestoneComparison
  status: MilestoneStatus
  completionPercentage: number
  completions: number
  totalPlayers: number
  awardsItemId: string | null
  rewards?: MilestoneRewardResponse[] | null
  positionX?: number
  positionY?: number
  progressModel?: string | null
  progressCurveId?: string | null
  progressFloor?: number | null
  createdAt: string
}

export interface MilestoneSetResponse {
  id: string
  title: string
  description: string
  setBonusXp: number
  awardsItemId: string | null
  rewards?: MilestoneRewardResponse[] | null
  createdAt: string
  userCompletionPercentage?: number
}

export interface MilestoneCompletionResponse {
  milestoneId: string
  title: string
  description: string
  type: MilestoneType
  tier: MilestoneTier
  iconGroup?: MilestoneIconGroup | null
  querySpec?: Record<string, unknown> | null
  xp: number
  targetValue: number
  comparison: MilestoneComparison
  setId: string
  categoryId: string | null
  completions: number
  totalPlayers: number
  completionPercentage: number
  rewards?: MilestoneRewardResponse[] | null
  positionX?: number
  positionY?: number
  userProgress?: number
  userNormalizedProgress?: number | null
  userCompleted?: boolean
  userCompletedAt?: string
  achievedWithScoreId?: string
  score?: number
  maxScore?: number
  map?: MapDifficultyRef
}

export interface MilestoneListParams extends PaginationParams {
  setId?: string
  categoryId?: string
  type?: MilestoneType
}

export interface AdminMilestoneListParams extends MilestoneListParams {
  status?: MilestoneStatus
}

export interface PrerequisiteLinkResponse {
  id: string
  milestoneId: string
  prerequisiteMilestoneId: string
  prerequisiteTitle: string
  prerequisiteTier: string
  prerequisiteSetId?: string
  prerequisiteSetTitle?: string
  blocker: boolean
  createdAt: string
}

export interface MilestoneHolderResponse {
  player: PlayerRef
  completedAt: string
}

export interface SetGroupResponse {
  id: string
  name: string
  description: string
  createdAt: string
  links?: SetGroupLinkResponse[]
}

export interface SetGroupLinkResponse {
  id: string
  groupId: string
  groupName: string
  setId: string
  setTitle: string
  sortOrder: number
  createdAt: string
}

export interface ActivateMilestonesRequest {
  milestoneIds: string[]
}

export type MilestoneSort = 'tier' | 'completions' | 'completedAt' | 'progress'
