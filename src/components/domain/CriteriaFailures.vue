<script setup lang="ts">
defineProps<{
  failures: string[]
}>()

const PREFIX = /^fail:\s*/i
</script>

<template>
  <ul class="criteria-failures">
    <li v-for="(failure, i) in failures" :key="i">{{ failure.replace(PREFIX, '') }}</li>
  </ul>
</template>

<style scoped>
.criteria-failures {
  margin: 0;
  padding: 0 0 0 var(--space-lg);
  font-size: var(--text-body);
  font-weight: 400;
  line-height: 1.5;
  color: var(--text-secondary);
  list-style: disc;
}
</style>
