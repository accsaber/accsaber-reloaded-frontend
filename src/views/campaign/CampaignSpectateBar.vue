<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { PlayerRef } from '@/types/api/common'

defineProps<{
  player: PlayerRef | null
  name: string
  userId: string | null
  loading: boolean
  error: string | null
  completed: number
  total: number
  statusLabel: string
  done: boolean
  loggedIn: boolean
}>()

const emit = defineEmits<{ stop: [] }>()
</script>

<template>
  <div class="spectate">
    <BaseButton size="sm" @click="emit('stop')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      {{ loggedIn ? 'Back to Your Run' : 'Stop Viewing' }}
    </BaseButton>

    <p class="spectate__who" role="status">
      <UserChip v-if="player" :user="player" size="xs" />
      <span v-else class="spectate__name">{{ name }}</span>
    </p>

    <span v-if="error" class="caption spectate__error">{{ error }}</span>
    <span v-else class="spectate__run" :class="{ refreshing: loading }">
      <span class="spectate__stat">{{ completed }} / {{ total }}</span>
      <span class="caption" :class="{ 'spectate__done': done }">{{ statusLabel }}</span>
    </span>

    <router-link v-if="userId" class="caption spectate__profile"
      :to="{ name: 'player-profile', params: { userId } }">
      Profile
    </router-link>
  </div>
</template>

<style scoped>
.spectate {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-md);
  min-width: 0;
  padding: var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  pointer-events: auto;
}

.spectate__who {
  display: flex;
  align-items: center;
  min-width: 0;
  margin: 0;
}

.spectate__name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spectate__run {
  display: inline-flex;
  align-items: center;
  gap: var(--space-md);
  transition: opacity var(--dur-fast) var(--ease-out);
}

.spectate__stat {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
}

.spectate__error {
  color: var(--error);
}

.spectate__done {
  color: var(--success);
}

.spectate__profile {
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease-out);
}

.spectate__profile:hover,
.spectate__profile:focus-visible {
  color: var(--page-accent);
}
</style>
