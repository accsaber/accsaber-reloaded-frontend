import type { CampaignAuditIssue } from '@/utils/campaignAudit'
import { computed, watch, type ComputedRef, type Ref } from 'vue'
import type { useCampaignAccess } from './useCampaignAccess'
import type { CampaignBarriers } from './useCampaignBarriers'
import type { CampaignConnections, CampaignEdge } from './useCampaignConnections'
import type { CampaignDocument } from './useCampaignDocument'
import type { CampaignMapSources } from './useCampaignMapSources'
import type { CampaignSelection } from './useCampaignSelection'
import type { CampaignVertices } from './useCampaignVertices'

export type TrayId =
  | 'status'
  | 'identity'
  | 'settings'
  | 'images'
  | 'completion'
  | 'collaborators'
  | 'tags'
  | 'requirement'
  | 'ending'
  | 'milestone'
  | 'shape'
  | 'unlock'
  | 'rewards'
  | 'bulk'
  | 'barrierCondition'
  | 'barrierAffected'
  | 'barrierStyle'
  | 'barrierRewards'
  | 'text'
  | 'connection'

export type TrayDef = { id: TrayId; label: string; icon: string; count?: number; tone?: string }

export const TRAY_TITLES: Record<TrayId, string> = {
  status: 'Status',
  identity: 'Identity',
  settings: 'Settings',
  images: 'Images',
  completion: 'Completion rewards',
  collaborators: 'Collaborators',
  tags: 'Tags',
  requirement: 'Requirement',
  ending: 'Ending',
  milestone: 'Milestone',
  shape: 'Shape',
  unlock: 'Unlock when',
  rewards: 'Node rewards',
  bulk: 'Selection',
  barrierCondition: 'Barrier condition',
  barrierAffected: 'Affected nodes',
  barrierStyle: 'Barrier style',
  barrierRewards: 'Barrier rewards',
  text: 'Text element',
  connection: 'Connection',
}

const NODE_TRAY_IDS: TrayId[] = ['requirement', 'ending', 'milestone', 'shape', 'unlock', 'rewards']
const BARRIER_TRAY_IDS: TrayId[] = [
  'barrierCondition',
  'barrierAffected',
  'barrierStyle',
  'barrierRewards',
]
const CONDITIONAL_NODE_TRAY_IDS: TrayId[] = ['unlock', 'ending']

interface TraysContext {
  doc: CampaignDocument
  access: ReturnType<typeof useCampaignAccess>
  selection: CampaignSelection
  vertices: CampaignVertices
  connections: CampaignConnections
  barriers: CampaignBarriers
  mapSources: CampaignMapSources
  terminalMode: ComputedRef<boolean>
  publishBlockers: ComputedRef<CampaignAuditIssue[]>
  activeTray: Ref<TrayId | null>
}

export function useCampaignTrays(ctx: TraysContext) {
  const { campaign, isUnsavedDraft } = ctx.doc
  const { isCreator, isCurator, editable } = ctx.access
  const { isCollaborator, activeCollaborators, loadCollaborators } = ctx.access.collaborators
  const { selectedIds, selectedId, selectedCount, isMultiSelect } = ctx.selection
  const { selectOnly, setSelection, toggleInSelection, clearSelection } = ctx.selection
  const { selectedDifficulty, selectedBarrier, selectedText } = ctx.vertices
  const { difficultyById, isBarrierId, isTextId } = ctx.vertices
  const { selectedEdge } = ctx.connections
  const { affectedPickMode, barrierPlacementMode, toggleAffected } = ctx.barriers
  const { showMapPicker } = ctx.mapSources
  const { terminalMode, publishBlockers, activeTray } = ctx

  const campaignTrays = computed<TrayDef[]>(() => {
    const trays: TrayDef[] = [
      {
        id: 'status',
        label: 'Status',
        icon: 'flag',
        tone: campaign.value?.status.toLowerCase(),
        count: publishBlockers.value.length,
      },
      { id: 'identity', label: 'Identity', icon: 'identity' },
      { id: 'settings', label: 'Settings', icon: 'sliders' },
      { id: 'images', label: 'Images', icon: 'image' },
      {
        id: 'completion',
        label: 'Rewards',
        icon: 'gift',
        count: campaign.value?.completionItems.length ?? 0,
      },
    ]
    const member = isCreator.value || isCollaborator.value || isCurator.value
    if (!isUnsavedDraft.value && member) {
      trays.push({
        id: 'collaborators',
        label: 'Collab',
        icon: 'users',
        count: activeCollaborators.value.length,
      })
    }
    if (member) {
      trays.push({ id: 'tags', label: 'Tags', icon: 'tag', count: campaign.value?.tags.length ?? 0 })
    }
    return trays
  })

  const nodeTrays = computed<TrayDef[]>(() => {
    if (selectedEdge.value) {
      return [{ id: 'connection', label: 'Style', icon: 'link' }]
    }
    if (isMultiSelect.value) {
      return [{ id: 'bulk', label: 'Selection', icon: 'layers', count: selectedCount.value }]
    }
    if (selectedBarrier.value) {
      const b = selectedBarrier.value
      return [
        { id: 'barrierCondition', label: 'Condition', icon: 'target' },
        {
          id: 'barrierAffected',
          label: 'Affected',
          icon: 'link',
          count: b.affectedCampaignDifficultyIds?.length ?? 0,
        },
        { id: 'barrierStyle', label: 'Style', icon: 'hexagon' },
        { id: 'barrierRewards', label: 'Rewards', icon: 'package', count: b.items.length },
      ]
    }
    if (selectedText.value) {
      return [{ id: 'text', label: 'Text', icon: 'type' }]
    }
    const d = selectedDifficulty.value
    if (!d) return []
    const trays: TrayDef[] = [{ id: 'requirement', label: 'Goal', icon: 'target' }]
    if (terminalMode.value) {
      trays.push({ id: 'ending', label: 'Ending', icon: 'flag' })
    }
    trays.push(
      { id: 'milestone', label: 'Milestone', icon: 'award' },
      { id: 'shape', label: 'Shape', icon: 'hexagon' },
    )
    if ((d.prerequisites ?? []).length >= 2) {
      trays.push({ id: 'unlock', label: 'Unlock', icon: 'link' })
    }
    trays.push({ id: 'rewards', label: 'Rewards', icon: 'package', count: d.items.length })
    return trays
  })

  const activeTrayIsNode = computed(
    () => !!activeTray.value && NODE_TRAY_IDS.includes(activeTray.value),
  )

  const activeTrayIsBarrier = computed(
    () => !!activeTray.value && BARRIER_TRAY_IDS.includes(activeTray.value),
  )

  function toggleTray(id: TrayId) {
    activeTray.value = activeTray.value === id ? null : id
  }

  function closeTray() {
    activeTray.value = null
  }

  watch(activeTray, (tray) => {
    if (tray === 'collaborators') void loadCollaborators()
  })

  watch(selectedIds, () => {
    if (
      selectedIds.value.size === 0 &&
      (activeTrayIsNode.value ||
        activeTrayIsBarrier.value ||
        activeTray.value === 'text' ||
        activeTray.value === 'bulk')
    ) {
      activeTray.value = null
    }
  })

  watch(selectedEdge, (edge) => {
    if (!edge && activeTray.value === 'connection') {
      activeTray.value = null
    }
  })

  watch(nodeTrays, (list) => {
    const tray = activeTray.value
    if (!tray || !CONDITIONAL_NODE_TRAY_IDS.includes(tray)) return
    if (!list.some((t) => t.id === tray)) activeTray.value = null
  })

  function vertexTrayFor(id: string | null): TrayId {
    if (id && isBarrierId(id)) return 'barrierCondition'
    if (id && isTextId(id)) return 'text'
    return 'requirement'
  }

  function trayForSelection(id: string): TrayId {
    const current = activeTray.value
    if (isBarrierId(id)) {
      return current && BARRIER_TRAY_IDS.includes(current) ? current : 'barrierCondition'
    }
    if (isTextId(id)) return 'text'
    if (current && NODE_TRAY_IDS.includes(current)) {
      if (current !== 'unlock') return current
      if ((difficultyById.value.get(id)?.prerequisites ?? []).length >= 2) return current
    }
    return 'requirement'
  }

  function trayForCount() {
    if (selectedIds.value.size >= 2) activeTray.value = 'bulk'
    else if (selectedIds.value.size === 1) activeTray.value = vertexTrayFor(selectedId.value)
  }

  function handleSelect(id: string) {
    if (affectedPickMode.value && selectedBarrier.value && !isBarrierId(id) && !isTextId(id)) {
      toggleAffected(id)
      return
    }
    barrierPlacementMode.value = false
    selectedEdge.value = null
    selectOnly(id)
    activeTray.value = trayForSelection(id)
  }

  function handleToggleSelect(id: string) {
    selectedEdge.value = null
    toggleInSelection(id)
    trayForCount()
  }

  function handleSelectMany(ids: string[]) {
    selectedEdge.value = null
    setSelection(ids)
    trayForCount()
  }

  function handleDeselect() {
    if (showMapPicker.value) return
    selectedEdge.value = null
    clearSelection()
  }

  function handleEmptyClick() {
    barrierPlacementMode.value = false
    selectedEdge.value = null
    clearSelection()
  }

  function handleEdgeSelect(payload: CampaignEdge) {
    if (!editable.value) return
    barrierPlacementMode.value = false
    affectedPickMode.value = false
    clearSelection()
    selectedEdge.value = payload
    activeTray.value = 'connection'
  }

  return {
    activeTray,
    campaignTrays,
    nodeTrays,
    activeTrayIsNode,
    activeTrayIsBarrier,
    toggleTray,
    closeTray,
    handleSelect,
    handleToggleSelect,
    handleSelectMany,
    handleDeselect,
    handleEmptyClick,
    handleEdgeSelect,
  }
}
