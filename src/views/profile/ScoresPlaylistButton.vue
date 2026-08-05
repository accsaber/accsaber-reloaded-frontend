<script setup lang="ts">
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import { usePlaylistDownload } from '@/composables/usePlaylistDownload'
import type { UserScoresParams } from '@/types/api/users'
import { ref } from 'vue'

const props = defineProps<{
  userId: string
  params: UserScoresParams
}>()

const TOP_SIZES = [25, 50, 100]

const open = ref(false)
const { downloadScoresPlaylist } = usePlaylistDownload()

function download(params: UserScoresParams) {
  downloadScoresPlaylist(props.userId, params)
  open.value = false
}
</script>

<template>
  <BaseDropdown :open="open" position="bottom-right" @update:open="open = $event">
    <template #trigger>
      <button class="spl__btn" :class="{ 'spl__btn--active': open }" aria-label="Download these maps as a playlist">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Playlist</span>
        <svg class="spl__chevron" :class="{ 'spl__chevron--open': open }" width="12" height="12" viewBox="0 0 12 12"
          fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
      </button>
    </template>
    <div class="spl__menu">
      <button v-for="size in TOP_SIZES" :key="size" class="spl__item"
        @click="download({ ...props.params, page: 0, size })">
        Top {{ size }}
      </button>
      <div class="spl__divider" />
      <button class="spl__item" @click="download(props.params)">
        This page
        <span v-if="params.size" class="spl__count">{{ params.size }}</span>
      </button>
      <p class="spl__note">It keeps your sorting and filters.</p>
    </div>
  </BaseDropdown>
</template>

<style scoped>
.spl__btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  background: color-mix(in srgb, var(--accent-overall) 12%, transparent);
  border: 1px solid var(--accent-overall);
  border-radius: var(--radius-input);
  color: var(--accent-overall);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms ease;
}

.spl__btn:hover,
.spl__btn--active {
  background: color-mix(in srgb, var(--accent-overall) 22%, var(--bg-base));
}

.spl__chevron {
  color: currentColor;
  transition: transform 150ms ease;
}

.spl__chevron--open {
  transform: rotate(180deg);
}

.spl__menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 172px;
}

.spl__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: none;
  border-radius: var(--radius-btn);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  transition: background 120ms ease;
}

.spl__item:hover {
  background: var(--bg-overlay);
}

.spl__item:focus-visible {
  outline: none;
  background: var(--bg-overlay);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-overall) 20%, transparent);
}

.spl__count {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.spl__divider {
  height: 1px;
  background: var(--bg-overlay);
  margin: var(--space-xs) 0;
}

.spl__note {
  margin: var(--space-xs) 0 0;
  padding: 0 var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  line-height: 1.4;
}
</style>
