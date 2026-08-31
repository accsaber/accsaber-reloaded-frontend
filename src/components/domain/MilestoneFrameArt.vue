<script setup lang="ts">
import type { MilestoneFrame } from '@/utils/milestoneTiers'

defineProps<{ frame: MilestoneFrame }>()
</script>

<template>
  <path
    :d="frame.plate"
    fill="var(--ms-plate)"
    stroke="currentColor"
    :stroke-width="frame.rimWidth"
    stroke-linejoin="round"
  />
  <path
    v-if="frame.seams"
    :d="frame.seams"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linejoin="round"
    opacity="0.4"
  />
  <path v-if="frame.studs" :d="frame.studs" fill="currentColor" opacity="0.7" />
</template>
