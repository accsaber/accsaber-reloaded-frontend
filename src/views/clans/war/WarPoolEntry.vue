<script setup lang="ts">
import type {
  ClanWarParticipantResponse,
  ClanWarPoolEntryResponse,
  ClanWarResponse,
  ClanWarStrikeRulesResponse,
} from '@/types/api/clans'
import type { WarWipe } from '@/utils/clans'
import { defineAsyncComponent } from 'vue'
import type { WarMapBoard } from './useWarMapBoards'
import WarMapRow from './WarMapRow.vue'

defineProps<{
  entry: ClanWarPoolEntryResponse
  war: ClanWarResponse
  rules: ClanWarStrikeRulesResponse
  viewer: ClanWarParticipantResponse | null
  expanded: string | null
  boards: Record<string, WarMapBoard>
  wipe: WarWipe | null
  expandable: boolean
  link?: boolean
}>()

const emit = defineEmits<{
  toggle: [mapId: string]
}>()

const WarMapBoardView = defineAsyncComponent(() => import('./WarMapBoard.vue'))
</script>

<template>
  <WarMapRow :difficulty="entry.difficulty" plain>
    <slot />
    <button
      v-if="expandable && !link"
      type="button"
      class="war-entry__expand"
      :aria-expanded="expanded === entry.difficulty.id"
      :aria-label="`War leaderboard for ${entry.difficulty.songName}`"
      @click="emit('toggle', entry.difficulty.id)"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  </WarMapRow>
  <slot name="below" />
  <button
    v-if="expandable && link"
    type="button"
    class="war-entry__link"
    :aria-expanded="expanded === entry.difficulty.id"
    @click="emit('toggle', entry.difficulty.id)"
  >
    {{ expanded === entry.difficulty.id ? 'Hide leaderboard' : 'Full leaderboard' }}
  </button>
  <WarMapBoardView
    v-if="expandable && expanded === entry.difficulty.id && entry.difficulty.maxScore != null"
    :war="war"
    :rules="rules"
    :board="boards[entry.difficulty.id]"
    :max-score="entry.difficulty.maxScore"
    :viewer="viewer"
    :wipe="wipe"
  />
</template>

<style scoped>
.war-entry__expand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: color 120ms ease-out, border-color 120ms ease-out;
}

.war-entry__expand:hover,
.war-entry__expand[aria-expanded='true'] {
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.war-entry__link {
  align-self: flex-start;
  padding: 0;
  font: inherit;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
}

.war-entry__link:hover {
  color: var(--text-primary);
}

.war-entry__expand svg {
  transition: transform 150ms ease-out;
}

.war-entry__expand[aria-expanded='true'] svg {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .war-entry__expand,
  .war-entry__expand svg {
    transition: none;
  }
}
</style>
