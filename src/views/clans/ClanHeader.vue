<script setup lang="ts">
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import type { ClanResponse, ClanStandingResponse } from '@/types/api/clans'
import { formatStanding } from '@/utils/clans'
import { annotateEffectLayerStacks, pickAssetUrl, pickVideoOrAssetUrl, readBackgroundValue, readClanEquipped, valueFxLayers } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  clan: ClanResponse
  standing: ClanStandingResponse | null
}>()

const banner = computed(() => readClanEquipped(props.clan.clan.equipped, 'clan_banner', readBackgroundValue))
const bannerUrl = computed(() => pickVideoOrAssetUrl(banner.value?.asset))
const bannerIsVideo = computed(() => !!banner.value?.asset.video)
const bannerImageUrl = computed(() => pickAssetUrl(banner.value?.asset))
const bannerStyle = computed<Record<string, string> | undefined>(() => {
  const value = banner.value
  if (!value) return undefined
  const style: Record<string, string> = {}
  if (value.opacity != null) style.opacity = String(value.opacity)
  if (value.blendMode) style.mixBlendMode = value.blendMode
  return style
})
const bannerFx = computed(() => annotateEffectLayerStacks(valueFxLayers(banner.value)))
const bannerFitClass = computed(() => (banner.value?.fit ? `clan-header__banner--${banner.value.fit}` : ''))

const founded = computed(() =>
  new Date(props.clan.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
)
</script>

<template>
  <header class="clan-header">
    <div class="clan-header__band" :class="{ 'clan-header__band--plain': !bannerUrl }">
      <template v-if="bannerUrl">
        <video
          v-if="bannerIsVideo"
          class="clan-header__banner"
          :class="bannerFitClass"
          :src="bannerUrl"
          :style="bannerStyle"
          autoplay
          loop
          muted
          playsinline
          aria-hidden="true"
        />
        <div
          v-else-if="bannerImageUrl"
          class="clan-header__banner"
          :class="bannerFitClass"
          :style="{ ...bannerStyle, backgroundImage: `url(${bannerImageUrl})` }"
          aria-hidden="true"
        />
        <span v-if="bannerFx.length" class="clan-header__fx" aria-hidden="true">
          <ModifierCompositions
            v-for="layer in bannerFx"
            :key="layer.key"
            :spec="layer.spec"
            type-key="clan_banner"
            :stack-index="layer.stackIndex"
            hide-stat-counters
          />
        </span>
      </template>
      <div class="clan-header__top">
        <slot name="top" />
      </div>
    </div>

    <div class="clan-header__identity">
      <ClanIcon :clan="clan.clan" :size="120" class="clan-header__icon" />
      <div class="clan-header__titles">
        <h1 class="clan-header__title">
          <ClanTag :clan="clan.clan" size="lg" effects class="clan-header__tag" />
          <ClanName class="clan-header__name" :clan="clan.clan" />
        </h1>
        <p v-if="clan.description" class="clan-header__description">{{ clan.description }}</p>
      </div>
      <div class="clan-header__actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="clan-header__stats">
      <StatBlock label="Level" :value="clan.level.level" :decimals="0" />
      <StatBlock label="Rank" :value="standing ? `#${standing.rank}` : '-'" />
      <StatBlock label="Standing" :value="formatStanding(clan.standing)" />
      <StatBlock label="Members" :value="`${clan.memberCount} / ${clan.memberCap}`" />
    </div>
    <p class="clan-header__founded">Est. {{ founded }}</p>
  </header>
</template>

<style scoped>
.clan-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.clan-header__band {
  position: relative;
  height: 280px;
  margin: calc(-1 * var(--space-xl)) calc(-1 * var(--space-xl)) 0;
  overflow: hidden;
}

.clan-header__fx {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.clan-header__band--plain {
  height: 140px;
  background: color-mix(in oklch, var(--clan-accent) 45%, var(--bg-base));
}

.clan-header__banner {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  object-fit: cover;
  -webkit-mask-image: linear-gradient(to bottom, black 55%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 55%, transparent 100%);
}

.clan-header__banner--contain {
  background-size: contain;
  object-fit: contain;
}

.clan-header__banner--tile {
  background-size: auto;
  background-repeat: repeat;
}

.clan-header__banner--center {
  background-size: auto;
  object-fit: none;
}

.clan-header__top {
  position: relative;
  padding: var(--space-md) var(--space-xl);
}

.clan-header__identity {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: var(--space-lg);
  margin-top: -64px;
  min-width: 0;
}

.clan-header__icon {
  background: var(--bg-base);
  border-radius: var(--radius-avatar);
}

.clan-header__titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
  padding-bottom: var(--space-xs);
}

.clan-header__actions {
  flex-shrink: 0;
  padding-bottom: var(--space-sm);
}

.clan-header__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
  margin: 0;
  min-width: 0;
  font-size: calc(var(--text-page-title) * 1.35);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.clan-header__tag {
  font-size: 0.55em;
}

.clan-header__name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.clan-header__description {
  margin: 0;
  max-width: 65ch;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

.clan-header__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--bg-overlay);
  border-bottom: 1px solid var(--bg-overlay);
}

.clan-header__stats > * + * {
  border-inline-start: 1px solid var(--bg-overlay);
}

.clan-header__founded {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

@media (max-width: 767px) {
  .clan-header__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .clan-header__stats > * + * {
    border-inline-start: none;
  }

  .clan-header__stats > :nth-child(even) {
    border-inline-start: 1px solid var(--bg-overlay);
  }

  .clan-header__stats > :nth-child(n + 3) {
    border-block-start: 1px solid var(--bg-overlay);
  }

  .clan-header__band {
    height: 200px;
    margin: calc(-1 * var(--space-md)) calc(-1 * var(--space-md)) 0;
  }

  .clan-header__band--plain {
    height: 112px;
  }

  .clan-header__top {
    padding: var(--space-sm) var(--space-md);
  }

  .clan-header__identity {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--space-md);
    margin-top: -48px;
  }

  .clan-header__icon {
    width: 88px !important;
    height: 88px !important;
  }

  .clan-header__titles {
    flex-basis: 100%;
  }

  .clan-header__actions {
    position: absolute;
    top: 56px;
    right: 0;
  }

  .clan-header__title {
    font-size: var(--text-page-title);
  }
}
</style>
