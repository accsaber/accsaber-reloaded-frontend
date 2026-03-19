import type {
  AddCampaignMapRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from '@/types/api/admin'
import type { CampaignDetailResponse } from '@/types/api/campaigns'
import { del, post, put } from '../client'

export function createCampaign(req: CreateCampaignRequest): Promise<CampaignDetailResponse> {
  return post<CampaignDetailResponse>('/admin/campaigns', req)
}

export function updateCampaign(
  id: string,
  req: UpdateCampaignRequest,
): Promise<CampaignDetailResponse> {
  return put<CampaignDetailResponse>(`/admin/campaigns/${id}`, req)
}

export function deactivateCampaign(id: string): Promise<void> {
  return del<void>(`/admin/campaigns/${id}`)
}

export function addCampaignMap(
  campaignId: string,
  req: AddCampaignMapRequest,
): Promise<CampaignDetailResponse> {
  return post<CampaignDetailResponse>(`/admin/campaigns/${campaignId}/maps`, req)
}

export function deactivateCampaignMap(campaignId: string, mapId: string): Promise<void> {
  return del<void>(`/admin/campaigns/${campaignId}/maps/${mapId}`)
}
