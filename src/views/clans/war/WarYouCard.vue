<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanWarParticipantResponse, ClanWarResponse, ClanWarTargeting, PublicClanResponse } from '@/types/api/clans'
import { CLAN_WAR_TARGETING_LABEL, warAim, type WarAimReason } from '@/utils/clans'
import { computed } from 'vue'
import { useWarPlaylist } from './useWarPlaylist'

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
  commander: 'your commander picked them',
  pick: '',
  auto: 'whoever your play does the most damage to',
  unpicked: 'whoever your play does the most damage to, until you pick someone in Fighters',
  halt: '',
}

const playlist = useWarPlaylist(() => props.war)
const preparing = computed(() => props.war.status === 'preparing')
const options = computed(() =>
  (Object.keys(CLAN_WAR_TARGETING_LABEL) as ClanWarTargeting[])
    .filter((key) => key !== 'manual' || props.war.ruleset === 'duel')
    .map((key) => ({ key, label: CLAN_WAR_TARGETING_LABEL[key] })),
)
const aim = computed(() => warAim(props.viewer))
const waiting = computed(() => (props.viewer.orders?.targeting ?? 'follow') === 'follow' && aim.value.reason === 'auto')
const down = computed(() => props.war.status === 'active' && props.viewer.guard <= 0)
</script>

<template>
  <section class="war-you" aria-label="Your targeting">
    <div class="war-you__aim">
      <BaseTabs
        variant="segmented"
        label="Targeting"
        :tabs="options"
        :model-value="viewer.orders?.targeting ?? 'follow'"
        :disabled-keys="saving ? options.map((o) => o.key) : []"
        @update:model-value="emit('targeting', $event as ClanWarTargeting)"
      />
      <p v-if="aim.reason === 'halt'" class="war-you__line war-you__line--halt">
        Your commander halted your attacks
        <BaseButton :loading="saving" @click="emit('targeting', 'auto')">Switch to Auto</BaseButton>
      </p>
      <p v-else class="war-you__line">
        You hit
        <UserChip v-if="aim.target" :user="aim.target" size="sm" tooltip hide-clan />
        <span class="war-you__why">{{ waiting ? 'no order yet, so ' : '' }}{{ REASON[aim.reason] }}</span>
      </p>
    </div>
    <p v-if="down" class="war-you__line war-you__line--down">
      You are broken. One play on a war map brings you back and hits
    </p>

    <ol v-if="preparing" class="war-you__steps">
      <li class="war-you__step">
        <span>Download the playlist</span>
        <BaseButton :loading="playlist.downloading.value" @click="playlist.download">Download</BaseButton>
      </li>
      <li v-if="canPush" class="war-you__step">
        <span>Push your PBs where enemies are close</span>
        <BaseButton @click="emit('push')">Show Map</BaseButton>
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
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.war-you__aim {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-lg);
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
