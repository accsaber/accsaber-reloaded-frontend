<script setup lang="ts">
withDefaults(
  defineProps<{
    name: string
    subName?: string | null
    layout?: 'inline' | 'stacked'
  }>(),
  { subName: null, layout: 'inline' },
)
</script>

<template>
  <span v-if="layout === 'stacked'" class="song-title">
    <span class="song-title__name">{{ name }}</span>
    <span v-if="subName" class="song-title__sub">{{ subName }}</span>
  </span>
  <span v-else
    >{{ name }}<span v-if="subName" class="song-title__sub-inline">{{ ` ${subName}` }}</span></span
  >
</template>

<style scoped>
.song-title {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.song-title__name,
.song-title__sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-title__sub {
  font-size: var(--text-caption);
  font-weight: 400;
  color: var(--text-tertiary);
}

.song-title__sub-inline {
  font-weight: 400;
  color: var(--text-secondary);
}
</style>
