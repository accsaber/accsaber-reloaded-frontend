import {
  deletePlayerCampaignBarrier,
  deletePlayerCampaignDifficulty,
  deletePlayerCampaignText,
  updatePlayerCampaignBarrier,
  updatePlayerCampaignDifficulty,
} from '@/api/campaigns'
import { parseApiError } from '@/api/client'
import type {
  UpdateCampaignBarrierRequest,
  UpdateCampaignDifficultyRequest,
} from '@/types/api/admin'
import type { CampaignNodeBorderLayer } from '@/types/enums'
import { isMilestoneNode, nodeApRankBlocked } from '@/utils/campaignLayout'
import { computed, ref, watch, type ComputedRef } from 'vue'
import { CLEARABLE_TEXT_FIELDS, fieldPatch, type CampaignDocument } from './useCampaignDocument'
import type { CampaignSelection } from './useCampaignSelection'
import type { CampaignVertices } from './useCampaignVertices'

const DEFAULT_MILESTONE_LABEL = 'Milestone'

export const SHAPE_TILES = [
  { value: 'hex', label: 'Hex' },
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Circle' },
  { value: 'diamond', label: 'Diamond' },
] as const

export const SIZE_TILES = [
  { value: 32, label: 'Small', glyph: 5 },
  { value: 48, label: 'Medium', glyph: 7.5 },
  { value: 64, label: 'Large', glyph: 9.5 },
  { value: 80, label: 'Huge', glyph: 11.5 },
] as const

interface NodesContext {
  doc: CampaignDocument
  selection: CampaignSelection
  vertices: CampaignVertices
  editable: ComputedRef<boolean>
  isLiveCampaign: ComputedRef<boolean>
  terminalNodeIds: ComputedRef<Set<string>>
  cancelPendingText: (id: string) => boolean
}

export function useCampaignNodes(ctx: NodesContext) {
  const { campaign, actionPending, actionError, mergeDifficulty, load } = ctx.doc
  const { selectedIdList, clearSelection } = ctx.selection
  const { selectedDifficulty, isBarrierId, isTextId } = ctx.vertices
  const { editable, isLiveCampaign, terminalNodeIds, cancelPendingText } = ctx

  const formNode = ref<{
    description: string
    checkpointLabel: string
    checkpointLabelPosition: string
    checkpointColor: string
    checkpointSize: number | null
    nodeBorderLayer: CampaignNodeBorderLayer
    borderColor: string
    borderShape: string
    size: number | null
    xp: number
  }>({
    description: '',
    checkpointLabel: '',
    checkpointLabelPosition: '',
    checkpointColor: '',
    checkpointSize: null,
    nodeBorderLayer: 'ABOVE',
    borderColor: '',
    borderShape: '',
    size: null,
    xp: 0,
  })

  function syncFormFromNode() {
    const d = selectedDifficulty.value
    if (!d) return
    formNode.value = {
      description: d.description ?? '',
      checkpointLabel: d.checkpointLabel ?? '',
      checkpointLabelPosition: d.checkpointLabelPosition ?? '',
      checkpointColor: d.checkpointColor ?? '',
      checkpointSize: d.checkpointSize,
      nodeBorderLayer: d.nodeBorderLayer,
      borderColor: d.borderColor ?? '',
      borderShape: d.borderShape ?? 'hex',
      size: d.size,
      xp: d.xp ?? 0,
    }
  }

  watch(selectedDifficulty, syncFormFromNode, { immediate: true })

  async function applyNodePatch(id: string, patch: UpdateCampaignDifficultyRequest) {
    try {
      actionError.value = null
      mergeDifficulty(await updatePlayerCampaignDifficulty(id, patch))
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to update node').message
    }
  }

  function commitNodeField(field: keyof UpdateCampaignDifficultyRequest) {
    const d = selectedDifficulty.value
    if (!editable.value || !d) return
    const patch = fieldPatch(formNode.value, d, field, CLEARABLE_TEXT_FIELDS)
    if (patch) void applyNodePatch(d.id, patch as UpdateCampaignDifficultyRequest)
  }

  function selectNodeBorderLayer(layer: CampaignNodeBorderLayer) {
    formNode.value.nodeBorderLayer = layer
    commitNodeField('nodeBorderLayer')
  }

  function resetNodeColor(field: 'checkpointColor' | 'borderColor') {
    formNode.value[field] = ''
    commitNodeField(field)
  }

  function selectBorderShape(value: string) {
    formNode.value.borderShape = value
    commitNodeField('borderShape')
  }

  function selectNodeLabelPosition(value: string) {
    formNode.value.checkpointLabelPosition = value
    commitNodeField('checkpointLabelPosition')
  }

  function selectNodeSize(value: number) {
    formNode.value.size = value
    commitNodeField('size')
  }

  function setPrereqMode(mode: 'AND' | 'OR') {
    const d = selectedDifficulty.value
    if (!editable.value || !d) return
    if (d.prerequisiteMode === mode) return
    void applyNodePatch(d.id, { prerequisiteMode: mode })
  }

  const isMilestone = ref(false)
  let milestoneSyncedNodeId: string | null = null

  watch(
    selectedDifficulty,
    (d) => {
      if (!d) {
        milestoneSyncedNodeId = null
        isMilestone.value = false
        return
      }
      if (d.id === milestoneSyncedNodeId) return
      milestoneSyncedNodeId = d.id
      isMilestone.value = isMilestoneNode(d)
    },
    { immediate: true },
  )

  watch(
    () => formNode.value.checkpointLabel,
    (label) => {
      if (label.trim()) isMilestone.value = true
    },
  )

  function setMilestone(value: boolean) {
    isMilestone.value = value
    const d = selectedDifficulty.value
    if (value) {
      if (formNode.value.checkpointLabel.trim()) return
      formNode.value.checkpointLabel = DEFAULT_MILESTONE_LABEL
      if (d) void applyNodePatch(d.id, { checkpointLabel: DEFAULT_MILESTONE_LABEL })
      return
    }
    formNode.value.checkpointLabel = ''
    if (d) void applyNodePatch(d.id, { checkpointLabel: '' })
  }

  function commitMilestoneLabel() {
    const label = formNode.value.checkpointLabel.trim()
    formNode.value.checkpointLabel = label || DEFAULT_MILESTONE_LABEL
    commitNodeField('checkpointLabel')
  }

  const isTerminalNode = computed(() => !!selectedDifficulty.value?.terminal)

  const lockedLastTerminal = computed(
    () =>
      isLiveCampaign.value
      && isTerminalNode.value
      && terminalNodeIds.value.size === 1
      && terminalNodeIds.value.has(selectedDifficulty.value?.id ?? ''),
  )

  function setNodeTerminal(value: boolean) {
    const d = selectedDifficulty.value
    if (!editable.value || !d || d.terminal === value) return
    if (!value && lockedLastTerminal.value) {
      actionError.value =
        'This is the only ending. Flag another node first, or the campaign becomes impossible to finish.'
      return
    }
    void applyNodePatch(d.id, { terminal: value })
  }

  const selectedNodeApRankBlocked = computed(
    () => selectedDifficulty.value != null && nodeApRankBlocked(selectedDifficulty.value),
  )

  const apRankBlockedNodeIds = computed(() => {
    const ids = new Set<string>()
    for (const d of campaign.value?.difficulties ?? []) {
      if (nodeApRankBlocked(d)) ids.add(d.id)
    }
    return ids
  })

  const unrankedNodes = computed(() =>
    (campaign.value?.difficulties ?? [])
      .filter((d) => nodeApRankBlocked(d))
      .map((d) => ({ id: d.id, songName: d.songName })),
  )

  async function removeSelectedNode() {
    const d = selectedDifficulty.value
    if (!editable.value || !d || !campaign.value) return
    if (!window.confirm(`Remove "${d.songName}" from this campaign?`)) return
    actionPending.value = true
    actionError.value = null
    try {
      await deletePlayerCampaignDifficulty(campaign.value.id, d.id)
      clearSelection()
      await load(true)
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to remove node').message
    } finally {
      actionPending.value = false
    }
  }

  async function applyBulkPatch(
    patch: UpdateCampaignDifficultyRequest & UpdateCampaignBarrierRequest,
    includeBarriers: boolean,
  ) {
    if (!editable.value) return
    const ids = selectedIdList.value.filter(
      (id) => !isTextId(id) && (includeBarriers || !isBarrierId(id)),
    )
    actionError.value = null
    const results = await Promise.allSettled(
      ids.map((id) =>
        isBarrierId(id)
          ? updatePlayerCampaignBarrier(id, patch)
          : updatePlayerCampaignDifficulty(id, patch),
      ),
    )
    const updated = new Map<string, { id: string }>()
    for (const r of results) if (r.status === 'fulfilled') updated.set(r.value.id, r.value)
    if (campaign.value && updated.size > 0) {
      const swap = <T extends { id: string }>(rows: T[]) =>
        rows.map((r) => (updated.get(r.id) as T | undefined) ?? r)
      campaign.value = {
        ...campaign.value,
        difficulties: swap(campaign.value.difficulties),
        barriers: swap(campaign.value.barriers),
      }
    }
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) actionError.value = parseApiError(failed.reason, 'Failed to update node').message
  }

  function applyBulkSize(value: number) {
    return applyBulkPatch({ size: value }, true)
  }

  function applyBulkShape(value: string) {
    return applyBulkPatch({ borderShape: value }, false)
  }

  async function removeVertex(campaignId: string, id: string) {
    if (isBarrierId(id)) await deletePlayerCampaignBarrier(campaignId, id)
    else if (isTextId(id)) {
      if (!cancelPendingText(id)) await deletePlayerCampaignText(campaignId, id)
    } else await deletePlayerCampaignDifficulty(campaignId, id)
  }

  async function removeSelectedNodes() {
    if (!editable.value || !campaign.value) return
    const ids = selectedIdList.value
    if (ids.length === 0) return
    if (!window.confirm(`Remove ${ids.length} nodes from this campaign?`)) return
    actionPending.value = true
    actionError.value = null
    try {
      for (const id of ids) await removeVertex(campaign.value.id, id)
      clearSelection()
      await load(true)
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to remove nodes').message
    } finally {
      actionPending.value = false
    }
  }

  return {
    formNode,
    applyNodePatch,
    commitNodeField,
    selectNodeBorderLayer,
    resetNodeColor,
    selectBorderShape,
    selectNodeLabelPosition,
    selectNodeSize,
    setPrereqMode,
    isMilestone,
    setMilestone,
    commitMilestoneLabel,
    isTerminalNode,
    lockedLastTerminal,
    setNodeTerminal,
    selectedNodeApRankBlocked,
    apRankBlockedNodeIds,
    unrankedNodes,
    removeSelectedNode,
    applyBulkSize,
    applyBulkShape,
    removeSelectedNodes,
  }
}
