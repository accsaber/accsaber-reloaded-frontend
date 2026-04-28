<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  complexity: number
}>()

const formatted = computed(() => props.complexity.toFixed(1))
</script>

<template>
  <span class="complexity-badge">{{ formatted }}</span>
</template>

<style scoped>
.complexity-badge {
  display: inline-flex;
  align-items: center;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}
</style>
