<script setup lang="ts">
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
  pct: number
  statusLabel: string
  done: boolean
  loggedIn: boolean
}>()

const emit = defineEmits<{ stop: [] }>()
</script>

<template>
  <div class="spectate">
    <button type="button" class="spectate__back" @click="emit('stop')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      {{ loggedIn ? 'Back to your run' : 'Stop viewing' }}
    </button>

    <span class="spectate__rule" aria-hidden="true" />

    <p class="spectate__who" role="status">
      <UserChip v-if="player" :user="player" size="xs" />
      <span v-else class="spectate__name">{{ name }}</span>
    </p>

    <span v-if="loading" class="spectate__note">Loading run</span>
    <span v-else-if="error" class="spectate__note spectate__note--error">{{ error }}</span>
    <template v-else>
      <span class="spectate__stat">
        {{ completed }}<span class="spectate__slash">/</span>{{ total }}
      </span>
      <span class="spectate__stat spectate__stat--muted">{{ pct }}%</span>
      <span class="spectate__pill" :class="{ 'spectate__pill--done': done }">{{ statusLabel }}</span>
    </template>

    <router-link v-if="userId" class="spectate__profile" :to="{ name: 'player-profile', params: { userId } }">
      Profile
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="8 7 17 7 17 16" />
      </svg>
    </router-link>
  </div>
</template>

<style scoped>
.spectate {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  padding: 5px var(--space-sm) 5px 6px;
  background: var(--bg-surface);
  border: 1px solid color-mix(in srgb, var(--page-accent) 45%, var(--bg-overlay));
  border-radius: var(--radius-card);
  pointer-events: auto;
}

.spectate__back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 3px 7px 3px 5px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease;
}

.spectate__back:hover,
.spectate__back:focus-visible {
  outline: none;
  color: var(--text-primary);
  border-color: var(--bg-overlay);
}

.spectate__rule {
  width: 1px;
  height: 18px;
  flex-shrink: 0;
  background: var(--bg-overlay);
}

.spectate__who {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin: 0;
}

.spectate__name {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spectate__stat {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.spectate__stat--muted {
  color: var(--text-secondary);
}

.spectate__slash {
  padding: 0 1px;
  color: var(--text-tertiary);
}

.spectate__note {
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.spectate__note--error {
  color: var(--error);
}

.spectate__pill {
  flex-shrink: 0;
  padding: 2px 6px;
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.spectate__pill--done {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 45%, transparent);
}

.spectate__profile {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  text-decoration: none;
  transition: color 120ms ease;
}

.spectate__profile:hover,
.spectate__profile:focus-visible {
  color: var(--page-accent);
}

@media (max-width: 860px) {
  .spectate {
    flex-wrap: wrap;
    row-gap: var(--space-xs);
  }

  .spectate__rule {
    display: none;
  }
}
</style>
