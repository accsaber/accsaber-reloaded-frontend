<script setup lang="ts">
defineProps<{ curated: boolean }>()
</script>

<template>
  <span v-if="!curated" class="campaign-reward-notice">Given once curated</span>
</template>

<style scoped>
.campaign-reward-notice {
  font-size: var(--text-caption);
  font-weight: 400;
  color: var(--warning);
}
</style>
