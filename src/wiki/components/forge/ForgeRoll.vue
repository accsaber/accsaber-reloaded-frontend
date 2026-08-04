<script setup lang="ts">
import { computed } from 'vue'

export interface ForgeRollSegment {
  key: string
  label: string
  weight: number
  active: boolean
}

const props = defineProps<{
  segments: ForgeRollSegment[]
  caption: string
}>()

const total = computed(() => props.segments.reduce((sum, s) => sum + s.weight, 0))

const shaped = computed(() =>
  props.segments.map((segment) => ({
    ...segment,
    percent: total.value > 0 ? (segment.weight / total.value) * 100 : 0,
  })),
)

const activeLabel = computed(() => props.segments.find((s) => s.active)?.label ?? null)
</script>

<template>
  <div class="roll">
    <div class="roll__bar" role="img" :aria-label="caption">
      <span
        v-for="segment in shaped"
        :key="segment.key"
        class="roll__segment"
        :class="{ 'roll__segment--active': segment.active }"
        :style="{ width: `${segment.percent}%` }"
        :title="`${segment.label} · ${segment.weight}`"
      />
    </div>
    <p class="roll__caption">
      <span v-if="activeLabel" class="roll__chosen">{{ activeLabel }}</span>
      {{ caption }}
    </p>
  </div>
</template>

<style scoped>
.roll {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.roll__bar {
  display: flex;
  height: 34px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  overflow: hidden;
  background: var(--bg-base);
}

.roll__segment {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2px;
  background: var(--bg-elevated);
  border-right: 1px solid var(--bg-base);
  transition: background-color 160ms ease;
}

.roll__segment:last-child {
  border-right: none;
}

.roll__segment--active {
  background: var(--accent);
}

.roll__caption {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.roll__chosen {
  font-weight: 700;
  color: var(--text-primary);
}

.roll__chosen::after {
  content: ' · ';
  color: var(--text-tertiary);
  font-weight: 400;
}

@media (prefers-reduced-motion: reduce) {
  .roll__segment {
    transition: none;
  }
}
</style>
