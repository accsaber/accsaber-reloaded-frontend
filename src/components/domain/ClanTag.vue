<script setup lang="ts">
import { useTimeline } from '@/composables/useTimeline'
import type { PublicClanResponse } from '@/types/api/clans'
import type { BorderColorFill } from '@/types/api/items'
import { fillMeanLuminance } from '@/utils/cosmetics/overlayCanvas'
import { fillToCss, interpolateBorderColorState, pickInterpolatedState, readClanTagCard } from '@/utils/items'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

export type ClanTagSize = 'xs' | 'sm' | 'md' | 'lg'

const LIGHT_FILL = 0.6

const props = withDefaults(
  defineProps<{
    clan: Pick<PublicClanResponse, 'slug' | 'name' | 'tag' | 'tagColor' | 'equipped'>
    size?: ClanTagSize
    effects?: boolean
    preview?: boolean
  }>(),
  { size: 'md' },
)

const card = computed(() => readClanTagCard(props.clan.equipped))
const animated = computed(() => !!props.effects && (card.value?.states.length ?? 0) > 1)
const { tMs } = useTimeline({ active: () => animated.value })

const fill = computed<BorderColorFill | null>(() => {
  const value = card.value
  if (value) {
    return animated.value
      ? pickInterpolatedState(value, tMs.value, interpolateBorderColorState).fill
      : value.states[0].fill
  }
  return props.clan.tagColor ? { type: 'solid', hex: props.clan.tagColor } : null
})

const cardStyle = computed<Record<string, string> | undefined>(() => {
  const current = fill.value
  if (!current) return undefined
  const light = (fillMeanLuminance(current) ?? 0) > LIGHT_FILL
  return {
    '--clan-tag-bg': fillToCss(current),
    '--clan-tag-ink': light ? 'var(--clan-tag-ink-dark)' : 'var(--clan-tag-ink-light)',
  }
})
</script>

<template>
  <span v-if="preview" class="clan-tag" :class="`clan-tag--${size}`" :style="cardStyle">{{ clan.tag }}</span>
  <RouterLink v-else v-slot="{ href, navigate }" :to="{ name: 'clan-detail', params: { slugOrId: clan.slug } }" custom>
    <a
      :href="href"
      class="clan-tag"
      :class="`clan-tag--${size}`"
      :style="cardStyle"
      :title="clan.name"
      :aria-label="`Clan ${clan.name}`"
      @click.stop="navigate"
    >{{ clan.tag }}</a>
  </RouterLink>
</template>

<style scoped>
.clan-tag {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0.2em 0.5em;
  font-family: var(--font-sans);
  font-size: 0.72em;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.06em;
  text-decoration: none;
  text-transform: uppercase;
  color: var(--clan-tag-ink, var(--text-secondary));
  background: var(--clan-tag-bg, var(--bg-overlay));
  border-radius: var(--radius-pill);
  transition: color 120ms ease;
}

.clan-tag:hover,
.clan-tag:focus-visible {
  color: var(--clan-tag-ink, var(--text-primary));
}

.clan-tag:focus-visible {
  outline: 1px solid var(--page-accent, var(--accent));
  outline-offset: 2px;
}

.clan-tag--xs {
  padding: 0.1em 0.4em;
  font-size: 0.78em;
}

.clan-tag--lg {
  font-size: 0.62em;
}

@media (prefers-reduced-motion: reduce) {
  .clan-tag {
    transition: none;
  }
}
</style>
