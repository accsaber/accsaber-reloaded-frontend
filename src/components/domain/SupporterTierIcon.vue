<script setup lang="ts">
import type { SupporterTier } from '@/types/api/supporters';
import { SUPPORTER_TIER_DISPLAY, SUPPORTER_TIER_PALETTE } from '@/types/api/supporters';
import { computed } from 'vue';

const props = defineProps<{
  tier: SupporterTier | null | undefined
  size?: number
}>()

const sizePx = computed(() => props.size ?? 14)

const color = computed(() => {
  if (!props.tier) return null
  return SUPPORTER_TIER_PALETTE[props.tier].base
})

const stroke = computed(() => {
  if (!props.tier) return null
  return SUPPORTER_TIER_PALETTE[props.tier].shadow
})

const label = computed(() => {
  if (!props.tier) return ''
  return `${SUPPORTER_TIER_DISPLAY[props.tier]} supporter`
})
</script>

<template>
  <svg v-if="tier && color" class="supporter-tier-icon" :width="sizePx" :height="sizePx" viewBox="0 0 14 12" role="img"
    :aria-label="label" :title="label">
    <path d="M7 11.5
         C 1.5 8.5, 0 5.5, 0 3.5
         C 0 1.5, 1.5 0, 3.5 0
         C 5 0, 6.3 0.9, 7 2.2
         C 7.7 0.9, 9 0, 10.5 0
         C 12.5 0, 14 1.5, 14 3.5
         C 14 5.5, 12.5 8.5, 7 11.5 Z" :fill="color" :stroke="stroke" stroke-width="0.6" stroke-linejoin="round" />
  </svg>
</template>

<style scoped>
.supporter-tier-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
