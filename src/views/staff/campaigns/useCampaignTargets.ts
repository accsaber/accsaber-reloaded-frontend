import { getCurve } from '@/api/curves'
import type { CampaignModifierInput, UpdateCampaignDifficultyRequest } from '@/types/api/admin'
import type { CampaignTargetResponse } from '@/types/api/campaigns'
import type { CurveResponse } from '@/types/api/categories'
import type {
  CampaignModifierRequirement,
  CampaignRequirementType,
  CampaignTargetMode,
} from '@/types/enums'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import {
  formatScoreCompact,
  hasValidBounds,
  METRIC_BOUNDS,
  METRIC_DEFAULT,
  METRIC_DEFAULT_MAX,
} from '@/utils/campaignLayout'
import { calculateAp, reverseApToAccuracyByComplexity } from '@/utils/curveEval'
import { formatAccuracy } from '@/utils/formatters'
import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { CampaignVertices } from './useCampaignVertices'

const MAX_TARGETS = 8

export interface CampaignTargetRow {
  key: string
  index: number
  requirementType: CampaignRequirementType
  lower: number | null
  upper: number | null
  bounds: { min: number; max: number; step: number; unit: string }
  numberBounds: { min: number; max: number }
  hasBounds: boolean
  hint: string
  equivalents: Array<{ key: string; text: string }>
  invalid: boolean
}

interface TargetDraft {
  key: string
  requirementType: CampaignRequirementType
  requirementValue: number | null
  requirementValueMax: number | null
}

type RequirementMetric =
  | 'acc'
  | 'ap'
  | 'score'
  | 'streak'
  | 'rank'
  | 'flag'
  | 'combo'
  | 'bombs'
  | 'mistakes'
  | 'pauses'

const REQUIREMENT_METRIC: Record<CampaignRequirementType, RequirementMetric> = {
  ACC: 'acc',
  AP: 'ap',
  SCORE: 'score',
  STREAK_115: 'streak',
  RANK: 'rank',
  FC: 'flag',
  PASS: 'flag',
  COMBO: 'combo',
  BOMB_HITS: 'bombs',
  MISTAKES: 'mistakes',
  PAUSES: 'pauses',
}

export const REQUIREMENT_TYPE_OPTIONS: Array<{ value: CampaignRequirementType; label: string }> = [
  { value: 'ACC', label: 'Accuracy' },
  { value: 'AP', label: 'AP' },
  { value: 'SCORE', label: 'Score' },
  { value: 'STREAK_115', label: '115 Streak' },
  { value: 'COMBO', label: 'Max combo' },
  { value: 'BOMB_HITS', label: 'Bombs hit' },
  { value: 'MISTAKES', label: 'Mistakes' },
  { value: 'PAUSES', label: 'Pauses' },
  { value: 'FC', label: 'Full Combo' },
  { value: 'PASS', label: 'Pass (no No-Fail)' },
  { value: 'RANK', label: 'Leaderboard rank' },
]

const NEXT_MODIFIER_REQUIREMENT: Record<string, CampaignModifierRequirement | null> = {
  unset: 'REQUIRED',
  REQUIRED: 'FORBIDDEN',
  FORBIDDEN: null,
}

export function toDisplayValue(metric: string, raw: number | null): number | null {
  if (raw == null) return null
  return metric === 'acc' ? Number((raw * 100).toFixed(2)) : raw
}

export function fromDisplayValue(metric: string, display: number | null): number | null {
  if (display == null) return null
  return metric === 'acc' ? display / 100 : display
}

interface TargetsContext {
  vertices: CampaignVertices
  editable: ComputedRef<boolean>
  requirementDirtyIds: Ref<Set<string>>
  applyNodePatch: (id: string, patch: UpdateCampaignDifficultyRequest) => Promise<void>
}

export function useCampaignTargets(ctx: TargetsContext) {
  const { selectedDifficulty } = ctx.vertices
  const { editable, requirementDirtyIds, applyNodePatch } = ctx
  const categoryStore = useCategoryStore()
  const modifierStore = useModifierStore()

  onMounted(() => void modifierStore.fetchModifiers())

  const formTargets = ref<TargetDraft[]>([])
  const formTargetMode = ref<CampaignTargetMode>('AND')
  let targetKeySeq = 0

  function toTargetDraft(target: CampaignTargetResponse): TargetDraft {
    return {
      key: `target-${++targetKeySeq}`,
      requirementType: target.requirementType,
      requirementValue: target.requirementValue,
      requirementValueMax: target.requirementValueMax,
    }
  }

  function syncFormFromTargets() {
    const d = selectedDifficulty.value
    if (!d) return
    formTargets.value = d.targets.map(toTargetDraft)
    formTargetMode.value = d.targetMode
  }

  watch(selectedDifficulty, syncFormFromTargets, { immediate: true })

  const scoreCap = computed(() => {
    const maxScore = selectedDifficulty.value?.maxScore
    return maxScore && maxScore > 0 ? maxScore : 1_500_000
  })

  const comboCap = computed(() => {
    const maxCombo = selectedDifficulty.value?.maxCombo
    return maxCombo && maxCombo > 0 ? maxCombo : 2000
  })

  function requirementBoundsFor(metric: RequirementMetric) {
    if (metric === 'flag') return { min: 1, max: 1, step: 1, unit: '' }
    if (metric === 'score') return { min: 0, max: scoreCap.value, step: 1000, unit: '' }
    if (metric === 'ap') return { ...METRIC_BOUNDS.ap, min: 400 }
    if (metric === 'combo') return { ...METRIC_BOUNDS.combo, max: comboCap.value }
    return METRIC_BOUNDS[metric]
  }

  function requirementNumberBoundsFor(
    metric: RequirementMetric,
    bounds: { min: number; max: number },
  ) {
    if (metric === 'ap') return { min: 0, max: Number.MAX_SAFE_INTEGER }
    if (metric === 'rank') return { min: 1, max: Number.MAX_SAFE_INTEGER }
    if (metric === 'bombs' || metric === 'mistakes' || metric === 'pauses') {
      return { min: 0, max: Number.MAX_SAFE_INTEGER }
    }
    return { min: bounds.min, max: bounds.max }
  }

  function defaultRequirementValue(metric: RequirementMetric): number {
    if (metric === 'acc') return 0.95
    if (metric === 'combo') return Math.round(comboCap.value * 0.8)
    if (metric === 'flag') return 1
    if (metric === 'score') return Math.round(scoreCap.value * 0.9)
    return METRIC_DEFAULT[metric]
  }

  const scoreCurves = ref(new Map<string, CurveResponse>())
  const pendingCurveIds = new Set<string>()

  async function ensureScoreCurve(curveId: string | undefined) {
    if (!curveId || scoreCurves.value.has(curveId) || pendingCurveIds.has(curveId)) return
    pendingCurveIds.add(curveId)
    try {
      const curve = await getCurve(curveId)
      const next = new Map(scoreCurves.value)
      next.set(curveId, curve)
      scoreCurves.value = next
    } catch {
    } finally {
      pendingCurveIds.delete(curveId)
    }
  }

  function scoreCurveIdFor(categoryId: string | null | undefined): string | undefined {
    return categoryId ? categoryStore.byId.get(categoryId)?.scoreCurve?.id : undefined
  }

  watch(
    () => selectedDifficulty.value?.categoryId,
    (categoryId) => void ensureScoreCurve(scoreCurveIdFor(categoryId)),
    { immediate: true },
  )

  function requirementEquivalentsFor(target: TargetDraft): Array<{ key: string; text: string }> {
    const type = target.requirementType
    if (type !== 'ACC' && type !== 'AP' && type !== 'SCORE') return []
    const d = selectedDifficulty.value
    if (!d) return []
    const complexity = d.complexity
    const maxScore = d.maxScore
    const curveId = scoreCurveIdFor(d.categoryId)
    const curve = curveId ? (scoreCurves.value.get(curveId) ?? null) : null
    const raw = target.requirementValue
    if (raw == null) return []

    let acc: number | null = null
    let ap: number | null = null
    let score: number | null = null

    if (type === 'ACC') {
      acc = raw
    } else if (type === 'SCORE') {
      score = raw
      if (maxScore != null && maxScore > 0) acc = raw / maxScore
    } else {
      ap = raw
      if (curve && complexity != null) acc = reverseApToAccuracyByComplexity(curve, raw, complexity)
    }

    if (acc != null && Number.isFinite(acc)) {
      if (score == null && maxScore != null && maxScore > 0) score = acc * maxScore
      if (ap == null && curve && complexity != null) ap = calculateAp(curve, acc, complexity)
    }

    const out: Array<{ key: string; text: string }> = []
    if (type !== 'ACC' && acc != null && Number.isFinite(acc)) {
      out.push({ key: 'ACC', text: formatAccuracy(acc) })
    }
    if (type !== 'AP' && ap != null && Number.isFinite(ap)) {
      out.push({ key: 'AP', text: `${Math.round(ap)} AP` })
    }
    if (type !== 'SCORE' && score != null && Number.isFinite(score)) {
      out.push({ key: 'SCORE', text: `${formatScoreCompact(score)} pts` })
    }
    return out
  }

  function newTargetDraft(type: CampaignRequirementType): TargetDraft {
    const metric = REQUIREMENT_METRIC[type]
    return {
      key: `target-${++targetKeySeq}`,
      requirementType: type,
      requirementValue: defaultRequirementValue(metric),
      requirementValueMax: METRIC_DEFAULT_MAX[metric] ?? null,
    }
  }

  function targetHasValidBounds(target: TargetDraft): boolean {
    if (REQUIREMENT_METRIC[target.requirementType] === 'flag') return true
    return hasValidBounds(target.requirementValue, target.requirementValueMax)
  }

  function commitTargets() {
    const d = selectedDifficulty.value
    if (!editable.value || !d) return
    if (!formTargets.value.every(targetHasValidBounds)) return
    requirementDirtyIds.value.add(d.id)
    void applyNodePatch(d.id, {
      targetMode: formTargetMode.value,
      targets: formTargets.value.map((t) => ({
        requirementType: t.requirementType,
        requirementValue: t.requirementValue,
        requirementValueMax: t.requirementValueMax,
      })),
    })
  }

  const canAddTarget = computed(() => editable.value && formTargets.value.length < MAX_TARGETS)

  function addTarget() {
    if (!canAddTarget.value) return
    formTargets.value = [...formTargets.value, newTargetDraft('ACC')]
    commitTargets()
  }

  function removeTarget(index: number) {
    if (!editable.value || formTargets.value.length <= 1) return
    formTargets.value = formTargets.value.filter((_, i) => i !== index)
    commitTargets()
  }

  function reorderTargets(from: number, to: number): boolean {
    if (!editable.value || from === to) return false
    if (to < 0 || to >= formTargets.value.length) return false
    const next = [...formTargets.value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    formTargets.value = next
    return true
  }

  function moveTarget(from: number, to: number) {
    if (reorderTargets(from, to)) commitTargets()
  }

  function setTargetMode(mode: CampaignTargetMode) {
    if (!editable.value || formTargetMode.value === mode) return
    formTargetMode.value = mode
    commitTargets()
  }

  function setTargetType(index: number, value: string) {
    const target = formTargets.value[index]
    const next = value as CampaignRequirementType
    if (!target || target.requirementType === next) return
    const metric = REQUIREMENT_METRIC[next]
    target.requirementType = next
    target.requirementValue = defaultRequirementValue(metric)
    target.requirementValueMax = METRIC_DEFAULT_MAX[metric] ?? null
    commitTargets()
  }

  function setTargetBound(
    index: number,
    field: 'requirementValue' | 'requirementValueMax',
    display: number | null,
  ) {
    const target = formTargets.value[index]
    if (!target) return
    target[field] = fromDisplayValue(REQUIREMENT_METRIC[target.requirementType], display)
  }

  function requirementTypeHint(type: CampaignRequirementType): string {
    switch (type) {
      case 'RANK':
        return 'Lower is better.'
      case 'PASS':
        return 'Any pass without No-Fail.'
      case 'COMBO':
        return `Note count. This map has ${comboCap.value}.`
      case 'MISTAKES':
        return 'Bad cuts plus misses.'
      default:
        return ''
    }
  }

  const targetRows = computed<CampaignTargetRow[]>(() =>
    formTargets.value.map((t, index) => {
      const metric = REQUIREMENT_METRIC[t.requirementType]
      const bounds = requirementBoundsFor(metric)
      return {
        key: t.key,
        index,
        requirementType: t.requirementType,
        lower: toDisplayValue(metric, t.requirementValue),
        upper: toDisplayValue(metric, t.requirementValueMax),
        bounds,
        numberBounds: requirementNumberBoundsFor(metric, bounds),
        hasBounds: metric !== 'flag',
        hint: requirementTypeHint(t.requirementType),
        equivalents: requirementEquivalentsFor(t),
        invalid: !targetHasValidBounds(t),
      }
    }),
  )

  const modifierOptions = computed(() =>
    [...modifierStore.modifiers].sort((a, b) => a.name.localeCompare(b.name)),
  )

  const nodeModifierById = computed(() => {
    const map = new Map<string, CampaignModifierRequirement>()
    for (const m of selectedDifficulty.value?.modifiers ?? []) map.set(m.modifier.id, m.requirement)
    return map
  })

  function cycleNodeModifier(modifierId: string) {
    const d = selectedDifficulty.value
    if (!editable.value || !d) return
    const next = NEXT_MODIFIER_REQUIREMENT[nodeModifierById.value.get(modifierId) ?? 'unset']
    const modifiers: CampaignModifierInput[] = d.modifiers
      .filter((m) => m.modifier.id !== modifierId)
      .map((m) => ({ modifierId: m.modifier.id, requirement: m.requirement }))
    if (next) modifiers.push({ modifierId, requirement: next })
    requirementDirtyIds.value.add(d.id)
    void applyNodePatch(d.id, { modifiers })
  }

  return {
    targetRows,
    formTargetMode,
    canAddTarget,
    addTarget,
    removeTarget,
    moveTarget,
    reorderTargets,
    setTargetMode,
    setTargetType,
    setTargetBound,
    commitTargets,
    modifierOptions,
    nodeModifierById,
    cycleNodeModifier,
  }
}
