import {
  addPlayerCampaignBarrier,
  deletePlayerCampaignBarrier,
  updatePlayerCampaignBarrier,
  updatePlayerCampaignDifficulty,
} from '@/api/campaigns'
import { parseApiError } from '@/api/client'
import type { AddCampaignBarrierRequest, UpdateCampaignBarrierRequest } from '@/types/api/admin'
import type { BarrierConditionType, CampaignBoundClear } from '@/types/enums'
import {
  barrierConditionMeta,
  hasValidBounds,
  METRIC_BOUNDS,
  METRIC_DEFAULT,
  METRIC_DEFAULT_MAX,
  toPrerequisiteInputs,
} from '@/utils/campaignLayout'
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { CampaignConnections, CampaignEdge } from './useCampaignConnections'
import { CLEARABLE_TEXT_FIELDS, fieldPatch, type CampaignDocument } from './useCampaignDocument'
import type { CampaignSelection } from './useCampaignSelection'
import { fromDisplayValue, toDisplayValue } from './useCampaignTargets'
import type { TrayId } from './useCampaignTrays'
import type { CampaignVertices } from './useCampaignVertices'

const MAX_BARRIERS = 100

export const BARRIER_CONDITION_OPTIONS: Array<{ value: BarrierConditionType; label: string }> = [
  { value: 'AVERAGE_ACC', label: 'Average accuracy' },
  { value: 'ACC_MAX', label: 'Best accuracy' },
  { value: 'AVERAGE_AP', label: 'Average AP' },
  { value: 'AP_MAX', label: 'Best AP' },
  { value: 'STREAK_115_AVERAGE', label: 'Average 115 streak' },
  { value: 'STREAK_115_MAX', label: 'Best 115 streak' },
  { value: 'AVERAGE_COMBO', label: 'Average combo' },
  { value: 'AVERAGE_BOMB_HITS', label: 'Average bombs hit' },
  { value: 'AVERAGE_MISTAKES', label: 'Average mistakes' },
  { value: 'AVERAGE_PAUSES', label: 'Average pauses' },
  { value: 'AVERAGE_RANK', label: 'Average rank' },
  { value: 'MAX_RANK', label: 'Best rank' },
  { value: 'FC', label: 'Full combo (all)' },
  { value: 'PASS', label: 'Pass all (no No-Fail)' },
  { value: 'COMPLETION_COUNT', label: 'Maps completed' },
]

interface BoundsDiff {
  value?: number
  valueMax?: number
  clear?: CampaignBoundClear[]
}

function diffBounds(
  nextValue: number | null,
  nextMax: number | null,
  currentValue: number | null,
  currentMax: number | null,
): BoundsDiff | null {
  const diff: BoundsDiff = {}
  const clear: CampaignBoundClear[] = []
  if (nextValue == null) {
    if (currentValue != null) clear.push('VALUE')
  } else if (nextValue !== currentValue) {
    diff.value = nextValue
  }
  if (nextMax == null) {
    if (currentMax != null) clear.push('VALUE_MAX')
  } else if (nextMax !== currentMax) {
    diff.valueMax = nextMax
  }
  if (clear.length > 0) diff.clear = clear
  return Object.keys(diff).length > 0 ? diff : null
}

interface BarriersContext {
  doc: CampaignDocument
  selection: CampaignSelection
  vertices: CampaignVertices
  connections: CampaignConnections
  editable: ComputedRef<boolean>
  activeTray: Ref<TrayId | null>
}

export function useCampaignBarriers(ctx: BarriersContext) {
  const { campaign, actionPending, actionError, requirementDirtyIds, replaceRow } = ctx.doc
  const { ensureCampaign, load } = ctx.doc
  const { selectedId, selectOnly, clearSelection } = ctx.selection
  const { selectedBarrier, vertexPosition, isBarrierId, findFreeCellNear } = ctx.vertices
  const { vertexPrereqs, hasConnections } = ctx.connections
  const { editable, activeTray } = ctx

  const formBarrier = ref<{
    conditionType: BarrierConditionType
    conditionValue: number | null
    conditionValueMax: number | null
    description: string
    checkpointLabel: string
    checkpointLabelPosition: string
    borderColor: string
    size: number | null
    xp: number
  }>({
    conditionType: 'AVERAGE_ACC',
    conditionValue: 0.9,
    conditionValueMax: null,
    description: '',
    checkpointLabel: '',
    checkpointLabelPosition: '',
    borderColor: '',
    size: null,
    xp: 0,
  })

  function syncFormFromBarrier() {
    const b = selectedBarrier.value
    if (!b) return
    formBarrier.value = {
      conditionType: b.conditionType,
      conditionValue: b.conditionValue,
      conditionValueMax: b.conditionValueMax,
      description: b.description ?? '',
      checkpointLabel: b.checkpointLabel ?? '',
      checkpointLabelPosition: b.checkpointLabelPosition ?? '',
      borderColor: b.borderColor ?? '',
      size: b.size,
      xp: b.xp ?? 0,
    }
  }

  watch(selectedBarrier, syncFormFromBarrier, { immediate: true })

  const affectedPickMode = ref(false)
  const barrierPlacementMode = ref(false)

  watch(selectedId, () => {
    affectedPickMode.value = false
  })

  const hasBarriers = computed(() => (campaign.value?.barriers.length ?? 0) > 0)

  const canAddBarrier = computed(
    () => editable.value && hasConnections.value && !campaign.value?.progressionAgnostic,
  )

  const pickModeBarrierId = computed(() =>
    affectedPickMode.value && selectedBarrier.value ? selectedBarrier.value.id : null,
  )

  async function applyBarrierPatch(id: string, patch: UpdateCampaignBarrierRequest) {
    try {
      actionError.value = null
      const updated = await updatePlayerCampaignBarrier(id, patch)
      replaceRow('barriers', id, () => updated)
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to update barrier').message
    }
  }

  function commitBarrierField(field: keyof UpdateCampaignBarrierRequest) {
    const b = selectedBarrier.value
    if (!editable.value || !b) return
    const patch = fieldPatch(formBarrier.value, b, field, CLEARABLE_TEXT_FIELDS)
    if (!patch) return
    if (field === 'conditionType') requirementDirtyIds.value.add(b.id)
    void applyBarrierPatch(b.id, patch as UpdateCampaignBarrierRequest)
  }

  const barrierMeta = computed(() => barrierConditionMeta(formBarrier.value.conditionType))

  function commitBarrierBounds() {
    const b = selectedBarrier.value
    if (!editable.value || !b) return
    if (
      !barrierMeta.value.noValue &&
      !hasValidBounds(formBarrier.value.conditionValue, formBarrier.value.conditionValueMax)
    ) {
      return
    }
    const diff = diffBounds(
      formBarrier.value.conditionValue,
      formBarrier.value.conditionValueMax,
      b.conditionValue,
      b.conditionValueMax,
    )
    if (!diff) return
    requirementDirtyIds.value.add(b.id)
    void applyBarrierPatch(b.id, {
      conditionValue: diff.value,
      conditionValueMax: diff.valueMax,
      clear: diff.clear,
    })
  }

  function resetBarrierColor() {
    formBarrier.value.borderColor = ''
    commitBarrierField('borderColor')
  }

  function selectBarrierLabelPosition(value: string) {
    formBarrier.value.checkpointLabelPosition = value
    commitBarrierField('checkpointLabelPosition')
  }

  const barrierAffectedCount = computed(
    () => selectedBarrier.value?.affectedCampaignDifficultyIds.length ?? 0,
  )

  const barrierCountMax = computed(() => Math.max(1, barrierAffectedCount.value))

  const barrierLowerDisplay = computed(() =>
    toDisplayValue(barrierMeta.value.metric, formBarrier.value.conditionValue),
  )

  const barrierUpperDisplay = computed(() =>
    toDisplayValue(barrierMeta.value.metric, formBarrier.value.conditionValueMax),
  )

  function setBarrierBound(field: 'conditionValue' | 'conditionValueMax', display: number | null) {
    formBarrier.value[field] = fromDisplayValue(barrierMeta.value.metric, display)
  }

  const barrierValueBounds = computed(() => {
    const metric = barrierMeta.value.metric
    if (metric === 'count') return { min: 1, max: barrierCountMax.value, step: 1, unit: 'maps' }
    return METRIC_BOUNDS[metric] ?? { min: 0, max: 1, step: 1, unit: '' }
  })

  function defaultBarrierValue(metric: string): number {
    if (metric === 'acc') return 0.9
    if (metric === 'count') return barrierCountMax.value
    if (metric === 'combo') return 500
    return METRIC_DEFAULT[metric] ?? 0
  }

  function onBarrierConditionTypeChange(value: string) {
    const next = value as BarrierConditionType
    const prevMetric = barrierMeta.value.metric
    formBarrier.value.conditionType = next
    const nextMeta = barrierConditionMeta(next)
    const b = selectedBarrier.value
    if (nextMeta.noValue) {
      formBarrier.value.conditionValue = null
      if (editable.value && b) {
        requirementDirtyIds.value.add(b.id)
        void applyBarrierPatch(b.id, { conditionType: next, conditionValue: null })
        return
      }
    } else if (prevMetric !== nextMeta.metric) {
      const nextValue = defaultBarrierValue(nextMeta.metric)
      const nextMax = METRIC_DEFAULT_MAX[nextMeta.metric] ?? null
      formBarrier.value.conditionValue = nextValue
      formBarrier.value.conditionValueMax = nextMax
      if (editable.value && b) {
        requirementDirtyIds.value.add(b.id)
        void applyBarrierPatch(b.id, {
          conditionType: next,
          conditionValue: nextValue,
          conditionValueMax: nextMax ?? undefined,
          clear: nextMax == null && b.conditionValueMax != null ? ['VALUE_MAX'] : undefined,
        })
        return
      }
    }
    commitBarrierField('conditionType')
  }

  function toggleAffectedPickMode() {
    if (!selectedBarrier.value) return
    affectedPickMode.value = !affectedPickMode.value
  }

  function toggleAffected(nodeId: string) {
    const b = selectedBarrier.value
    if (!editable.value || !b) return
    const current = new Set(b.affectedCampaignDifficultyIds ?? [])
    if (current.has(nodeId)) current.delete(nodeId)
    else current.add(nodeId)
    const next = Array.from(current)
    const patch: UpdateCampaignBarrierRequest = { affectedCampaignDifficultyIds: next }
    if (
      b.conditionType === 'COMPLETION_COUNT' &&
      next.length > 0 &&
      (b.conditionValue ?? 1) > next.length
    ) {
      patch.conditionValue = next.length
      formBarrier.value.conditionValue = next.length
      requirementDirtyIds.value.add(b.id)
    }
    replaceRow('barriers', b.id, (row) => ({
      ...row,
      affectedCampaignDifficultyIds: next,
      conditionValue: patch.conditionValue ?? row.conditionValue,
    }))
    void applyBarrierPatch(b.id, patch)
  }

  function setBarrierPrereqMode(mode: 'AND' | 'OR') {
    const b = selectedBarrier.value
    if (!editable.value || !b) return
    if (b.prerequisiteMode === mode) return
    void applyBarrierPatch(b.id, { prerequisiteMode: mode })
  }

  async function removeSelectedBarrier() {
    const b = selectedBarrier.value
    if (!editable.value || !b || !campaign.value) return
    if (!window.confirm('Remove this barrier from the roadmap?')) return
    actionPending.value = true
    actionError.value = null
    try {
      await deletePlayerCampaignBarrier(campaign.value.id, b.id)
      clearSelection()
      await load(true)
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to remove barrier').message
    } finally {
      actionPending.value = false
    }
  }

  function toggleBarrierPlacement() {
    if (!canAddBarrier.value) return
    affectedPickMode.value = false
    barrierPlacementMode.value = !barrierPlacementMode.value
  }

  async function placeBarrierOnEdge(payload: CampaignEdge) {
    if (!editable.value || campaign.value?.progressionAgnostic) return
    let c = campaign.value
    if (!c || c.id === '') {
      c = await ensureCampaign()
      if (!c) return
    }
    if ((c.barriers?.length ?? 0) >= MAX_BARRIERS) {
      actionError.value = `Campaigns can have at most ${MAX_BARRIERS} barriers.`
      return
    }
    const fromPos = vertexPosition(payload.fromId)
    const toPos = vertexPosition(payload.toId)
    if (!fromPos || !toPos) return
    const targetPrereqs = vertexPrereqs(payload.toId)
    if (targetPrereqs == null) return
    const replacedEdge = targetPrereqs.find(
      (p) => p.comesFromCampaignDifficultyId === payload.fromId,
    )
    const edgeColor = replacedEdge?.color ?? null
    const cell = findFreeCellNear(
      Math.round((fromPos.x + toPos.x) / 2),
      Math.round((fromPos.y + toPos.y) / 2),
    )
    actionPending.value = true
    actionError.value = null
    try {
      const req: AddCampaignBarrierRequest = {
        conditionType: 'AVERAGE_ACC',
        conditionValue: 0.9,
        positionX: cell.x,
        positionY: cell.y,
        prerequisites: [
          {
            comesFromCampaignDifficultyId: payload.fromId,
            ...(edgeColor ? { color: edgeColor } : {}),
          },
        ],
        affectedCampaignDifficultyIds: [payload.fromId],
      }
      const created = await addPlayerCampaignBarrier(c.id, req)
      const nextPrereqs = targetPrereqs
        .filter((p) => p.comesFromCampaignDifficultyId !== payload.fromId)
        .concat({ comesFromCampaignDifficultyId: created.id, color: edgeColor })
      const rewire = { prerequisites: toPrerequisiteInputs(nextPrereqs) }
      if (isBarrierId(payload.toId)) {
        await updatePlayerCampaignBarrier(payload.toId, rewire)
      } else {
        await updatePlayerCampaignDifficulty(payload.toId, rewire)
      }
      barrierPlacementMode.value = false
      await load(true)
      selectOnly(created.id)
      activeTray.value = 'barrierCondition'
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to add barrier').message
    } finally {
      actionPending.value = false
    }
  }

  return {
    formBarrier,
    barrierMeta,
    barrierLowerDisplay,
    barrierUpperDisplay,
    barrierValueBounds,
    setBarrierBound,
    commitBarrierBounds,
    commitBarrierField,
    onBarrierConditionTypeChange,
    resetBarrierColor,
    selectBarrierLabelPosition,
    hasBarriers,
    canAddBarrier,
    affectedPickMode,
    toggleAffectedPickMode,
    toggleAffected,
    pickModeBarrierId,
    setBarrierPrereqMode,
    removeSelectedBarrier,
    barrierPlacementMode,
    toggleBarrierPlacement,
    placeBarrierOnEdge,
  }
}

export type CampaignBarriers = ReturnType<typeof useCampaignBarriers>
