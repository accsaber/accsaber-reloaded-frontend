<script setup lang="ts">
import type { NewsType } from '@/types/enums'
import { NEWS_TYPE_ACCENT, NEWS_TYPE_LABELS } from '@/utils/constants'
import { computed } from 'vue'

const props = defineProps<{
  type: NewsType
  size?: 'sm' | 'md'
}>()

const accent = computed(() => NEWS_TYPE_ACCENT[props.type])
const label = computed(() => NEWS_TYPE_LABELS[props.type])
</script>

<template>
  <span class="news-type-badge" :class="`news-type-badge--${size ?? 'md'}`" :style="{ '--badge-accent': accent }">
    {{ label }}
  </span>
</template>

<style scoped>
.news-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--badge-accent) 35%, transparent);
  background: color-mix(in srgb, var(--badge-accent) 10%, transparent);
  color: var(--badge-accent);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.news-type-badge--sm {
  padding: 1px 8px;
  font-size: 0.7rem;
}
</style>
