<script setup lang="ts">
import type { WarWipe } from '@/utils/clans'
import BaseButton from '@/components/common/BaseButton.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type {
  ClanWarParticipantResponse,
  ClanWarPoolEntryResponse,
  ClanWarResponse,
  ClanWarStrikeRulesResponse,
} from '@/types/api/clans'
import { CLAN_WAR_POOL_SOURCE_LABEL, isWarRosterOpen } from '@/utils/clans'
import { computed, defineAsyncComponent } from 'vue'
import type { WarMapBoard } from './useWarMapBoards'
import { useWarPlaylist } from './useWarPlaylist'
import WarMapRow from './WarMapRow.vue'
import WarPoolScore from './WarPoolScore.vue'
import WarSection from './WarSection.vue'
import { formatDamage, noScoreDamage } from './warStrike'

const props = defineProps<{
  war: ClanWarResponse
  pool: ClanWarPoolEntryResponse[]
  rules: ClanWarStrikeRulesResponse
  participants: ClanWarParticipantResponse[] | null
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

const WarMapBoardView = defineAsyncComponent(() => import('./WarMapBoard.vue'))

const playlist = useWarPlaylist(() => props.war)
const open = computed(() => isWarRosterOpen(props.war))

const picking = computed(() => props.war.status === 'picking')
const enemies = computed(() => new Map((props.participants ?? []).map((p) => [p.player.id, p])))

function strikeOn(entry: ClanWarPoolEntryResponse) {
  const enemy = entry.target ? enemies.value.get(entry.target.id) : undefined
  const preview = enemy?.strikePreview
  if (!enemy || !preview) return null
  const raw = entry.targetScore ? preview.damage : noScoreDamage(props.rules, preview)
  const damage = Math.min(raw, enemy.guard)
  return { damage, breaks: damage >= enemy.guard }
}

const rows = computed(() => props.pool.map((entry) => ({ entry, strike: strikeOn(entry) })))
</script>

<template>
  <WarSection>
    <template #title>
      <h2 class="war-pool__title section-title">
        Pool
        <span class="war-pool__count">{{ picking ? `${pool.length}/${war.arenaSpec.poolSize}` : `${pool.length} maps` }}</span>
      </h2>
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
      <li
        v-for="{ entry, strike } in rows"
        :id="`war-pool-${entry.difficulty.id}`"
        :key="entry.difficulty.id"
        class="war-pool__row"
      >
        <WarMapRow :difficulty="entry.difficulty">
          <span v-if="entry.viewerScore" class="war-pool__own">
            <WarPoolScore :score="entry.viewerScore" />
          </span>
          <span v-else-if="signedIn && isWarRosterOpen(war)" class="war-pool__own war-pool__own--none">Not played</span>
          <span v-if="entry.target" class="war-pool__own war-pool__own--target">
            vs
            <WarPoolScore v-if="entry.targetScore" :score="entry.targetScore" />
            <template v-else>no score</template>
            ({{ entry.target.name }})
            <span v-if="strike" class="war-pool__strike" :class="{ 'war-pool__strike--breaks': strike.breaks }">
              {{ formatDamage(strike.damage) }}{{ strike.breaks ? ', breaks' : '' }}
            </span>
            <HintTooltip
              v-if="!entry.targetPicked"
              tag="auto"
              label="auto"
              text="Auto hits whoever your play hurts most. It breaks someone if it can, otherwise it takes the biggest hit."
            />
          </span>
          <ClanTag v-if="entry.pickedBy" :clan="entry.pickedBy" size="sm" />
          <span class="war-pool__source">{{ CLAN_WAR_POOL_SOURCE_LABEL[entry.source] }}</span>
          <button
            v-if="open"
            type="button"
            class="war-pool__expand"
            :class="{ 'war-pool__expand--open': expanded === entry.difficulty.id }"
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
        <WarMapBoardView
          v-if="open && expanded === entry.difficulty.id"
          :war="war"
          :rules="rules"
          :board="boards[entry.difficulty.id]"
          :max-score="entry.difficulty.maxScore"
          :viewer="viewer"
          :wipe="wipe"
        />
      </li>
    </ul>
  </WarSection>
</template>

<style scoped>
.war-pool__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.war-pool__count {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-tertiary);
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
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-pool__error {
  margin: 0;
  font-size: var(--text-caption);
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
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-xs);
  margin-right: var(--space-sm);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-pool__own--none,
.war-pool__own--target {
  color: var(--text-tertiary);
}

.war-pool__strike {
  color: var(--text-primary);
}

.war-pool__strike--breaks {
  font-weight: 600;
  color: var(--error);
}

.war-pool__expand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease-out, border-color 120ms ease-out;
}

.war-pool__expand:hover,
.war-pool__expand--open {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.war-pool__expand svg {
  transition: transform 150ms ease-out;
}

.war-pool__expand--open svg {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .war-pool__expand,
  .war-pool__expand svg {
    transition: none;
  }
}

.war-pool__source {
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
</style>
