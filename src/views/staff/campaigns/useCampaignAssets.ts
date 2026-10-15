import {
  deleteCampaignBackground,
  deleteCampaignCheckpointAvatar,
  deleteCampaignIcon,
  deleteCampaignNodeBorder,
  uploadCampaignBackground,
  uploadCampaignCheckpointAvatar,
  uploadCampaignIcon,
  uploadCampaignNodeBorder,
} from '@/api/cdn'
import type {
  CampaignDetailResponse,
  CampaignDifficultyResponse,
  CampaignResponse,
} from '@/types/api/campaigns'
import type { ComputedRef, Ref } from 'vue'

interface AssetsContext {
  campaign: Ref<CampaignDetailResponse | null>
  apply: (res: CampaignResponse) => void
  editable: ComputedRef<boolean>
  selectedDifficulty: ComputedRef<CampaignDifficultyResponse | null>
  mergeDifficulty: (updated: CampaignDifficultyResponse) => void
}

export function useCampaignAssets(ctx: AssetsContext) {
  const { campaign, apply, editable, selectedDifficulty, mergeDifficulty } = ctx

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

  function editableNode(): CampaignDifficultyResponse | null {
    return editable.value ? selectedDifficulty.value : null
  }

  async function uploadCheckpointAvatar(file: File) {
    const d = editableNode()
    if (d) mergeDifficulty(await uploadCampaignCheckpointAvatar(d.id, file))
  }

  async function removeCheckpointAvatar() {
    const d = editableNode()
    if (d) mergeDifficulty(await deleteCampaignCheckpointAvatar(d.id))
  }

  async function uploadNodeBorder(file: File) {
    const d = editableNode()
    if (d) mergeDifficulty(await uploadCampaignNodeBorder(d.id, file))
  }

  async function removeNodeBorder() {
    const d = editableNode()
    if (d) mergeDifficulty(await deleteCampaignNodeBorder(d.id))
  }

  return {
    uploadBackground,
    removeBackground,
    uploadIcon,
    removeIcon,
    uploadCheckpointAvatar,
    removeCheckpointAvatar,
    uploadNodeBorder,
    removeNodeBorder,
  }
}
