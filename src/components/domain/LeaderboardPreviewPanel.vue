<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { CurveResponse } from '@/types/api/categories'
import type { TableColumn } from '@/types/display'
import type { BeatLeaderScore } from '@/utils/beatsaver'
import { calculateAp } from '@/utils/curveEval'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  blLeaderboardId: string | null
  originalComplexity: number | null
  maxScore: number
  categoryCode: string
}>()

const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()

const scores = ref<BeatLeaderScore[]>([])
const blMaxScore = ref(0)
const curve = ref<CurveResponse | null>(null)
const loading = ref(false)
const error = ref('')

const base = computed(() => props.originalComplexity ?? 0)
const previewComplexity = ref(base.value)
const sliderMin = computed(() => Math.max(0, base.value - 7))
const sliderMax = computed(() => base.value + 7)
const effectiveMaxScore = computed(() => (props.maxScore > 0 ? props.maxScore : blMaxScore.value))

const modifierMultiplierByCode = computed(() => {
  const map = new Map<string, number>()
  for (const m of modifierStore.modifiers) map.set(m.code.toUpperCase(), m.multiplier)
  return map
})

function modifierMultiplier(modifiers: string): number {
  if (!modifiers) return 1
  let mult = 1
  for (const code of modifiers.split(/[,\s+]+/).filter(Boolean)) {
    const m = modifierMultiplierByCode.value.get(code.toUpperCase())
    if (m != null) mult *= m
  }
  return mult
}

function setPreviewComplexity(v: string | number) {
  const n = Number(v)
  previewComplexity.value = Number.isFinite(n) ? n : 0
}

const columns: TableColumn[] = [
  { key: 'rank', label: '#', align: 'right', mono: true, width: '56px' },
  { key: 'player', label: 'Player' },
  { key: 'score', label: 'Score', align: 'right', mono: true },
  { key: 'accuracy', label: 'Accuracy', align: 'right', mono: true },
  { key: 'ap', label: 'AP (preview)', align: 'right', mono: true },
]

const rows = computed(() => {
  const c = curve.value
  const complexity = previewComplexity.value
  const max = effectiveMaxScore.value
  if (!c || max <= 0) return []
  return [...scores.value]
    .sort((a, b) => b.modifiedScore - a.modifiedScore)
    .map((s, i) => {
      const accuracy = (s.baseScore * modifierMultiplier(s.modifiers)) / max
      return {
        key: s.id,
        rank: i + 1,
        player: s.player,
        score: s.modifiedScore,
        accuracy,
        ap: calculateAp(c, accuracy, complexity),
      }
    })
})

async function loadScores() {
  if (!props.blLeaderboardId) {
    scores.value = []
    blMaxScore.value = 0
    return
  }
  loading.value = true
  error.value = ''
  try {
    const { fetchBeatLeaderScores } = await import('@/utils/beatsaver')
    const payload = await fetchBeatLeaderScores(props.blLeaderboardId, 100)
    scores.value = payload.scores
    blMaxScore.value = payload.maxScore
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load BeatLeader scores'
    scores.value = []
    blMaxScore.value = 0
  } finally {
    loading.value = false
  }
}

async function loadCurve() {
  const id = categoryStore.byCode.get(props.categoryCode)?.scoreCurve?.id
  if (!id) {
    curve.value = null
    return
  }
  try {
    const { getCurve } = await import('@/api/curves')
    curve.value = await getCurve(id)
  } catch {
    curve.value = null
  }
}

watch(() => props.blLeaderboardId, loadScores, { immediate: true })
watch(() => props.categoryCode, loadCurve, { immediate: true })
watch(() => props.originalComplexity, (v) => { previewComplexity.value = v ?? 0 })
</script>

<template>
  <div class="lb-preview">
    <div class="lb-preview__controls">
      <label class="lb-preview__label">Preview Complexity</label>
      <div class="lb-preview__inputs">
        <BaseInput :model-value="previewComplexity" type="number" step="0.1" min="0"
          @update:model-value="setPreviewComplexity" />
        <input type="range" class="lb-preview__slider" :min="sliderMin" :max="sliderMax" step="0.1"
          :value="previewComplexity" @input="setPreviewComplexity(($event.target as HTMLInputElement).value)" />
        <BaseButton size="sm" @click="previewComplexity = base">Reset</BaseButton>
      </div>
      <p class="lb-preview__hint">
        Original: <span class="lb-preview__mono">{{ base.toFixed(2) }}</span>
        <span v-if="previewComplexity !== base"> · Delta:
          <span class="lb-preview__mono"
            :class="previewComplexity > base ? 'lb-preview__delta--up' : 'lb-preview__delta--down'">
            {{ (previewComplexity - base >= 0 ? '+' : '') + (previewComplexity - base).toFixed(2) }}
          </span>
        </span>
      </p>
    </div>

    <EmptyState v-if="!blLeaderboardId" message="No BeatLeader leaderboard linked to this difficulty." />
    <EmptyState v-else-if="error && !loading" :message="error" />
    <DataTable v-else :columns="columns" :rows="rows" :loading="loading" row-key="key"
      empty-message="No scores found on BeatLeader.">
      <template #cell-player="{ row }">
        <div class="lb-preview__player">
          <img :src="(row.player as BeatLeaderScore['player']).avatar" alt="" class="lb-preview__avatar"
            loading="lazy" />
          <span class="lb-preview__player-name">{{ (row.player as BeatLeaderScore['player']).name }}</span>
          <CountryFlag :country="(row.player as BeatLeaderScore['player']).country" />
        </div>
      </template>
      <template #cell-score="{ value }">{{ (value as number).toLocaleString('en-US') }}</template>
      <template #cell-accuracy="{ value }">{{ ((value as number) * 100).toFixed(2) }}%</template>
      <template #cell-ap="{ value }">{{ (value as number).toFixed(2) }}</template>
    </DataTable>
  </div>
</template>

<style scoped>
.lb-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.lb-preview__controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.lb-preview__label {
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.lb-preview__inputs {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.lb-preview__inputs :deep(.base-input) {
  width: 120px;
  flex-shrink: 0;
}

.lb-preview__slider {
  flex: 1;
  min-width: 0;
  height: 4px;
  appearance: none;
  -webkit-appearance: none;
  background: var(--bg-overlay);
  border-radius: 2px;
  cursor: pointer;
}

.lb-preview__slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--page-accent, var(--accent));
  border: 2px solid var(--bg-base);
  cursor: pointer;
  transition: transform 120ms ease;
}

.lb-preview__slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.lb-preview__slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--page-accent, var(--accent));
  border: 2px solid var(--bg-base);
  cursor: pointer;
}

.lb-preview__hint {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.lb-preview__mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.lb-preview__delta--up {
  color: var(--success);
}

.lb-preview__delta--down {
  color: var(--error);
}

.lb-preview__player {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.lb-preview__avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  flex-shrink: 0;
}

.lb-preview__player-name {
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
