import type { Difficulty } from '../enums'
import type { PaginationParams } from '../pagination'

export interface CampaignResponse {
  id: string
  creatorId: string
  creatorName: string
  name: string
  description: string
  difficulty: string
  verified: boolean
  mapCount: number
  createdAt: string
}

export interface CampaignDetailResponse extends CampaignResponse {
  maps: CampaignMapResponse[]
}

export interface CampaignMapResponse {
  id: string
  mapDifficultyId: string
  songName: string
  songAuthor: string
  mapAuthor: string
  coverUrl: string
  difficulty: Difficulty
  characteristic: string
  accuracyRequirement: number
  xp: number
  prerequisiteMapIds: string[]
}

export interface CampaignProgressResponse {
  maps: CampaignMapProgressResponse[]
}

export interface CampaignMapProgressResponse {
  campaignMapId: string
  completed: boolean
  bestAccuracy: number | null
  completedAt: string | null
}

export interface CampaignListParams extends PaginationParams {
  verified?: boolean
}
