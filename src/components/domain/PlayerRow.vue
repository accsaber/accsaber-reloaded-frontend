<script setup lang="ts">
import type { PlayerDisplay } from '@/types/display'
import { getRankClass } from '@/utils/ranking'
import CountryFlag from './CountryFlag.vue'

defineProps<{
  player: PlayerDisplay
  showAccuracy?: boolean
  showRankedPlays?: boolean
}>()
</script>

<template>
  <div class="player-row">
    <span class="player-row__rank" :class="getRankClass(player.rank)">
      #{{ player.rank }}
    </span>
    <img class="player-row__avatar" :src="player.avatarUrl" :alt="player.name" loading="lazy" />
    <span class="player-row__name">
      {{ player.name }}
      <CountryFlag :country="player.country" />
    </span>
    <span class="player-row__ap">{{ player.ap.toFixed(2) }} AP</span>
    <span v-if="showAccuracy && player.avgAccuracy != null" class="player-row__stat">
      {{ (player.avgAccuracy * 100).toFixed(2) }}%
    </span>
    <span v-if="showRankedPlays && player.rankedPlays != null" class="player-row__stat">
      {{ player.rankedPlays }} plays
    </span>
  </div>
</template>

<style scoped>
.player-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
}

.player-row__rank {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
}

.player-row__avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  flex-shrink: 0;
}

.player-row__name {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-row__ap {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  white-space: nowrap;
}

.player-row__stat {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
