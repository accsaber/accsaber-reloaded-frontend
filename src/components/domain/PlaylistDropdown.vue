<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import { usePlaylistDownload } from '@/composables/usePlaylistDownload'
import { useAuthStore } from '@/stores/auth'
import { ref } from 'vue'

const props = defineProps<{
  queued?: boolean
}>()

const authStore = useAuthStore()
const open = ref(false)
const unplayedOnly = ref(false)
const { playlistCategories, downloadPlaylist, downloadUnrankedPlaylist, downloadMissingPlaylist } =
  usePlaylistDownload()

function download(categoryCode: string) {
  if (props.queued) downloadUnrankedPlaylist(categoryCode)
  else if (unplayedOnly.value && authStore.userId) downloadMissingPlaylist(authStore.userId, categoryCode)
  else downloadPlaylist(categoryCode)
  open.value = false
}
</script>

<template>
  <BaseDropdown :open="open" @update:open="open = $event">
    <template #trigger>
      <BaseButton variant="primary" :aria-label="queued ? 'Download queued playlists' : 'Download playlists'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {{ queued ? 'Queued Playlists' : 'Playlists' }}
        <svg class="playlist-chevron" :class="{ 'playlist-chevron--open': open }" width="12" height="12"
          viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
      </BaseButton>
    </template>
    <div class="playlist-menu">
      <label v-if="!queued && authStore.isLoggedIn" class="playlist-toggle">
        <input v-model="unplayedOnly" type="checkbox" class="playlist-checkbox" />
        <span>Only your unplayed maps</span>
      </label>
      <BaseButton v-for="cat in playlistCategories" :key="cat.code" size="sm" @click="download(cat.code)">
        <span :style="{ color: cat.accent }">{{ cat.name }}</span>
      </BaseButton>
    </div>
  </BaseDropdown>
</template>

<style scoped>
.playlist-chevron {
  transition: transform var(--dur-fast) var(--ease-out);
}

.playlist-chevron--open {
  transform: rotate(180deg);
}

.playlist-menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 200px;
}

.playlist-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-primary);
  cursor: pointer;
}

.playlist-checkbox {
  accent-color: var(--accent);
  cursor: pointer;
}
</style>
