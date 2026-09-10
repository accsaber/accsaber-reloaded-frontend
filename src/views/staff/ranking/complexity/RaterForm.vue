<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type { RaterCoefficients } from '@/types/api/complexity'
import type { CategoryCode } from '@/types/display'
import { formatFixed } from '@/utils/formatters'
import {
  COEFFICIENT_FIELDS,
  GATE_FIELDS,
  SHARE_STEP,
  SLOPE_STEP,
  categoryCodes,
  nearestBand,
  useTuningState,
} from './tuning'
import { computed } from 'vue'

defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  change: []
}>()

const { edited, bands, version, reset, dirty } = useTuningState()

const rater = computed(() => edited.value)

const LINES: { key: 'categories' | 'boardCategories'; title: string; hint: string }[] = [
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

const codes = computed(() => (rater.value ? categoryCodes(rater.value) : []))

const snapped = computed(() => {
  if (!rater.value) return null
  const band = nearestBand(rater.value.worstShare, bands.value)
  if (band == null) return null
  return Math.abs(band - rater.value.worstShare) < 0.0001 ? null : band
})

const bandList = computed(() => bands.value.map((band) => formatFixed(band, 3)).join('  '))

function setNumber(target: Record<string, number>, key: string, value: string | number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return
  target[key] = parsed
  emit('change')
}

function coefficients(line: 'categories' | 'boardCategories', code: string): RaterCoefficients | undefined {
  return rater.value?.[line][code]
}

function resetToLive() {
  reset()
  emit('change')
}
</script>

<template>
  <div class="rater-form">
    <template v-if="loading || !rater">
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
          <BaseButton size="sm" :disabled="!dirty()" @click="resetToLive">Reset to live</BaseButton>
        </div>
      </header>

      <section class="rater-form__section">
        <h4 class="rater-form__section-title">Worst share</h4>
        <div class="rater-form__row">
          <BaseInput class="rater-form__field" label="Share" type="number" :step="SHARE_STEP"
            :model-value="rater.worstShare"
            @update:model-value="setNumber(rater as unknown as Record<string, number>, 'worstShare', $event)" />
          <p class="rater-form__hint">
            These shares price exactly: <span class="rater-form__code">{{ bandList }}</span>
            <template v-if="snapped">
              . This one snaps to {{ formatFixed(snapped, 3) }}.
            </template>
          </p>
        </div>
      </section>

      <section class="rater-form__section">
        <h4 class="rater-form__section-title">Board gate</h4>
        <div class="rater-form__gate">
          <BaseInput v-for="field in GATE_FIELDS" :key="field.key" class="rater-form__field"
            :label="field.label" type="number" :step="field.step"
            :model-value="rater.board[field.key]"
            @update:model-value="setNumber(rater.board as unknown as Record<string, number>, field.key, $event)" />
        </div>
      </section>

      <section v-for="line in LINES" :key="line.key" class="rater-form__section">
        <div class="rater-form__section-head">
          <h4 class="rater-form__section-title">{{ line.title }}</h4>
          <span class="rater-form__hint">{{ line.hint }}</span>
        </div>

        <div class="rater-form__matrix" :style="{ '--rater-columns': codes.length }">
          <span class="rater-form__matrix-corner" />
          <span v-for="code in codes" :key="code" class="rater-form__matrix-head">
            <CategoryBadge :category="(code as CategoryCode)" size="sm" />
          </span>

          <template v-for="field in COEFFICIENT_FIELDS" :key="field.key">
            <span class="rater-form__matrix-label">{{ field.label }}</span>
            <div v-for="code in codes" :key="code + field.key" class="rater-form__matrix-cell">
              <BaseInput v-if="coefficients(line.key, code)" type="number" :step="SLOPE_STEP"
                :aria-label="`${field.label} for ${code}`"
                :model-value="coefficients(line.key, code)![field.key]"
                @update:model-value="setNumber(coefficients(line.key, code) as unknown as Record<string, number>, field.key, $event)" />
              <span v-else class="rater-form__absent">–</span>
            </div>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.rater-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
  padding: var(--space-lg);
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
  font-size: var(--text-body);
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

.rater-form__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.rater-form__section-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.rater-form__section-title {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.rater-form__row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.rater-form__gate {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 180px));
  gap: var(--space-md);
}

.rater-form__field {
  max-width: 200px;
}

.rater-form__hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  line-height: 1.5;
}

.rater-form__code {
  font-family: var(--font-code);
  color: var(--text-primary);
}

.rater-form__matrix {
  display: grid;
  grid-template-columns: 120px repeat(var(--rater-columns), minmax(104px, 150px));
  justify-content: start;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  overflow-x: auto;
}

.rater-form__matrix-corner {
  min-height: 1px;
}

.rater-form__matrix-head {
  display: flex;
  justify-content: center;
}

.rater-form__matrix-label {
  color: var(--text-secondary);
  font-size: var(--text-caption);
}

.rater-form__matrix-cell {
  display: flex;
  justify-content: center;
}

.rater-form__matrix-cell :deep(.base-input) {
  width: 100%;
}

.rater-form__matrix-cell :deep(.base-input__field) {
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-mono);
  text-align: right;
}

.rater-form__absent {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

@media (max-width: 767px) {
  .rater-form {
    padding: var(--space-md);
  }

  .rater-form__matrix {
    grid-template-columns: 104px repeat(var(--rater-columns), minmax(92px, 132px));
  }
}
</style>
