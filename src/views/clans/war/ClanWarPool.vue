<script setup lang="ts">
import type { WarWipe } from '@/utils/clans'
import BaseButton from '@/components/common/BaseButton.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type {
  ClanWarParticipantResponse,
  ClanWarPoolEntryResponse,
  ClanWarResponse,
  ClanWarStrikeRulesResponse,
} from '@/types/api/clans'
import { isWarRosterOpen } from '@/utils/clans'
import { formatAccuracy } from '@/utils/formatters'
import { computed } from 'vue'
import type { WarMapBoard } from './useWarMapBoards'
import { useWarPlaylist } from './useWarPlaylist'
import WarPoolEntry from './WarPoolEntry.vue'
import WarSection from './WarSection.vue'

const props = defineProps<{
  war: ClanWarResponse
  pool: ClanWarPoolEntryResponse[]
  rules: ClanWarStrikeRulesResponse
  canSubmitPicks: boolean
  signedIn: boolean
  viewer: ClanWarParticipantResponse | null
  expanded: string | null
  boards: Record<string, WarMapBoard>
  wipe: WarWipe | null
}>()

const emit = defineEmits<{
  'submit-picks': []
  toggle: [mapId: string]
}>()

const playlist = useWarPlaylist(() => props.war)
const open = computed(() => isWarRosterOpen(props.war))
const picking = computed(() => props.war.status === 'picking')
</script>

<template>
  <WarSection storage-key="pool">
    <template #title>
      Map pool
      <span class="war-pool__count">{{ picking ? `${pool.length}/${war.arenaSpec.poolSize}` : `${pool.length} maps` }}</span>
    </template>
    <template #actions>
      <BaseButton v-if="!picking" size="sm" :loading="playlist.downloading.value" @click="playlist.download">Download playlist</BaseButton>
    </template>

    <BaseButton
      v-if="canSubmitPicks"
      class="war-pool__cta"
      variant="primary"
      size="lg"
      @click="emit('submit-picks')"
    >
      {{ war.arenaSpec.defenderPicks ? 'Submit picks' : 'Answer offer' }}
    </BaseButton>

    <p v-if="playlist.error.value" class="war-pool__error" role="alert">{{ playlist.error.value }}</p>

    <p v-if="pool.length === 0" class="war-pool__empty">No maps to show yet.</p>
    <ul v-else class="war-pool__list">
      <li v-for="entry in pool" :id="`war-pool-${entry.difficulty.id}`" :key="entry.difficulty.id" class="war-pool__row">
        <WarPoolEntry
          :entry="entry"
          :war="war"
          :rules="rules"
          :viewer="viewer"
          :expanded="expanded"
          :boards="boards"
          :wipe="wipe"
          :expandable="open"
          @toggle="emit('toggle', $event)"
        >
          <span v-if="entry.viewerScore" class="war-pool__own">
            Your PB {{ formatAccuracy(entry.viewerScore.accuracy) }} · {{ Math.round(entry.viewerScore.ap) }} AP
          </span>
          <span v-else-if="signedIn && open" class="war-pool__own">Not played</span>
          <ClanTag v-if="entry.pickedBy" :clan="entry.pickedBy" size="sm" />
        </WarPoolEntry>
      </li>
    </ul>
  </WarSection>
</template>

<style scoped>
.war-pool__count {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-secondary);
}

.war-pool__cta {
  --accent: var(--warning);
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  font-size: 1.25rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  animation: war-pool-cta 1.6s ease-in-out infinite;
}

@keyframes war-pool-cta {
  50% {
    background: color-mix(in srgb, var(--warning) 22%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .war-pool__cta {
    animation: none;
  }
}

.war-pool__empty {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.war-pool__error {
  margin: 0;
  font-size: var(--text-body);
  color: var(--error);
}

.war-pool__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.war-pool__row {
  scroll-margin-top: calc(var(--navbar-height) + var(--space-md));
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.war-pool__row:last-child {
  border-bottom: none;
}

.war-pool__row:nth-child(even) {
  background: var(--bg-elevated);
}

.war-pool__own {
  font-size: var(--text-body);
  color: var(--text-secondary);
}
</style>
