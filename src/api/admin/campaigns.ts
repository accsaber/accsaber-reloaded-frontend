import type {
  AddCampaignMapRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from '@/types/api/admin'
import type {
  CampaignDetailResponse,
  CampaignMapResponse,
  CampaignResponse,
} from '@/types/api/campaigns'
import { patch, post } from '../client'

export function createCampaign(req: CreateCampaignRequest): Promise<CampaignResponse> {
  return post<CampaignResponse>('/admin/campaigns', req)
}

export function updateCampaign(
  campaignId: string,
  req: UpdateCampaignRequest,
): Promise<CampaignDetailResponse> {
  return patch<CampaignDetailResponse>(`/admin/campaigns/${campaignId}`, req)
}

export function deactivateCampaign(campaignId: string): Promise<void> {
  return patch<void>(`/admin/campaigns/${campaignId}/deactivate`)
}

export function addCampaignMap(
  campaignId: string,
  req: AddCampaignMapRequest,
): Promise<CampaignMapResponse> {
  return post<CampaignMapResponse>(`/admin/campaigns/${campaignId}/maps`, req)
}

export function deactivateCampaignMap(
  campaignId: string,
  campaignMapId: string,
): Promise<void> {
  return patch<void>(`/admin/campaigns/${campaignId}/maps/${campaignMapId}/deactivate`)
}
