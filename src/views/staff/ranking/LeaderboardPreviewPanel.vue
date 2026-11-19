<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import DataTable from '@/components/common/DataTable.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useCategoryStore } from '@/stores/categories'
import type { CurveResponse } from '@/types/api/categories'
import type { LeaderboardPreviewResponse } from '@/types/api/maps'
import type { TableColumn, UserRefDisplay } from '@/types/display'
import { calculateAp } from '@/utils/curveEval'
import { formatAccuracy, formatCount, formatFixed } from '@/utils/formatters'
import { getRankClass } from '@/utils/ranking'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  mapDifficultyId: string
  scriptComplexity?: number | null
  scriptVersion?: string | null
}>()

const PREVIEW_LIMIT = 100
const LOADING_ROWS = 20
const SLIDER_SPAN = 7
const PLATFORM_NAME: Record<string, string> = {
  beatleader: 'BL',
  scoresaber: 'SS',
}

const categoryStore = useCategoryStore()

const preview = ref<LeaderboardPreviewResponse | null>(null)
const loading = ref(true)
const error = ref('')
const curve = ref<CurveResponse | null>(null)
const complexity = ref(0)

const base = computed(() => preview.value?.complexity ?? props.scriptComplexity ?? 0)
const atBase = computed(() => Math.abs(complexity.value - base.value) < 0.005)
const sliderMin = computed(() => Math.max(0, base.value - SLIDER_SPAN))
const sliderMax = computed(() => base.value + SLIDER_SPAN)

function setComplexity(value: string | number) {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) complexity.value = parsed
}

const columns: TableColumn[] = [
  { key: 'rank', label: '#', align: 'right', width: '64px' },
  { key: 'player', label: 'Player', flex: true, primary: true },
  { key: 'accuracy', label: 'Accuracy', align: 'right', width: '112px', mono: true, format: (v) => formatAccuracy(v as number) },
  { key: 'ap', label: 'AP', align: 'right', width: '96px', mono: true, format: (v) => formatFixed(v as number, 1) },
  { key: 'platform', label: 'From', width: '72px' },
  { key: 'modifiers', label: 'Modifiers', width: '130px', format: (v) => (v as string) || '-' },
]

const rows = computed(() =>
  (preview.value?.rows ?? []).map((row) => ({
    key: `${row.platform}-${row.player.id}`,
    rank: row.rank,
    player: row.player,
    accuracy: row.accuracy,
    ap: atBase.value || !curve.value ? row.ap : calculateAp(curve.value, row.accuracy, complexity.value),
    platform: PLATFORM_NAME[row.platform.toLowerCase()] ?? row.platform,
    modifiers: row.modifiers,
  })),
)

const note = computed(() => {
  if (error.value) return error.value
  if (!preview.value) return ''
  if (!atBase.value) return curve.value ? `Showing AP at ${formatFixed(complexity.value, 2)}` : 'No curve loaded for this category'
  if (!preview.value.complexitySource) return 'No complexity yet, every play reads 0 AP'
  return `${formatCount(preview.value.fetched)} players, best play each`
})

async function loadCurve(code: string): Promise<CurveResponse | null> {
  const id = categoryStore.byCode.get(code)?.scoreCurve?.id
  if (!id) return null
  try {
    const { getCurve } = await import('@/api/curves')
    return await getCurve(id)
  } catch {
    return null
  }
}

async function load() {
  const id = props.mapDifficultyId
  loading.value = true
  error.value = ''
  try {
    const { getLeaderboardPreview } = await import('@/api/ranking/maps')
    const result = await getLeaderboardPreview(id, PREVIEW_LIMIT)
    const loadedCurve = await loadCurve(result.categoryCode)
    if (id !== props.mapDifficultyId) return
    preview.value = result
    curve.value = loadedCurve
    complexity.value = result.complexity ?? 0
  } catch (err) {
    if (id !== props.mapDifficultyId) return
    preview.value = null
    error.value = parseApiError(err, 'Could not read the platform boards').message
  } finally {
    if (id === props.mapDifficultyId) loading.value = false
  }
}

watch(() => props.mapDifficultyId, load, { immediate: true })
</script>

<template>
  <div class="surface-card lb-preview">
    <div class="lb-preview__controls">
      <BaseInput class="lb-preview__value" label="Complexity" type="number" step="0.1" min="0"
        :model-value="complexity" @update:model-value="setComplexity" />
      <input class="slider lb-preview__slider" type="range" :min="sliderMin" :max="sliderMax" step="0.1"
        :value="complexity" aria-label="Complexity"
        @input="setComplexity(($event.target as HTMLInputElement).value)" />
      <BaseButton :disabled="atBase" @click="complexity = base">Reset</BaseButton>
      <BaseButton v-if="scriptComplexity != null" :disabled="complexity === scriptComplexity"
        :title="scriptVersion ?? undefined" @click="complexity = scriptComplexity">
        Script {{ formatFixed(scriptComplexity, 1) }}
      </BaseButton>
    </div>

    <p class="caption lb-preview__note" :class="{ 'lb-preview__note--error': error }" :role="error ? 'alert' : 'status'">
      {{ note }}
    </p>

    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :loading-rows="LOADING_ROWS"
      row-key="key"
      empty-message="No plays on either platform yet"
    >
      <template #cell-rank="{ value }">
        <span class="rank" :class="getRankClass(value as number)">#{{ value }}</span>
      </template>
      <template #cell-player="{ row }">
        <UserChip :user="(row.player as UserRefDisplay)" size="sm" />
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.lb-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.lb-preview__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-md);
}

.lb-preview__value {
  max-width: 140px;
}

.lb-preview__slider {
  flex: 1;
  min-width: 200px;
  margin-bottom: calc((var(--control-h) - 4px) / 2);
}

.lb-preview__note {
  min-height: 1lh;
}

.lb-preview__note--error {
  color: var(--error);
}
</style>
