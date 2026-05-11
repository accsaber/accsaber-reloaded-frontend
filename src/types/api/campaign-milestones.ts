export interface CampaignMilestoneResponse {
  id: string
  campaignId: string
  title: string
  description: string | null
  avatarUrl: string | null
  xp: number
  awardsItemId: string | null
  active: boolean
  createdAt: string
}

export interface CreateCampaignMilestoneRequest {
  title: string
  description?: string
  avatarUrl?: string
  xp?: number
  awardsItemId?: string
}

export interface UpdateCampaignMilestoneRequest {
  title?: string
  description?: string
  avatarUrl?: string
  xp?: number
  awardsItemId?: string
}
