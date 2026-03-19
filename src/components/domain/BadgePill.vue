<script setup lang="ts">
import { useCategoryStore } from '@/stores/categories';
import type { CategoryCode } from '@/types/display';
import { computed } from 'vue';

const props = defineProps<{
  label: string
  categoryCode?: CategoryCode
  color?: string
}>()

const categoryStore = useCategoryStore()

const pillColor = computed(() => {
  if (props.color) return props.color
  if (props.categoryCode) return categoryStore.getAccent(props.categoryCode)
  return 'var(--accent)'
})
</script>

<template>
  <span class="badge-pill" :style="{ '--pill-color': pillColor }">
    {{ label }}
  </span>
</template>

<style scoped>
.badge-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-sm);
  border: 1px solid var(--pill-color);
  border-radius: var(--radius-pill);
  color: var(--pill-color);
  font-size: var(--text-caption);
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
}
</style>
