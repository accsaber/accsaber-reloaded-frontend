<script setup lang="ts">
import TitleRenderer from '@/components/cosmetics/titles/TitleRenderer.vue'
import type { PublicClanResponse } from '@/types/api/clans'
import type { TitleValue } from '@/types/api/items'
import { pickAssetUrl, readClanCosmetics } from '@/utils/items'
import { computed } from 'vue'

export type ClanTagSize = 'xs' | 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    clan: PublicClanResponse
    size?: ClanTagSize
    compact?: boolean
    effects?: boolean
  }>(),
  { size: 'md' },
)

const plain = computed(() => props.compact || props.size === 'xs')
const cosmetics = computed(() => readClanCosmetics(props.clan.equipped))
const emblemUrl = computed(() => (plain.value ? null : pickAssetUrl(cosmetics.value.emblem?.asset)))
const effectValue = computed<TitleValue | null>(() => {
  const effect = cosmetics.value.tagEffect
  if (plain.value || !props.effects || !effect) return null
  return { ...effect, text: props.clan.tag }
})
</script>

<template>
  <span class="clan-tag" :class="`clan-tag--${size}`" :title="clan.name" :aria-label="`Clan ${clan.name}`">
    <img
      v-if="emblemUrl"
      class="clan-tag__emblem"
      :src="emblemUrl"
      alt=""
      loading="lazy"
      decoding="async"
    />
    <span class="clan-tag__bracket" aria-hidden="true">[</span>
    <TitleRenderer v-if="effectValue" class="clan-tag__effect" :value="effectValue" />
    <span v-else class="clan-tag__text">{{ clan.tag }}</span>
    <span class="clan-tag__bracket" aria-hidden="true">]</span>
  </span>
</template>

<style scoped>
.clan-tag {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 1px;
  font-family: var(--font-mono);
  font-size: 0.75em;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.clan-tag__emblem {
  width: auto;
  height: 1.25em;
  margin-right: 0.3em;
  border-radius: 2px;
  object-fit: contain;
}

.clan-tag__bracket {
  color: var(--text-tertiary);
  font-weight: 400;
}

.clan-tag__text,
.clan-tag__effect {
  text-transform: uppercase;
}

.clan-tag__effect :deep(.title-renderer) {
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
}

.clan-tag--xs {
  font-size: 0.8em;
  letter-spacing: 0.02em;
}

.clan-tag--lg {
  font-size: 0.6em;
}
</style>
