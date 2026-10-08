<script setup lang="ts">
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { onAvatarError, pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import type { PlayerRef } from '@/types/api/common'
import { CLAN_ROLE_LABEL } from '@/utils/clans'
import { computed } from 'vue'

const props = defineProps<{
  member: PlayerRef
  lastPlayed: string
  self: boolean
}>()

const membership = computed(() => props.member.membership)
const role = computed(() => membership.value?.role ?? 'member')
const avatarUrl = computed(() => pickAvatarUrl(props.member))

function whole(value: number | undefined): string {
  return value == null ? '-' : Math.round(value).toLocaleString()
}
</script>

<template>
  <article class="leader" :class="[`leader--${role}`, { 'leader--self': self }]">
    <RouterLink class="leader__portrait" :to="{ name: 'player-profile', params: { userId: member.id } }" tabindex="-1">
      <img
        v-if="avatarUrl"
        class="leader__avatar"
        :src="avatarUrl"
        :alt="`${member.name} avatar`"
        loading="lazy"
        decoding="async"
        @error="onAvatarError(pickAvatarFallback(member))($event)"
      />
    </RouterLink>
    <div class="leader__body">
      <span class="leader__role">{{ CLAN_ROLE_LABEL[role] }}</span>
      <RouterLink class="leader__name" :to="{ name: 'player-profile', params: { userId: member.id } }">
        {{ member.name }}
      </RouterLink>
      <span class="leader__meta">
        <CountryFlag v-if="member.country" :country="member.country" />
        <span v-if="membership?.online" class="leader__online">online</span>
        <span v-else>played {{ lastPlayed }}</span>
      </span>
      <dl class="leader__stats">
        <div><dt>Season XP</dt><dd>{{ whole(membership?.seasonPlayXp) }}</dd></div>
        <div><dt>Hits</dt><dd>{{ whole(membership?.seasonHits) }}</dd></div>
        <div><dt>Breaks</dt><dd>{{ whole(membership?.seasonBreaks) }}</dd></div>
        <div>
          <dt>Strength</dt>
          <dd>{{ membership ? `${Math.round(membership.strengthShare * 100)}%` : '-' }}</dd>
        </div>
      </dl>
    </div>
    <div class="leader__menu"><slot /></div>
  </article>
</template>

<style scoped>
.leader {
  --portrait: 64px;
  position: relative;
  display: grid;
  grid-template-columns: var(--portrait) minmax(0, 1fr);
  align-items: start;
  gap: var(--space-md);
  min-width: 0;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  transition: border-color 150ms ease-out;
}

.leader:hover {
  border-color: var(--text-tertiary);
}

.leader--founder {
  --portrait: 168px;
  grid-column: span 2;
  grid-row: span 2;
  align-items: center;
  padding: var(--space-lg);
  border-top: 2px solid var(--clan-accent);
}

.leader--commander {
  --portrait: 96px;
  grid-column: span 2;
}

.leader--self {
  border-color: color-mix(in srgb, var(--clan-accent) 45%, var(--bg-overlay));
}

.leader__portrait {
  display: block;
  width: var(--portrait);
  height: var(--portrait);
  overflow: hidden;
  background: var(--bg-elevated);
  border-radius: var(--radius-avatar);
}

.leader__avatar {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.leader__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-right: var(--space-xl);
}

.leader__role {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--clan-accent);
}

.leader--officer .leader__role {
  color: var(--clan-accent-2);
}

.leader__name {
  overflow: hidden;
  font-size: var(--text-card-title);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  text-decoration: none;
}

.leader--founder .leader__name {
  font-size: var(--text-section-heading);
}

.leader__name:hover {
  color: var(--clan-accent);
}

.leader__meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.leader__online {
  color: var(--success);
}

.leader__stats {
  display: grid;
  grid-template-columns: repeat(4, max-content);
  justify-content: start;
  gap: var(--space-xs) var(--space-lg);
  margin: var(--space-sm) 0 0;
}

.leader--officer .leader__stats {
  grid-template-columns: repeat(2, max-content);
}

.leader__stats dt {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.leader__stats dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.leader__menu {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
}

@media (max-width: 767px) {
  .leader--founder {
    --portrait: 96px;
    grid-row: auto;
  }

  .leader--officer {
    grid-template-columns: minmax(0, 1fr);
  }

  .leader--officer .leader__body {
    padding-right: 0;
  }

  .leader__stats {
    grid-template-columns: repeat(2, auto);
  }
}
</style>
