import type {
  CampaignDetailResponse,
  CampaignListParams,
  CampaignResponse,
} from '@/types/api/campaigns'
import type { Page } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getCampaigns(params?: CampaignListParams): Promise<Page<CampaignResponse>> {
  return get<Page<CampaignResponse>>(`/campaigns${buildQuery(params)}`)
}

export function getCampaign(campaignId: string): Promise<CampaignDetailResponse> {
  return get<CampaignDetailResponse>(`/campaigns/${campaignId}`)
}
