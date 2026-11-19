<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import StoredFold from '@/components/common/StoredFold.vue'
import { useCategoryStore } from '@/stores/categories'
import type { Tab } from '@/types/display'
import { formatFixed } from '@/utils/formatters'
import RaterField from './RaterField.vue'
import {
  COEFFICIENT_FIELDS,
  GATE_FIELDS,
  SLOW_GATE_NOTE,
  WORST_SHARE_HINT,
  categoryCodes,
  nearestBand,
  useTuningState,
} from './tuning'
import { computed, ref } from 'vue'

const props = defineProps<{
  category: string
  loading?: boolean
}>()

type LineKey = 'categories' | 'boardCategories'

const LINES: { key: LineKey; title: string; hint: string; fold: string; collapsed: boolean }[] = [
  {
    key: 'boardCategories',
    title: 'Board Line',
    hint: 'Weights every map that clears the gate from what players score on it.',
    fold: 'script-board-line',
    collapsed: false,
  },
  {
    key: 'categories',
    title: 'Chart Line',
    hint: 'The baseline read from the notes. A map is weighted from it until enough scores come in, then the board line moves it from there.',
    fold: 'script-chart-line',
    collapsed: true,
  },
]
const SNAP_MATCH = 0.0001

const categoryStore = useCategoryStore()
const { live, edited, bands, version, reset, dirty } = useTuningState()

const codes = computed(() => (edited.value ? categoryCodes(edited.value) : []))
const picked = ref('')
const followsPage = computed(() => codes.value.includes(props.category))
const code = computed(() => {
  if (followsPage.value) return props.category
  return codes.value.includes(picked.value) ? picked.value : (codes.value[0] ?? '')
})

const tabs = computed<Tab[]>(() =>
  codes.value.map((key) => ({ key, label: categoryStore.getShortName(key), accentColor: categoryStore.getAccent(key) })),
)

function lineEdited(key: string): boolean {
  return LINES.some((line) => JSON.stringify(live.value?.[line.key][key]) !== JSON.stringify(edited.value?.[line.key][key]))
}

const editedElsewhere = computed(() =>
  codes.value.filter((key) => key !== code.value && lineEdited(key)).map((key) => categoryStore.getShortName(key)).join(', '),
)

const snapped = computed(() => {
  if (!edited.value) return null
  const band = nearestBand(edited.value.worstShare, bands.value)
  return band == null || Math.abs(band - edited.value.worstShare) < SNAP_MATCH ? null : band
})

const bandNote = computed(() => {
  const list = bands.value.map((band) => formatFixed(band, 3)).join(', ')
  return snapped.value == null ? `Weights exactly at ${list}` : `Weights exactly at ${list}. Snaps to ${formatFixed(snapped.value, 3)}`
})
</script>

<template>
  <div class="surface-card rater-form">
    <template v-if="loading || !edited">
      <SkeletonLoader class="placeholder" height="var(--control-h)" />
      <SkeletonLoader v-for="n in 3" :key="n" class="placeholder" height="52px" />
      <SkeletonLoader class="placeholder" height="300px" />
    </template>

    <template v-else>
      <div class="rater-form__head">
        <BaseTabs v-if="!followsPage" variant="segmented" label="Category" :tabs="tabs" :model-value="code" @update:model-value="picked = $event" />
        <span class="caption rater-form__note">
          {{ version }}, nothing here is saved<template v-if="editedElsewhere">. Also edited: {{ editedElsewhere }}</template>
        </span>
        <BaseButton :disabled="!dirty" @click="reset">Reset to Live</BaseButton>
      </div>

      <StoredFold class="rater-form__fold" label="Worst Share" storage-key="script-worst-share">
        <template #meta><HintTooltip :text="bandNote" label="Worst share" /></template>
        <div class="rater-form__fields">
          <RaterField label="Share of Notes" :hint="WORST_SHARE_HINT" kind="share" :live="live?.worstShare ?? edited.worstShare"
            :model-value="edited.worstShare" @update:model-value="edited.worstShare = $event" />
        </div>
      </StoredFold>

      <StoredFold class="rater-form__fold" label="Board Gate" storage-key="script-board-gate">
        <template #meta><HintTooltip :text="SLOW_GATE_NOTE" label="Board gate" /></template>
        <div class="rater-form__fields">
          <RaterField v-for="field in GATE_FIELDS" :key="field.key" :label="field.label" :hint="field.hint" :kind="field.kind"
            :deferred="field.slow" :live="live?.board[field.key] ?? 0" :model-value="edited.board[field.key]"
            @update:model-value="edited.board[field.key] = $event" />
        </div>
      </StoredFold>

      <StoredFold v-for="line in LINES" :key="line.key" class="rater-form__fold" :label="line.title" :storage-key="line.fold"
        :default-collapsed="line.collapsed">
        <template #meta><HintTooltip :text="line.hint" :label="line.title" /></template>
        <div v-if="edited[line.key][code]" :key="code" class="rater-form__fields">
          <RaterField v-for="field in COEFFICIENT_FIELDS" :key="field.key" :label="field.label" :hint="field.hint" :kind="field.kind"
            :live="live?.[line.key][code]?.[field.key] ?? 0" :model-value="edited[line.key][code][field.key]"
            @update:model-value="edited[line.key][code][field.key] = $event" />
        </div>
        <p v-else class="caption">This category has no {{ line.title.toLowerCase() }}</p>
      </StoredFold>
    </template>
  </div>
</template>

<style scoped>
.rater-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.rater-form__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
}

.rater-form__note {
  flex: 1;
  min-width: 200px;
}

.rater-form__head :deep(.base-tabs__tab--active) {
  color: var(--tab-accent);
}

.rater-form__fold :deep(.stored-fold__label) {
  font-size: var(--text-card-title);
}

.rater-form__fold :deep(.stored-fold__toggle) {
  color: var(--text-primary);
}

.rater-form__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--space-2xl);
}

@media (max-width: 1023px) {
  .rater-form__fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
