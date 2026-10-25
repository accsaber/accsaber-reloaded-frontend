<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanWarParticipantResponse, ClanWarResponse, ClanWarTargeting, PublicClanResponse } from '@/types/api/clans'
import { CLAN_WAR_TARGETING_LABEL, warAim, type WarAimReason } from '@/utils/clans'
import { computed } from 'vue'
import { useWarPlaylist } from './useWarPlaylist'
import WarOptionTiles from './WarOptionTiles.vue'

const props = defineProps<{
  war: ClanWarResponse
  viewer: ClanWarParticipantResponse
  ownClan: PublicClanResponse | null
  canPush: boolean
  saving: boolean
  error: string | null
}>()

const emit = defineEmits<{
  targeting: [targeting: ClanWarTargeting]
  push: []
}>()

const REASON: Record<WarAimReason, string> = {
  commander: 'following your commander',
  pick: 'your pick',
  auto: 'auto: whoever your play hurts most',
  unpicked: 'tap someone in the roster to pick them, until then auto',
  halt: '',
}

const TARGETING_NOTE: Record<ClanWarTargeting, string> = {
  follow: 'Your commanders choose who you hit',
  auto: 'You hit whoever your play hurts most',
  manual: 'You choose who you hit',
}

const playlist = useWarPlaylist(() => props.war)
const preparing = computed(() => props.war.status === 'preparing')
const options = computed(() =>
  (Object.keys(CLAN_WAR_TARGETING_LABEL) as ClanWarTargeting[])
    .filter((key) => key !== 'manual' || props.war.ruleset === 'duel')
    .map((key) => ({ key, label: CLAN_WAR_TARGETING_LABEL[key], note: TARGETING_NOTE[key] })),
)
const aim = computed(() => warAim(props.viewer))
const down = computed(() => props.war.status === 'active' && props.viewer.guard <= 0)
</script>

<template>
  <section class="war-you" aria-label="Your targeting">
    <WarOptionTiles
      class="war-you__tiles"
      :model-value="viewer.orders?.targeting ?? 'follow'"
      :options="options"
      label="Targeting"
      :disabled="saving"
      @update:model-value="emit('targeting', $event as ClanWarTargeting)"
    />

    <p v-if="aim.reason === 'halt'" class="war-you__line war-you__line--halt">
      Your commander halted your attacks. Your plays won't hit anyone until they lift it.
      <BaseButton size="sm" :loading="saving" @click="emit('targeting', 'auto')">Switch to auto</BaseButton>
    </p>
    <p v-else class="war-you__line">
      Aiming at:
      <UserChip v-if="aim.target" :user="aim.target" size="sm" tooltip hide-clan />
      <span class="war-you__why">{{ REASON[aim.reason] }}</span>
    </p>
    <p v-if="down" class="war-you__line war-you__line--down">
      You're down. One play on a war map gets you back up and lands a hit.
    </p>

    <ol v-if="preparing" class="war-you__steps">
      <li class="war-you__step">
        <span>Download the playlist</span>
        <BaseButton size="sm" :loading="playlist.downloading.value" @click="playlist.download">Download</BaseButton>
      </li>
      <li v-if="canPush" class="war-you__step">
        <span>Push your PBs where enemies are close</span>
        <BaseButton size="sm" @click="emit('push')">Show map</BaseButton>
      </li>
      <li v-if="ownClan" class="war-you__step">
        <span>Plan with your clan</span>
        <RouterLink class="war-you__link" :to="{ name: 'clan-detail', params: { slugOrId: ownClan.slug }, query: { tab: 'chat' } }">
          Open chat
        </RouterLink>
      </li>
      <li class="war-you__step">
        <span>Read the strategy tips</span>
        <RouterLink class="war-you__link" to="/wiki/war-combat#strategy">Strategy</RouterLink>
      </li>
    </ol>

    <p v-if="playlist.error.value || error" class="war-you__error" role="alert">{{ playlist.error.value || error }}</p>
  </section>
</template>

<style scoped>
.war-you {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.war-you .war-you__tiles {
  --page-accent: var(--text-primary);
}

.war-you__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-primary);
}

.war-you__why {
  color: var(--text-secondary);
}

.war-you__line--halt {
  color: var(--warning);
}

.war-you__line--down {
  color: var(--error);
}

.war-you__steps {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.war-you__step {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm) var(--space-md);
  min-height: 48px;
  font-size: var(--text-body);
  border-bottom: 1px solid var(--bg-overlay);
}

.war-you__step:last-child {
  border-bottom: none;
}

.war-you__link {
  color: var(--page-accent, var(--accent));
}

.war-you__error {
  margin: 0;
  font-size: var(--text-body);
  color: var(--error);
}
</style>
