import {
  deleteCampaignBackground,
  deleteCampaignIcon,
  uploadCampaignBackground,
  uploadCampaignIcon,
} from '@/api/cdn'
import type { CampaignDetailResponse, CampaignResponse } from '@/types/api/campaigns'
import type { Ref } from 'vue'

interface AssetsContext {
  campaign: Ref<CampaignDetailResponse | null>
  apply: (res: CampaignResponse) => void
}

export function useCampaignAssets(ctx: AssetsContext) {
  const { campaign, apply } = ctx

  async function uploadBackground(file: File) {
    if (campaign.value) apply(await uploadCampaignBackground(campaign.value.id, file))
  }

  async function removeBackground() {
    if (campaign.value) apply(await deleteCampaignBackground(campaign.value.id))
  }

  async function uploadIcon(file: File) {
    if (campaign.value) apply(await uploadCampaignIcon(campaign.value.id, file))
  }

  async function removeIcon() {
    if (campaign.value) apply(await deleteCampaignIcon(campaign.value.id))
  }

  return { uploadBackground, removeBackground, uploadIcon, removeIcon }
}
