<script setup lang="ts">
import type { PublicClanResponse } from '@/types/api/clans'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    clan: Pick<PublicClanResponse, 'tag' | 'iconUrl'>
    size?: number
  }>(),
  { size: 32 },
)

const initials = computed(() => props.clan.tag.slice(0, 2))
</script>

<template>
  <img
    v-if="clan.iconUrl"
    class="clan-icon"
    :src="clan.iconUrl"
    alt=""
    :width="size"
    :height="size"
    loading="lazy"
    decoding="async"
  />
  <span
    v-else
    class="clan-icon clan-icon--blank"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.36)}px` }"
    aria-hidden="true"
  >{{ initials }}</span>
</template>

<style scoped>
.clan-icon {
  flex-shrink: 0;
  border-radius: var(--radius-avatar);
  object-fit: cover;
}

.clan-icon--blank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
}
</style>
