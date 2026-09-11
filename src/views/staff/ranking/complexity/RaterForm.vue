<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type { RaterCoefficients } from '@/types/api/complexity'
import type { CategoryCode } from '@/types/display'
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
  type CoefficientKey,
  type GateKey,
} from './tuning'
import { computed } from 'vue'

defineProps<{
  loading?: boolean
}>()

const { live, edited, bands, version, reset, dirty } = useTuningState()

type LineKey = 'categories' | 'boardCategories'

const LINES: { key: LineKey; title: string; hint: string }[] = [
  {
    key: 'categories',
    title: 'Chart line',
    hint: 'Prices every map from its notes.',
  },
  {
    key: 'boardCategories',
    title: 'Board line',
    hint: 'Nudges maps that clear the gate toward what players score on them.',
  },
]

const codes = computed(() => (edited.value ? categoryCodes(edited.value) : []))

const snapped = computed(() => {
  if (!edited.value) return null
  const band = nearestBand(edited.value.worstShare, bands.value)
  if (band == null) return null
  return Math.abs(band - edited.value.worstShare) < 0.0001 ? null : band
})

const bandList = computed(() => bands.value.map((band) => formatFixed(band, 3)).join('  '))

function coefficients(line: LineKey, code: string): RaterCoefficients | undefined {
  return edited.value?.[line][code]
}

function liveCoefficient(line: LineKey, code: string, key: CoefficientKey): number {
  return live.value?.[line][code]?.[key] ?? 0
}

function setCoefficient(line: LineKey, code: string, key: CoefficientKey, value: number) {
  const target = coefficients(line, code)
  if (!target) return
  target[key] = value
}

function setGate(key: GateKey, value: number) {
  if (!edited.value) return
  edited.value.board[key] = value
}

function setWorstShare(value: number) {
  if (!edited.value) return
  edited.value.worstShare = value
}
</script>

<template>
  <div class="rater-form">
    <template v-if="loading || !edited">
      <SkeletonLoader variant="card" />
      <SkeletonLoader variant="card" />
    </template>

    <template v-else>
      <header class="rater-form__head">
        <div class="rater-form__intro">
          <h3 class="rater-form__title">Constants</h3>
          <p class="rater-form__note">
            Editing these prices the whole pool below. Nothing here is saved.
          </p>
        </div>
        <div class="rater-form__head-actions">
          <span class="rater-form__version">{{ version }}</span>
          <BaseButton size="sm" :disabled="!dirty()" @click="reset">Reset to live</BaseButton>
        </div>
      </header>

      <div class="rater-form__top">
        <section class="rater-form__group">
          <h4 class="rater-form__group-title">Worst share</h4>
          <RaterField label="Share of notes" :hint="WORST_SHARE_HINT" kind="share"
            :live="live?.worstShare ?? edited.worstShare" :model-value="edited.worstShare"
            @update:model-value="setWorstShare" />
          <p class="rater-form__bands">
            Prices exactly at <span class="rater-form__code">{{ bandList }}</span>
            <template v-if="snapped">. Snaps to {{ formatFixed(snapped, 3) }}.</template>
          </p>
        </section>

        <section class="rater-form__group">
          <h4 class="rater-form__group-title">Board gate</h4>
          <div class="rater-form__gate">
            <RaterField v-for="field in GATE_FIELDS" :key="field.key" :label="field.label"
              :hint="field.hint" :kind="field.kind" :deferred="field.slow"
              :live="live?.board[field.key] ?? 0" :model-value="edited.board[field.key]"
              @update:model-value="setGate(field.key, $event)" />
          </div>
          <p class="rater-form__bands">{{ SLOW_GATE_NOTE }}</p>
        </section>
      </div>

      <section v-for="line in LINES" :key="line.key" class="rater-form__section">
        <div class="rater-form__section-head">
          <h4 class="rater-form__group-title">{{ line.title }}</h4>
          <span class="rater-form__note">{{ line.hint }}</span>
        </div>

        <div class="rater-form__lines">
          <div v-for="code in codes" :key="code" class="rater-form__line">
            <CategoryBadge :category="(code as CategoryCode)" />
            <template v-if="coefficients(line.key, code)">
              <RaterField v-for="field in COEFFICIENT_FIELDS" :key="field.key" :label="field.label"
                :hint="field.hint" :kind="field.kind"
                :live="liveCoefficient(line.key, code, field.key)"
                :model-value="coefficients(line.key, code)![field.key]"
                @update:model-value="setCoefficient(line.key, code, field.key, $event)" />
            </template>
            <p v-else class="rater-form__absent">This category has no board line.</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.rater-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  min-width: 0;
  padding: var(--space-xl);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.rater-form__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.rater-form__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.rater-form__title {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--text-section-heading);
  font-weight: 600;
}

.rater-form__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  line-height: 1.5;
}

.rater-form__head-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.rater-form__version {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.rater-form__top {
  display: grid;
  grid-template-columns: minmax(min(280px, 100%), 1fr) minmax(min(420px, 100%), 2fr);
  gap: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--bg-overlay);
}

.rater-form__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.rater-form__group-title {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.rater-form__gate {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
  gap: var(--space-md) var(--space-xl);
}

.rater-form__bands {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  line-height: 1.5;
}

.rater-form__code {
  font-family: var(--font-code);
  color: var(--text-secondary);
}

.rater-form__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
  padding-top: var(--space-lg);
  border-top: 1px solid var(--bg-overlay);
}

.rater-form__section-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.rater-form__lines {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr));
  gap: var(--space-lg) var(--space-xl);
}

.rater-form__line {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
  padding: var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.rater-form__absent {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-caption);
}

@media (max-width: 1100px) {
  .rater-form__top {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .rater-form {
    gap: var(--space-lg);
    padding: var(--space-md);
  }
}
</style>
