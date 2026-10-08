<script setup lang="ts">
import BorderDecals from '@/components/cosmetics/borders/BorderDecals.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import type { PublicClanResponse } from '@/types/api/clans'
import type { BorderShapePathValue, ClanTagCap, ClanTagDecal } from '@/types/api/items'
import { fillMeanLuminance } from '@/utils/cosmetics/overlayCanvas'
import { annotateEffectLayerStacks, readClanEquipped, readClanTagCardValue, valueFxLayers } from '@/utils/items'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

export type ClanTagSize = 'xs' | 'sm' | 'md' | 'lg'

const LIGHT_FILL = 0.6
const HEIGHT_EM = 1.55

const props = withDefaults(
  defineProps<{
    clan: Pick<PublicClanResponse, 'slug' | 'name' | 'tag' | 'tagColor' | 'equipped'>
    size?: ClanTagSize
    effects?: boolean
    preview?: boolean
  }>(),
  { size: 'md' },
)

const card = computed(() => readClanEquipped(props.clan.equipped, 'clan_tag_card', readClanTagCardValue))
const fx = computed(() =>
  props.effects && (props.size === 'lg' || props.preview) ? annotateEffectLayerStacks(valueFxLayers(card.value)) : [],
)

function capWidthEm(cap: ClanTagCap | undefined): number {
  if (!cap) return 0
  const [, , w, h] = cap.viewBox.split(/[\s,]+/).map(Number)
  return h > 0 ? (w / h) * HEIGHT_EM : 0
}

function pathStyle(path: BorderShapePathValue): Record<string, string | number | undefined> {
  return {
    fill: path.fill ?? 'none',
    stroke: path.stroke,
    strokeWidth: path.strokeWidth,
    strokeLinecap: path.strokeLinecap,
    strokeLinejoin: path.strokeLinejoin,
    fillOpacity: path.fillOpacity,
    strokeOpacity: path.strokeOpacity,
  }
}

function decalStyle(decal: ClanTagDecal): Record<string, string> {
  const x = `${decal.xEm ?? 0}em`
  const left = decal.anchor === 'left' ? x : decal.anchor === 'right' ? `calc(100% + ${x})` : `calc(50% + ${x})`
  return { left, top: `${decal.yEm ?? 0}em`, width: `${decal.sizeEm}em`, height: `${decal.sizeEm}em` }
}

function overhangEm(anchor: 'left' | 'right'): number {
  const sign = anchor === 'left' ? -1 : 1
  return (card.value?.decals ?? [])
    .filter((d) => d.anchor === anchor)
    .reduce((max, d) => Math.max(max, sign * (d.xEm ?? 0) + d.sizeEm / 2), 0)
}

function asBorderDecal(decal: ClanTagDecal) {
  return { ...decal, xPct: 50, yPct: 50, sizePct: 100 }
}

const style = computed<Record<string, string> | undefined>(() => {
  const vars: Record<string, string> = {}
  const color = props.clan.tagColor
  if (color) {
    vars['--clan-tag-bg'] = color
    const light = (fillMeanLuminance({ type: 'solid', hex: color }) ?? 0) > LIGHT_FILL
    vars['--clan-tag-ink'] = light ? 'var(--clan-tag-ink-dark)' : 'var(--clan-tag-ink-light)'
  }
  if (card.value?.left) vars['--clan-tag-cap-l'] = `${capWidthEm(card.value.left)}em`
  if (card.value?.right) vars['--clan-tag-cap-r'] = `${capWidthEm(card.value.right)}em`
  if (card.value?.decals?.length) {
    vars['--clan-tag-out-l'] = `${overhangEm('left')}em`
    vars['--clan-tag-out-r'] = `${overhangEm('right')}em`
  }
  return Object.keys(vars).length ? vars : undefined
})
</script>

<template>
  <component
    :is="preview ? 'span' : RouterLink"
    v-bind="preview ? {} : { to: { name: 'clan-detail', params: { slugOrId: clan.slug } }, title: clan.name, 'aria-label': `Clan ${clan.name}` }"
    class="clan-tag"
    :class="[`clan-tag--${size}`, { 'clan-tag--shaped': card }]"
    :style="style"
    @click.stop
  >
    <span v-if="card" class="clan-tag__shape" aria-hidden="true">
      <svg v-if="card.left" class="clan-tag__cap" :viewBox="card.left.viewBox" preserveAspectRatio="xMaxYMid meet">
        <path v-for="(p, i) in card.left.paths" :key="i" :d="p.d" :transform="p.transform" :style="pathStyle(p)" />
      </svg>
      <span class="clan-tag__body" />
      <svg v-if="card.right" class="clan-tag__cap" :viewBox="card.right.viewBox" preserveAspectRatio="xMinYMid meet">
        <path v-for="(p, i) in card.right.paths" :key="i" :d="p.d" :transform="p.transform" :style="pathStyle(p)" />
      </svg>
    </span>
    <span
      v-for="(decal, i) in card?.decals ?? []"
      :key="`d${i}`"
      class="clan-tag__decal"
      :style="decalStyle(decal)"
      aria-hidden="true"
    >
      <BorderDecals :decals="[asBorderDecal(decal)]" />
    </span>
    <span class="clan-tag__text">{{ clan.tag }}</span>
    <ModifierCompositions
      v-for="layer in fx"
      :key="layer.key"
      :spec="layer.spec"
      type-key="clan_tag_card"
      measure-selector=".clan-tag__text"
      :stack-index="layer.stackIndex"
      hide-stat-counters
    />
  </component>
</template>

<style scoped>
.clan-tag {
  position: relative;
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

.clan-tag--shaped {
  isolation: isolate;
  padding-left: calc(var(--clan-tag-cap-l, 0.35em) + 0.15em);
  padding-right: calc(var(--clan-tag-cap-r, 0.35em) + 0.15em);
  margin-inline: var(--clan-tag-out-l, 0) var(--clan-tag-out-r, 0);
  background: none;
  border-radius: 0;
}

.clan-tag__shape {
  position: absolute;
  inset: 0;
  z-index: -1;
  display: flex;
  color: var(--clan-tag-bg, var(--bg-overlay));
}

.clan-tag__cap {
  flex-shrink: 0;
  width: auto;
  height: 100%;
  overflow: visible;
}

.clan-tag__body {
  flex: 1;
  background: currentColor;
}

.clan-tag__decal {
  position: absolute;
  transform: translate(-50%, 0);
  pointer-events: none;
}

.clan-tag__text {
  position: relative;
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
  padding-block: 0.1em;
  font-size: 0.78em;
}

.clan-tag--xs:not(.clan-tag--shaped) {
  padding-inline: 0.4em;
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
