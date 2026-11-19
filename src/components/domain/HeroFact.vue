<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <div class="hero-fact">
    <span class="field-label">{{ label }}</span>
    <span class="hero-fact__value"><slot /></span>
  </div>
</template>

<style scoped>
.hero-fact {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.hero-fact__value {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  min-height: 28px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
