<script setup lang="ts">
import type { GlyphInstance } from '@/utils/milestoneIcons'

defineProps<{ parts: GlyphInstance[] }>()

const STROKE = 1.25
const FILL_STROKE = 0.5
</script>

<template>
  <path
    v-for="(part, i) in parts"
    :key="i"
    :d="part.d"
    :transform="part.transform"
    :fill="part.fill ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="(part.fill ? FILL_STROKE : STROKE) / part.scale"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</template>
