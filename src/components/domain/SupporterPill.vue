<script setup lang="ts">
import type { SupporterStateResponse } from '@/types/api/supporters'
import { SUPPORTER_TIER_DISPLAY, SUPPORTER_TIER_PALETTE } from '@/types/api/supporters'
import { computed } from 'vue'

const props = defineProps<{
  state: SupporterStateResponse
  size?: 'sm' | 'md'
}>()

const size = computed(() => props.size ?? 'md')

const tier = computed(() => props.state.currentTier)

const color = computed(() =>
  tier.value ? SUPPORTER_TIER_PALETTE[tier.value].base : 'var(--text-tertiary)',
)

const label = computed(() => {
  if (tier.value) return SUPPORTER_TIER_DISPLAY[tier.value]
  if (props.state.hasEverSupported) return 'Past'
  return ''
})

const visible = computed(() => !!tier.value || props.state.hasEverSupported)

const title = computed(() =>
  tier.value ? `${SUPPORTER_TIER_DISPLAY[tier.value]} supporter` : 'Past supporter',
)
</script>

<template>
  <span
    v-if="visible"
    class="supporter-pill"
    :class="[`supporter-pill--${size}`, tier ? 'supporter-pill--active' : 'supporter-pill--past']"
    :style="{ color }"
    :title="title"
  >
    {{ label }}<span class="supporter-pill__suffix">supporter</span>
  </span>
</template>

<style scoped>
.supporter-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35em;
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
}

.supporter-pill--sm {
  font-size: 0.5625rem;
  letter-spacing: 0.12em;
}

.supporter-pill__suffix {
  font-weight: 500;
  color: var(--text-tertiary);
  letter-spacing: 0.06em;
}

.supporter-pill--past {
  font-weight: 600;
}
</style>
