<script setup lang="ts">
import SupporterPill from '@/components/domain/SupporterPill.vue'
import type { SupporterStateResponse } from '@/types/api/supporters'
import { computed } from 'vue'

const props = defineProps<{
  state: SupporterStateResponse
  isSelfProfile: boolean
}>()

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
  } catch {
    return null
  }
}

const balanceDaysEstimate = computed(() => {
  const monthly = props.state.monthlyCostCents
  if (!monthly || props.state.balanceCents <= 0) return null
  const days = Math.round((props.state.balanceCents / monthly) * 30)
  if (days < 1) return null
  return days
})

const sinceLabel = computed(() => formatDate(props.state.tierStartedAt))
const balanceLabel = computed(() => formatCents(props.state.balanceCents))

const hasMeta = computed(() => !!props.state.currentTier)
</script>

<template>
  <div v-if="hasMeta" class="supporter-meta">
    <SupporterPill :state="state" size="sm" />
    <span v-if="sinceLabel" class="supporter-meta__item">
      Since <span class="supporter-meta__value">{{ sinceLabel }}</span>
    </span>
    <span v-if="isSelfProfile && state.balanceCents > 0" class="supporter-meta__item">
      <span class="supporter-meta__value">{{ balanceLabel }}</span> balance<span v-if="balanceDaysEstimate"> ({{ balanceDaysEstimate }}d)</span>
    </span>
  </div>
</template>

<style scoped>
.supporter-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.supporter-meta__item {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35em;
  line-height: 1.4;
}

.supporter-meta__value {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  font-weight: 500;
}
</style>
