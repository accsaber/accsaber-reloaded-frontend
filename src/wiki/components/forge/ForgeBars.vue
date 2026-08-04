<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  values: number[]
  highlightIndex: number
  caption: string
  markerValue?: number | null
  markerLabel?: string
}>()

const FULL_LABELS_MAX = 16
const BAR_MAX_PCT = 78
const BAR_MIN_PCT = 12

const range = computed(() => {
  const pool = props.markerValue ? [...props.values, props.markerValue] : props.values
  const lo = Math.min(...pool)
  const hi = Math.max(...pool)
  return { lo, span: Math.max(hi - lo, 0) }
})

const heightPct = (value: number) => {
  const { lo, span } = range.value
  if (span === 0) return (BAR_MIN_PCT + BAR_MAX_PCT) / 2
  return BAR_MIN_PCT + ((value - lo) / span) * (BAR_MAX_PCT - BAR_MIN_PCT)
}

const showLabel = (index: number) =>
  props.values.length <= FULL_LABELS_MAX ||
  index === 0 ||
  index === props.highlightIndex ||
  index === props.values.length - 1
</script>

<template>
  <div class="bars">
    <div class="bars__row">
      <span v-for="(value, index) in values" :key="index" class="bars__col">
        <span
          v-if="showLabel(index)"
          class="bars__value"
          :class="{ 'bars__value--highlight': index === highlightIndex }"
          :style="{ bottom: `${heightPct(value)}%` }"
        >
          {{ Math.round(value) }}
        </span>
        <span
          class="bars__bar"
          :class="{ 'bars__bar--highlight': index === highlightIndex }"
          :style="{ height: `${heightPct(value)}%` }"
        />
      </span>
      <span
        v-if="markerValue"
        class="bars__marker"
        :style="{ bottom: `${heightPct(markerValue)}%` }"
      >
        <span class="bars__marker-label">{{ markerLabel }}</span>
      </span>
    </div>
    <p class="bars__caption">{{ caption }}</p>
  </div>
</template>

<style scoped>
.bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.bars__row {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 3px;
  height: 104px;
  padding: 0 var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: var(--bg-base);
}

.bars__col {
  position: relative;
  flex: 1;
  min-width: 4px;
  display: flex;
  align-items: flex-end;
}

.bars__bar {
  width: 100%;
  background: var(--bg-overlay);
  border-radius: 1px 1px 0 0;
}

.bars__bar--highlight {
  background: var(--accent);
}

.bars__value {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 2px;
  padding: 0 2px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  line-height: 1;
  color: var(--text-tertiary);
  white-space: nowrap;
  background: var(--bg-base);
  z-index: 1;
}

.bars__value--highlight {
  color: var(--accent);
  font-weight: 700;
}

.bars__marker {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--text-secondary);
}

.bars__marker-label {
  position: absolute;
  right: var(--space-sm);
  bottom: 2px;
  padding: 0 3px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--text-secondary);
  background: var(--bg-base);
}

.bars__caption {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
