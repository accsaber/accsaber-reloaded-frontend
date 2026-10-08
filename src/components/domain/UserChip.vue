<script setup lang="ts">
import ClanTag from '@/components/domain/ClanTag.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import PlayerTooltipTrigger from '@/components/domain/PlayerTooltipTrigger.vue'
import SupporterTierIcon from '@/components/domain/SupporterTierIcon.vue'
import { onAvatarError, pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import type { UserRefDisplay } from '@/types/display'
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

export type UserChipSize = 'xs' | 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    user: UserRefDisplay
    link?: boolean
    compact?: boolean
    size?: UserChipSize
    tooltip?: boolean
    hideAvatar?: boolean
    nameTag?: string
    clanEffects?: boolean
    hideClan?: boolean
  }>(),
  { size: 'md', nameTag: 'span' },
)

const avatarUrl = computed(() => pickAvatarUrl(props.user))
const avatarFallback = computed(() => pickAvatarFallback(props.user))
const profileRoute = computed<RouteLocationRaw | undefined>(() =>
  props.link ? { name: 'player-profile', params: { userId: props.user.id } } : undefined,
)
const root = computed(() => {
  if (props.tooltip) return { is: PlayerTooltipTrigger, bind: { user: props.user, to: profileRoute.value } }
  if (props.link) return { is: RouterLink, bind: { to: profileRoute.value } }
  return { is: 'span', bind: {} }
})
const iconSize = computed(() => (props.size === 'lg' ? 16 : props.size === 'xs' ? 12 : 14))
</script>

<template>
  <component
    :is="root.is"
    v-bind="root.bind"
    class="user-chip"
    :class="[`user-chip--${size}`, { 'user-chip--link': link, 'user-chip--compact': compact }]"
  >
    <template v-if="!hideAvatar">
      <img
        v-if="avatarUrl"
        class="user-chip__avatar"
        :src="avatarUrl"
        :alt="`${user.name} avatar`"
        loading="lazy"
        decoding="async"
        @error="onAvatarError(avatarFallback)($event)"
      />
      <span v-else class="user-chip__avatar user-chip__avatar--blank" aria-hidden="true" />
    </template>
    <component :is="nameTag" class="user-chip__name" :title="user.name">{{ user.name }}</component>
    <ClanTag v-if="user.clan && !hideClan" :clan="user.clan" :size="size" :effects="clanEffects" />
    <CountryFlag v-if="user.country" class="user-chip__flag" :country="user.country" />
    <SupporterTierIcon v-if="user.supporterTier" :tier="user.supporterTier" :size="iconSize" />
    <slot />
  </component>
</template>

<style scoped>
.user-chip {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  max-width: 100%;
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
}

.user-chip__avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  background: var(--bg-overlay);
}

.user-chip__name {
  margin: 0;
  min-width: 0;
  font: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-chip__flag {
  flex-shrink: 0;
}

.user-chip--xs {
  gap: var(--space-xs);
  font-size: var(--text-caption);
}

.user-chip--xs .user-chip__avatar {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-btn);
}

.user-chip--sm .user-chip__avatar {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-card);
}

.user-chip--lg {
  font-size: var(--text-card-title);
  font-weight: 600;
}

.user-chip--lg .user-chip__avatar {
  width: 40px;
  height: 40px;
}

.user-chip--compact {
  color: var(--text-secondary);
}

.user-chip--link {
  cursor: pointer;
}

.user-chip--link .user-chip__name {
  transition: color 120ms ease;
}

.user-chip--link:hover .user-chip__name,
.user-chip--link:focus-visible .user-chip__name {
  color: var(--page-accent, var(--accent));
}

.user-chip--link:focus-visible {
  outline: 1px solid var(--page-accent, var(--accent));
  outline-offset: 2px;
  border-radius: var(--radius-btn);
}

@media (prefers-reduced-motion: reduce) {
  .user-chip--link .user-chip__name {
    transition: none;
  }
}
</style>
