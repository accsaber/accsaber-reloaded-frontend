<script setup lang="ts">
import type { NewsType } from '@/types/enums'
import { NEWS_TYPE_ACCENT, NEWS_TYPE_LABELS } from '@/utils/constants'

defineProps<{
  type: NewsType
}>()
</script>

<template>
  <span class="news-type-badge" :style="{ '--badge-accent': NEWS_TYPE_ACCENT[type] }">
    {{ NEWS_TYPE_LABELS[type] }}
  </span>
</template>

<style scoped>
.news-type-badge {
  color: var(--badge-accent);
  font-size: var(--text-caption);
  font-weight: 600;
  white-space: nowrap;
}
</style>
