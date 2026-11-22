<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import StoredFold from '@/components/common/StoredFold.vue'
import { useCategoryStore } from '@/stores/categories'
import type { Tab } from '@/types/display'
import RaterField from './RaterField.vue'
import {
  BOT_ESTIMATE_HINT,
  COEFFICIENT_FIELDS,
  PAY_FAIR_HINT,
  PLAY_FIELDS,
  SCORE_FIELDS,
  WEIGHT_HINT,
  useTuningState,
} from './tuning'
import { computed, ref } from 'vue'

const props = defineProps<{
  category: string
  loading?: boolean
}>()

const categoryStore = useCategoryStore()
const { live, edited, version, reset, dirty } = useTuningState()

const codes = computed(() => Object.keys(edited.value?.categories ?? {}))
const picked = ref('')
const followsPage = computed(() => codes.value.includes(props.category))
const code = computed(() => {
  if (followsPage.value) return props.category
  return codes.value.includes(picked.value) ? picked.value : (codes.value[0] ?? '')
})

const tabs = computed<Tab[]>(() =>
  codes.value.map((key) => ({ key, label: categoryStore.getShortName(key), accentColor: categoryStore.getAccent(key) })),
)

const expectsTabs = computed(() => (edited.value ? !followsPage.value : props.category === 'overall'))

const weight = computed(() => Math.round((edited.value?.payFair.maxWeight ?? 0) * 100))
const liveWeight = computed(() => Math.round((live.value?.payFair.maxWeight ?? 0) * 100))

function setScores(key: 'minScores' | 'fullScores', value: number) {
  const payFair = edited.value?.payFair
  if (!payFair) return
  payFair[key] = value
  if (payFair.fullScores <= payFair.minScores) payFair.fullScores = payFair.minScores + 1
}

const FOLD_FIELDS = [`${COEFFICIENT_FIELDS.length}`, `calc(${PLAY_FIELDS.length + 1} + var(--rater-pair-rows))`]

const FOLD_HEIGHT = 'calc(1lh + var(--space-xs) + var(--space-sm) + var(--rater-row-h) * var(--fields) / var(--rater-per-row))'

function categoryEdited(key: string): boolean {
  return JSON.stringify(live.value?.categories[key]) !== JSON.stringify(edited.value?.categories[key])
}

const editedElsewhere = computed(() =>
  codes.value.filter((key) => key !== code.value && categoryEdited(key)).map((key) => categoryStore.getShortName(key)).join(', '),
)
</script>

<template>
  <div class="surface-card rater-form" :class="{ 'rater-form--tabs': expectsTabs }">
    <template v-if="loading || !edited">
      <SkeletonLoader class="placeholder" height="var(--rater-head-h)" />
      <SkeletonLoader v-for="fields in FOLD_FIELDS" :key="fields" class="placeholder"
        :height="FOLD_HEIGHT" :style="{ '--fields': fields }" />
    </template>

    <template v-else>
      <div class="rater-form__head">
        <BaseTabs v-if="!followsPage" variant="segmented" label="Category" :tabs="tabs" :model-value="code" @update:model-value="picked = $event" />
        <span class="caption rater-form__note">
          {{ version }}, nothing here is saved<template v-if="editedElsewhere">. Also edited: {{ editedElsewhere }}</template>
        </span>
        <BaseButton :disabled="!dirty" @click="reset">Reset to Live</BaseButton>
      </div>

      <StoredFold class="rater-form__fold" label="Bot Complexity Estimate" storage-key="script-bot-estimate">
        <template #meta><HintTooltip :text="BOT_ESTIMATE_HINT" label="Bot Complexity Estimate" /></template>
        <div v-if="edited.categories[code]" :key="code" class="rater-form__fields">
          <RaterField v-for="field in COEFFICIENT_FIELDS" :key="field.key" :label="field.label" :hint="field.hint" :kind="field.kind"
            :live="live?.categories[code]?.[field.key] ?? 0" :model-value="edited.categories[code][field.key]"
            @update:model-value="edited.categories[code][field.key] = $event" />
        </div>
      </StoredFold>

      <StoredFold class="rater-form__fold" label="Pay-fair" storage-key="script-pay-fair">
        <template #meta><HintTooltip :text="PAY_FAIR_HINT" label="Pay-fair" /></template>
        <div class="rater-form__fields">
          <RaterField :label="`Pay-fair ${weight}%`" :hint="WEIGHT_HINT" kind="percent" :end="`Bot ${100 - weight}%`"
            :live="liveWeight" :model-value="weight" @update:model-value="edited.payFair.maxWeight = $event / 100" />
          <div class="rater-form__pair">
            <RaterField v-for="field in SCORE_FIELDS" :key="field.key" plain :label="field.label" :hint="field.hint"
              :kind="field.kind" :live="live?.payFair[field.key] ?? 0" :model-value="edited.payFair[field.key]"
              @update:model-value="setScores(field.key as 'minScores' | 'fullScores', $event)" />
          </div>
          <RaterField v-for="field in PLAY_FIELDS" :key="field.key" deferred :label="field.label" :hint="field.hint"
            :kind="field.kind" :live="live?.payFair[field.key] ?? 0" :model-value="edited.payFair[field.key]"
            @update:model-value="edited.payFair[field.key] = $event" />
        </div>
      </StoredFold>
    </template>
  </div>
</template>

<style scoped>
.rater-form {
  --rater-row-h: var(--control-h);
  --rater-per-row: 2;
  --rater-pair-rows: 1;
  --rater-head-h: var(--control-h);
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

.rater-form__pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--space-lg);
}

@media (max-width: 1023px) {
  .rater-form {
    --rater-per-row: 1;
  }

  .rater-form__fields {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .rater-form {
    --rater-row-h: calc(var(--control-h) + var(--space-sm));
    --rater-pair-rows: 2;
  }

  .rater-form__pair {
    grid-template-columns: minmax(0, 1fr);
  }

  .rater-form--tabs {
    --rater-head-h: calc(var(--control-h) * 2 + var(--space-sm) * 2 + var(--text-caption) * 1.5);
  }
}
</style>
