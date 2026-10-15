import type { Crumb } from '@/components/common/Breadcrumbs.vue'
import { useCampaignAccent } from '@/composables/useCampaignAccent'
import { auditCampaign, campaignPublishBlockers } from '@/utils/campaignAudit'
import { computed, ref } from 'vue'
import { useCampaignAccess } from './useCampaignAccess'
import { useCampaignAssets } from './useCampaignAssets'
import { useCampaignBarriers } from './useCampaignBarriers'
import { useCampaignConnections } from './useCampaignConnections'
import { useCampaignDocument } from './useCampaignDocument'
import { useCampaignLifecycle } from './useCampaignLifecycle'
import { useCampaignMapSources } from './useCampaignMapSources'
import { useCampaignMeta } from './useCampaignMeta'
import { useCampaignNodes } from './useCampaignNodes'
import { useCampaignRewards } from './useCampaignRewards'
import { useCampaignSelection } from './useCampaignSelection'
import { useCampaignTargets } from './useCampaignTargets'
import { useCampaignTexts } from './useCampaignTexts'
import { useCampaignTrays, type TrayId } from './useCampaignTrays'
import { useCampaignVertices } from './useCampaignVertices'

export function useCampaignEditor() {
  const { campaignAccent } = useCampaignAccent()
  const activeTray = ref<TrayId | null>(null)

  const doc = useCampaignDocument({
    draft: () => meta.formMeta.value,
    isCurator: () => access.isCurator.value,
    onLoaded: (c) => {
      void access.collaborators.loadCollaborators()
      selection.restoreSelection(c)
    },
    onSwitch: () => selection.clearSelection(),
  })
  const { campaign } = doc
  const access = useCampaignAccess(doc)
  const { editable, isLiveCampaign } = access
  const selection = useCampaignSelection(campaign)
  const vertices = useCampaignVertices({
    doc,
    selectedId: selection.selectedId,
    isPendingText: (id) => texts.isPendingText(id),
  })
  const meta = useCampaignMeta({ doc, editable, isLiveCampaign })
  const connections = useCampaignConnections({ doc, vertices, editable })
  const nodes = useCampaignNodes({
    doc,
    selection,
    vertices,
    editable,
    isLiveCampaign,
    terminalNodeIds: meta.terminalNodeIds,
    cancelPendingText: (id) => texts.cancelPendingText(id),
  })
  const targets = useCampaignTargets({
    vertices,
    editable,
    requirementDirtyIds: doc.requirementDirtyIds,
    applyNodePatch: nodes.applyNodePatch,
  })
  const barriers = useCampaignBarriers({
    doc,
    selection,
    vertices,
    connections,
    editable,
    activeTray,
  })
  const texts = useCampaignTexts({ doc, selection, vertices, editable, activeTray })
  const mapSources = useCampaignMapSources({ doc, selection, vertices, editable, activeTray })

  const campaignAudit = computed(() => auditCampaign(campaign.value))
  const publishBlockers = computed(() => campaignPublishBlockers(campaign.value))

  const trays = useCampaignTrays({
    doc,
    access,
    selection,
    vertices,
    connections,
    barriers,
    mapSources,
    terminalMode: meta.terminalMode,
    publishBlockers,
    activeTray,
  })

  const lifecycle = useCampaignLifecycle({
    campaign,
    actionPending: doc.actionPending,
    actionError: doc.actionError,
    load: doc.load,
    apply: doc.applyCampaignResponse,
    editedLiveCampaign: doc.editedLiveCampaign,
    publishBlockers,
    requirementDirtyIds: doc.requirementDirtyIds,
  })

  const rewards = useCampaignRewards({
    campaign,
    ensureCampaign: doc.ensureCampaign,
    actionPending: doc.actionPending,
    actionError: doc.actionError,
    editable,
    selectedDifficulty: vertices.selectedDifficulty,
    selectedBarrier: vertices.selectedBarrier,
  })

  const assets = useCampaignAssets({
    campaign,
    apply: doc.applyCampaignResponse,
    editable,
    selectedDifficulty: vertices.selectedDifficulty,
    mergeDifficulty: doc.mergeDifficulty,
  })

  const accent = computed(() => campaignAccent(campaign.value?.tags))

  const breadcrumbs = computed<Crumb[]>(() => {
    const title = doc.isUnsavedDraft.value ? 'New campaign' : campaign.value?.name || 'Editor'
    return [{ label: 'Campaigns', to: '/campaigns' }, { label: title }]
  })

  return {
    doc,
    access,
    collaborators: access.collaborators,
    selection,
    vertices,
    meta,
    connections,
    nodes,
    targets,
    barriers,
    texts,
    mapSources,
    trays,
    lifecycle,
    rewards,
    assets,
    campaignAudit,
    publishBlockers,
    accent,
    breadcrumbs,
  }
}
