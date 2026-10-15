import {
  curateCampaign,
  reopenCampaignForEdit,
  setCampaignLoved,
  setCampaignOfficial,
  uncurateCampaign,
} from '@/api/admin/campaigns'
import {
  deletePlayerCampaign,
  publishPlayerCampaign,
  unpublishPlayerCampaign,
} from '@/api/campaigns'
import type { CampaignAuditIssue } from '@/utils/campaignAudit'
import type { CampaignDetailResponse, CampaignResponse } from '@/types/api/campaigns'
import { computed, ref, type Ref } from 'vue'
import { parseApiError } from '@/api/client'

interface LifecycleContext {
  campaign: Ref<CampaignDetailResponse | null>
  actionPending: Ref<boolean>
  actionError: Ref<string | null>
  load: () => Promise<void>
  apply: (res: CampaignResponse) => void
  editedLiveCampaign: Ref<boolean>
  requirementDirtyIds: Ref<Set<string>>
  publishBlockers: Ref<CampaignAuditIssue[]>
}

export function useCampaignLifecycle(ctx: LifecycleContext) {
  const { campaign, actionPending, actionError, load, apply } = ctx

  async function run(action: () => Promise<CampaignResponse>, fallback: string): Promise<boolean> {
    actionPending.value = true
    actionError.value = null
    try {
      apply(await action())
      return true
    } catch (err) {
      actionError.value = parseApiError(err, fallback).message
      return false
    } finally {
      actionPending.value = false
    }
  }

  const showRepublishWarning = ref(false)
  const publishConfirm = ref<'publish' | 'unpublish' | null>(null)

  const publishBlocked = computed(() => ctx.publishBlockers.value.length > 0)

  function reportPublishBlocked(): boolean {
    if (!publishBlocked.value) return false
    actionError.value = ctx.publishBlockers.value[0].message
    return true
  }

  function doPlayerPublish() {
    if (!campaign.value || reportPublishBlocked()) return
    if (ctx.editedLiveCampaign.value && ctx.requirementDirtyIds.value.size > 0) {
      showRepublishWarning.value = true
      return
    }
    publishConfirm.value = 'publish'
  }

  async function performPublish() {
    if (!campaign.value) return
    showRepublishWarning.value = false
    publishConfirm.value = null
    const id = campaign.value.id
    await run(() => publishPlayerCampaign(id), 'Failed to publish campaign')
  }

  function doPlayerUnpublish() {
    if (!campaign.value) return
    publishConfirm.value = 'unpublish'
  }

  async function performUnpublish() {
    if (!campaign.value) return
    publishConfirm.value = null
    const id = campaign.value.id
    if (await run(() => unpublishPlayerCampaign(id), 'Failed to unpublish campaign')) {
      ctx.editedLiveCampaign.value = true
    }
  }

  async function deleteDraft() {
    if (!campaign.value) return
    if (!window.confirm('Delete this draft? This cannot be undone.')) return
    actionPending.value = true
    actionError.value = null
    try {
      await deletePlayerCampaign(campaign.value.id)
      window.location.assign('/campaigns')
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to delete draft').message
    } finally {
      actionPending.value = false
    }
  }

  async function doPublish() {
    if (!campaign.value || reportPublishBlocked()) return
    const id = campaign.value.id
    await run(() => publishPlayerCampaign(id), 'Failed to publish campaign')
  }

  async function doReopen() {
    if (!campaign.value) return
    const id = campaign.value.id
    await run(() => reopenCampaignForEdit(id), 'Failed to reopen for editing')
  }

  async function doCurate() {
    if (!campaign.value || reportPublishBlocked()) return
    const id = campaign.value.id
    await run(() => curateCampaign(id), 'Failed to curate campaign')
  }

  async function doUncurate() {
    if (!campaign.value) return
    const id = campaign.value.id
    await run(() => uncurateCampaign(id), 'Failed to uncurate campaign')
  }

  async function doToggleLoved() {
    if (!campaign.value) return
    const { id, loved } = campaign.value
    await run(() => setCampaignLoved(id, !loved), 'Failed to update loved status')
  }

  async function doToggleOfficial() {
    if (!campaign.value) return
    const { id, official } = campaign.value
    await run(() => setCampaignOfficial(id, !official), 'Failed to update official status')
  }

  async function doDeactivate() {
    if (!campaign.value) return
    if (
      !window.confirm('Deactivate this campaign? It will be hidden but player progress preserved.')
    )
      return
    actionPending.value = true
    actionError.value = null
    try {
      await deletePlayerCampaign(campaign.value.id)
      await load()
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to deactivate campaign').message
    } finally {
      actionPending.value = false
    }
  }

  return {
    showRepublishWarning,
    publishConfirm,
    publishBlocked,
    doPlayerPublish,
    performPublish,
    doPlayerUnpublish,
    performUnpublish,
    deleteDraft,
    doPublish,
    doReopen,
    doCurate,
    doUncurate,
    doToggleLoved,
    doToggleOfficial,
    doDeactivate,
  }
}
