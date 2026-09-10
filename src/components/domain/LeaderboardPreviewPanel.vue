<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import { parseApiError } from '@/api/client'
import type { LeaderboardPreviewResponse } from '@/types/api/maps'
import type { TableColumn } from '@/types/display'
import type { Difficulty } from '@/types/enums'
import { formatAccuracy, formatCount, formatFixed } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  mapDifficultyId: string
  songHash?: string | null
  difficulty?: Difficulty | null
  characteristic?: string | null
}>()

const PREVIEW_LIMIT = 100

const preview = ref<LeaderboardPreviewResponse | null>(null)
const loading = ref(false)
const error = ref('')

const estimate = ref<{ complexity: number | null; version: string | null } | null>(null)
const estimateLoading = ref(false)
const estimateError = ref('')

const canEstimate = computed(
  () => !!props.songHash && !!props.difficulty && !!props.characteristic,
)

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
    ap: row.ap,
    platform: row.platform,
    modifiers: row.modifiers,
  })),
)

const priced = computed(() => !!preview.value?.complexitySource)

const complexityLine = computed(() => {
  const source = preview.value
  if (!source) return ''
  if (!source.complexitySource) return 'This map has no complexity yet, so every play reads 0 AP.'
  const value = formatFixed(source.complexity, 2)
  return source.complexitySource === 'current'
    ? `Priced at the ${value} the map carries today.`
    : `Priced at ${value} from the ${source.complexitySource}.`
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { getLeaderboardPreview } = await import('@/api/ranking/maps')
    preview.value = await getLeaderboardPreview(props.mapDifficultyId, PREVIEW_LIMIT)
  } catch (err) {
    preview.value = null
    error.value = parseApiError(err, 'Could not read the platform boards.').message
  }
  loading.value = false
}

async function fetchEstimate() {
  if (!canEstimate.value) return
  estimateLoading.value = true
  estimateError.value = ''
  try {
    const { getComplexityEstimate } = await import('@/api/ranking/maps')
    estimate.value = await getComplexityEstimate({
      songHash: props.songHash as string,
      difficulty: props.difficulty as Difficulty,
      characteristic: props.characteristic as string,
    })
  } catch (err) {
    estimate.value = null
    estimateError.value = parseApiError(err, 'Could not run the script on this map.').message
  }
  estimateLoading.value = false
}

watch(() => props.mapDifficultyId, () => {
  estimate.value = null
  estimateError.value = ''
  load()
}, { immediate: true })
</script>

<template>
  <div class="lb-preview">
    <header class="lb-preview__head">
      <div class="lb-preview__summary">
        <p class="lb-preview__line" :class="{ 'lb-preview__line--warn': !priced && !loading }">
          {{ loading ? 'Reading BeatLeader and ScoreSaber.' : complexityLine }}
        </p>
        <p v-if="preview" class="lb-preview__meta">
          {{ formatCount(preview.fetched) }} players read, best play each, BeatLeader first.
        </p>
      </div>

      <div class="lb-preview__estimate">
        <BaseButton v-if="canEstimate" size="sm" :loading="estimateLoading" @click="fetchEstimate">
          Run the script
        </BaseButton>
        <span v-if="estimate" class="lb-preview__estimate-value">
          <template v-if="estimate.complexity != null">
            {{ formatFixed(estimate.complexity, 2) }}
            <span class="lb-preview__estimate-version">{{ estimate.version }}</span>
          </template>
          <template v-else>The model could not read this map.</template>
        </span>
        <span v-if="estimateError" class="lb-preview__error">{{ estimateError }}</span>
      </div>
    </header>

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

.lb-preview__line {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--text-body);
}

.lb-preview__line--warn {
  color: var(--warning);
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
