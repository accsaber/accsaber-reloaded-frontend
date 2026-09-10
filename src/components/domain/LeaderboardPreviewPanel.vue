<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import { parseApiError } from '@/api/client'
import { useCategoryStore } from '@/stores/categories'
import type { CurveResponse } from '@/types/api/categories'
import type { LeaderboardPreviewResponse } from '@/types/api/maps'
import type { TableColumn } from '@/types/display'
import { calculateAp } from '@/utils/curveEval'
import { formatAccuracy, formatCount, formatFixed } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  mapDifficultyId: string
  scriptComplexity?: number | null
  scriptVersion?: string | null
}>()

const PREVIEW_LIMIT = 100
const SLIDER_SPAN = 7

const categoryStore = useCategoryStore()

const preview = ref<LeaderboardPreviewResponse | null>(null)
const loading = ref(false)
const error = ref('')
const curve = ref<CurveResponse | null>(null)

const priced = computed(() => preview.value?.complexity ?? null)

const base = computed(() => priced.value ?? props.scriptComplexity ?? 0)

const complexity = ref(0)

const atBase = computed(() => Math.abs(complexity.value - base.value) < 0.005)

const sliderMin = computed(() => Math.max(0, base.value - SLIDER_SPAN))
const sliderMax = computed(() => base.value + SLIDER_SPAN)

function setComplexity(value: string | number) {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) complexity.value = parsed
}

const columns: TableColumn[] = [
  { key: 'rank', label: '#', align: 'right', mono: true, width: '64px' },
  { key: 'player', label: 'Player', width: '220px', flex: true },
  { key: 'accuracy', label: 'Accuracy', align: 'right', width: '104px' },
  { key: 'ap', label: 'AP', align: 'right', width: '96px' },
  { key: 'platform', label: 'From', align: 'center', width: '84px' },
  { key: 'modifiers', label: 'Modifiers', width: '120px' },
]

const rows = computed(() =>
  (preview.value?.rows ?? []).map((row) => ({
    key: `${row.platform}-${row.userId}`,
    rank: row.rank,
    userId: row.userId,
    name: row.name,
    country: row.country,
    avatarUrl: pickAvatarUrl(row),
    avatarFallbackUrl: pickAvatarFallback(row),
    accuracy: row.accuracy,
    ap: atBase.value || !curve.value
      ? row.ap
      : calculateAp(curve.value, row.accuracy, complexity.value),
    platform: row.platform,
    modifiers: row.modifiers,
  })),
)

const sliderNote = computed(() => {
  if (atBase.value) return ''
  if (!curve.value) return 'This category has no curve loaded, so AP cannot be repriced here.'
  return `Showing AP at ${formatFixed(complexity.value, 2)}, not what the map pays today.`
})

async function loadCurve(code: string) {
  const id = categoryStore.byCode.get(code)?.scoreCurve?.id
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

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { getLeaderboardPreview } = await import('@/api/ranking/maps')
    const result = await getLeaderboardPreview(props.mapDifficultyId, PREVIEW_LIMIT)
    preview.value = result
    complexity.value = result.complexity ?? 0
    await loadCurve(result.categoryCode)
  } catch (err) {
    preview.value = null
    error.value = parseApiError(err, 'Could not read the platform boards.').message
  }
  loading.value = false
}

watch(() => props.mapDifficultyId, load, { immediate: true })
</script>

<template>
  <div class="lb-preview">
    <header class="lb-preview__head">
      <div class="lb-preview__summary">
        <p v-if="loading" class="lb-preview__meta">Reading BeatLeader and ScoreSaber.</p>
        <p v-else-if="preview && !preview.complexitySource" class="lb-preview__line--warn">
          This map has no complexity yet, so every play reads 0 AP.
        </p>
        <p v-if="preview" class="lb-preview__meta">
          {{ formatCount(preview.fetched) }} players read, best play each, BeatLeader first.
        </p>
      </div>

      <div v-if="scriptComplexity != null" class="lb-preview__estimate">
        <BaseButton size="sm" :disabled="complexity === scriptComplexity"
          @click="complexity = scriptComplexity">
          Use the script number
        </BaseButton>
        <span class="lb-preview__estimate-value" :title="scriptVersion ?? undefined">
          {{ formatFixed(scriptComplexity, 1) }}
          <span class="lb-preview__estimate-version">{{ scriptVersion }}</span>
        </span>
      </div>
    </header>

    <div class="lb-preview__controls">
      <BaseInput class="lb-preview__value" label="Complexity" type="number" step="0.1" min="0"
        :model-value="complexity" @update:model-value="setComplexity" />
      <input class="lb-preview__slider" type="range" :min="sliderMin" :max="sliderMax" step="0.1"
        :value="complexity" aria-label="Complexity"
        @input="setComplexity(($event.target as HTMLInputElement).value)" />
      <BaseButton size="sm" :disabled="atBase" @click="complexity = base">Reset</BaseButton>
    </div>

    <p v-if="sliderNote" class="lb-preview__meta">{{ sliderNote }}</p>
    <p v-if="error" class="lb-preview__error">{{ error }}</p>

    <DataTable
      dense
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :loading-rows="8"
      row-key="key"
      empty-message="No plays on either platform yet"
    >
      <template #cell-rank="{ row }">
        <span class="lb-preview__rank">#{{ row.rank }}</span>
      </template>

      <template #cell-player="{ row }">
        <div class="lb-preview__player">
          <GlowImage :src="row.avatarUrl as string" :alt="(row.name as string)" :size="28"
            :fallback-src="(row.avatarFallbackUrl as string | null)" />
          <span class="lb-preview__name">{{ row.name }}</span>
          <CountryFlag v-if="row.country" :country="(row.country as string)" />
        </div>
      </template>

      <template #cell-accuracy="{ row }">
        <span class="lb-preview__mono">{{ formatAccuracy(row.accuracy as number) }}</span>
      </template>

      <template #cell-ap="{ row }">
        <span class="lb-preview__ap">{{ formatFixed(row.ap as number, 1) }}</span>
      </template>

      <template #cell-platform="{ row }">
        <span class="lb-preview__platform">{{ row.platform }}</span>
      </template>

      <template #cell-modifiers="{ row }">
        <span v-if="row.modifiers" class="lb-preview__mods">{{ row.modifiers }}</span>
        <span v-else class="lb-preview__mono">–</span>
      </template>

      <template #empty>
        <EmptyState message="No plays on either platform yet." />
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.lb-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.lb-preview__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.lb-preview__summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.lb-preview__line--warn {
  margin: 0;
  color: var(--warning);
  font-size: var(--text-body);
}

.lb-preview__meta {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-caption);
}

.lb-preview__estimate {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.lb-preview__estimate-value {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-xs);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-body);
}

.lb-preview__estimate-version {
  color: var(--text-tertiary);
  font-family: var(--font-code);
  font-size: var(--text-caption);
}

.lb-preview__controls {
  display: flex;
  align-items: flex-end;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.lb-preview__value {
  max-width: 140px;
}

.lb-preview__slider {
  flex: 1;
  min-width: 200px;
  height: 18px;
  accent-color: var(--page-accent, var(--accent));
  cursor: pointer;
}

.lb-preview__error {
  margin: 0;
  color: var(--error);
  font-size: var(--text-caption);
}

.lb-preview__player {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.lb-preview__name {
  color: var(--text-primary);
  font-size: var(--text-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lb-preview__rank,
.lb-preview__mono {
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.lb-preview__ap {
  font-family: var(--font-mono);
  color: var(--text-primary);
  font-weight: 600;
}

.lb-preview__platform,
.lb-preview__mods {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
