<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import RankChange from '@/components/common/RankChange.vue'
import type { StatsDiffResponse } from '@/types/api/users'
import { XP_SOURCES } from '@/utils/constants'
import { computed } from 'vue'

const props = defineProps<{
  statsDiff: StatsDiffResponse | null
}>()

const rows = computed(() =>
  XP_SOURCES.map((s) => ({ ...s, value: Math.round(props.statsDiff?.[s.diff] ?? 0) })).filter((r) => r.value),
)

const total = computed(() => rows.value.reduce((sum, r) => sum + r.value, 0))
</script>

<template>
  <HintTooltip v-if="total" text="XP by source" variant="inline" class="xp-trend">
    <template #trigger>
      <RankChange :value="total" /> XP
    </template>
    <span v-for="row in rows" :key="row.label" class="xp-trend__row">
      {{ row.label }}
      <span :style="{ color: row.color }">{{ row.value > 0 ? '+' : '' }}{{ row.value }}</span>
    </span>
  </HintTooltip>
</template>

<style scoped>
.xp-trend {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.xp-trend__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-lg);
  font-family: var(--font-mono);
}
</style>
