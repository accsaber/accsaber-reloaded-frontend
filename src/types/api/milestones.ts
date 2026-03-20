import type { MilestoneTier } from '../display'
import type { MilestoneComparison, MilestoneStatus, MilestoneType } from '../enums'
import type { PaginationParams } from '../pagination'

export interface MilestoneResponse {
  id: string
  setId: string
  categoryId: string | null
  title: string
  description: string
  type: MilestoneType
  tier: MilestoneTier
  xp: number
  querySpec: Record<string, unknown>
  targetValue: number
  comparison: MilestoneComparison
  status: MilestoneStatus
  completionPercentage: number
  completions: number
  totalPlayers: number
  createdAt: string
}

export interface MilestoneSetResponse {
  id: string
  title: string
  description: string
  setBonusXp: number
  createdAt: string
}

export interface MilestoneListParams extends PaginationParams {
  setId?: string
  categoryId?: string
  type?: MilestoneType
}

export interface AdminMilestoneListParams extends MilestoneListParams {
  status?: MilestoneStatus
}

export interface ActivateMilestonesRequest {
  milestoneIds: string[]
}
