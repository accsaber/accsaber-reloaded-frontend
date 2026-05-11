import type {
  CampaignMilestoneResponse,
  CreateCampaignMilestoneRequest,
  UpdateCampaignMilestoneRequest,
} from '@/types/api/campaign-milestones'
import { get, patch, post } from '../client'

export function getCampaignMilestones(campaignId: string): Promise<CampaignMilestoneResponse[]> {
  return get<CampaignMilestoneResponse[]>(`/admin/campaigns/${campaignId}/milestones`)
}

export function createCampaignMilestone(
  campaignId: string,
  req: CreateCampaignMilestoneRequest,
): Promise<CampaignMilestoneResponse> {
  return post<CampaignMilestoneResponse>(`/admin/campaigns/${campaignId}/milestones`, req)
}

export function updateCampaignMilestone(
  milestoneId: string,
  req: UpdateCampaignMilestoneRequest,
): Promise<CampaignMilestoneResponse> {
  return patch<CampaignMilestoneResponse>(
    `/admin/campaigns/milestones/${milestoneId}`,
    req,
  )
}

export function deactivateCampaignMilestone(milestoneId: string): Promise<void> {
  return patch<void>(`/admin/campaigns/milestones/${milestoneId}/deactivate`)
}
