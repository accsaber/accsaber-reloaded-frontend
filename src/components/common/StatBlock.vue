<script setup lang="ts">
import RankChange from '@/components/common/RankChange.vue'
import { useCountUp } from '@/composables/useCountUp'
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: number | string
  trend?: number
  decimals?: number
}>()

const isNumeric = computed(() => typeof props.value === 'number')

const numericRef = computed(() => (typeof props.value === 'number' ? props.value : 0))
const { displayValue } = useCountUp(numericRef, { decimals: props.decimals ?? 2 })
</script>

<template>
  <div class="stat-block">
    <div class="stat-block__header">
      <span class="stat-block__label">{{ label }}</span>
      <slot name="label-suffix" />
    </div>
    <div class="stat-block__value">
      {{ isNumeric ? displayValue : value }}
    </div>
    <RankChange v-if="trend" :value="trend" />
  </div>
</template>

<style scoped>
.stat-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
}

.stat-block__header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.stat-block__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.stat-block__value {
  font-family: var(--font-mono);
  font-size: var(--text-section-heading);
  font-weight: 500;
  color: var(--text-primary);
}
</style>
