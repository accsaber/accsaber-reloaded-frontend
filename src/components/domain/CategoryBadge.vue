<script setup lang="ts">
import { useCategoryStore } from '@/stores/categories'
import type { CategoryCode } from '@/types/display'
import { computed } from 'vue'

const props = defineProps<{
  category: CategoryCode
  size?: 'sm' | 'md'
}>()

const categoryStore = useCategoryStore()

const label = computed(() => categoryStore.getShortName(props.category).toUpperCase())

const color = computed(() => categoryStore.getAccent(props.category))
</script>

<template>
  <span class="category-badge" :class="`category-badge--${size ?? 'md'}`" :style="{ color }">{{ label }}</span>
</template>

<style scoped>
.category-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-sans);
  font-weight: 700;
  line-height: 1.4;
  text-transform: uppercase;
  white-space: nowrap;
}

.category-badge--md {
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
}

.category-badge--sm {
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
}
</style>
