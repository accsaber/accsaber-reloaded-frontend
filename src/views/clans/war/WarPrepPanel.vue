<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import type { ClanWarParticipantResponse, ClanWarResponse, PublicClanResponse } from '@/types/api/clans'
import { computed } from 'vue'
import { useWarPlaylist } from './useWarPlaylist'
import WarSection from './WarSection.vue'

const props = defineProps<{
  war: ClanWarResponse
  viewer: ClanWarParticipantResponse | null
  ownClan: PublicClanResponse | null
  canPush: boolean
}>()

const emit = defineEmits<{
  pick: []
  push: []
}>()

const playlist = useWarPlaylist(() => props.war)
const canPick = computed(() => !!props.viewer && props.war.ruleset === 'duel')
</script>

<template>
  <WarSection title="Prep">
    <ol class="war-prep__steps">
      <li v-if="canPick" class="war-prep__step">
        <span class="war-prep__label">
          Pick a target or leave it on auto
          <span class="war-prep__state">{{ viewer?.target?.name ?? 'auto' }}</span>
        </span>
        <BaseButton size="sm" @click="emit('pick')">Pick target</BaseButton>
      </li>
      <li class="war-prep__step">
        <span class="war-prep__label">Download the playlist</span>
        <BaseButton size="sm" :loading="playlist.downloading.value" @click="playlist.download">Download playlist</BaseButton>
      </li>
      <li v-if="canPush" class="war-prep__step">
        <span class="war-prep__label">Push your PBs where enemies are close</span>
        <BaseButton size="sm" @click="emit('push')">Show map</BaseButton>
      </li>
      <li v-if="ownClan" class="war-prep__step">
        <span class="war-prep__label">Plan with your clan</span>
        <RouterLink class="war-prep__link" :to="{ name: 'clan-detail', params: { slugOrId: ownClan.slug }, query: { tab: 'chat' } }">
          Open chat
        </RouterLink>
      </li>
      <li class="war-prep__step">
        <span class="war-prep__label">Read the strategy tips</span>
        <RouterLink class="war-prep__link" to="/wiki/war-combat#strategy">Strategy</RouterLink>
      </li>
    </ol>
    <p v-if="playlist.error.value" class="war-prep__error" role="alert">{{ playlist.error.value }}</p>
  </WarSection>
</template>

<style scoped>
.war-prep__steps {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}

.war-prep__step {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm) var(--space-md);
  min-height: 48px;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--bg-overlay);
  counter-increment: step;
}

.war-prep__step:last-child {
  border-bottom: none;
}

.war-prep__label {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
}

.war-prep__label::before {
  content: counter(step);
  min-width: 2ch;
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}

.war-prep__state {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-prep__link {
  font-size: var(--text-body);
  color: var(--page-accent, var(--accent));
}

.war-prep__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}
</style>
