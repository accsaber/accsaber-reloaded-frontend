import { defineAsyncComponent, type Component } from 'vue'

const LabelOverlayEffect = defineAsyncComponent(() => import('@/components/cosmetics/effects/LabelOverlayEffect.vue'))

export const EFFECT_REGISTRY: Record<string, Component> = {
  border_outline: defineAsyncComponent(() => import('@/components/cosmetics/effects/BorderOutlineEffect.vue')),
  label_overlay: LabelOverlayEffect,
  stat_counter: LabelOverlayEffect,
  filter: defineAsyncComponent(() => import('@/components/cosmetics/effects/FilterEffect.vue')),
  glow: defineAsyncComponent(() => import('@/components/cosmetics/effects/GlowEffect.vue')),
  holographic: defineAsyncComponent(() => import('@/components/cosmetics/effects/HolographicEffect.vue')),
  particles: defineAsyncComponent(() => import('@/components/cosmetics/effects/ParticleFieldEffect.vue')),
  rays: defineAsyncComponent(() => import('@/components/cosmetics/effects/RaysEffect.vue')),
  aurora: defineAsyncComponent(() => import('@/components/cosmetics/effects/AuroraEffect.vue')),
  entity: defineAsyncComponent(() => import('@/components/cosmetics/effects/EntityEffect.vue')),
  fireflies: defineAsyncComponent(() => import('@/components/cosmetics/effects/FirefliesEffect.vue')),
  fireworks: defineAsyncComponent(() => import('@/components/cosmetics/effects/FireworksEffect.vue')),
  snowfall: defineAsyncComponent(() => import('@/components/cosmetics/effects/SnowfallEffect.vue')),
  night_sky: defineAsyncComponent(() => import('@/components/cosmetics/effects/NightSkyEffect.vue')),
  wear: defineAsyncComponent(() => import('@/components/cosmetics/effects/WearEffect.vue')),
  haunt: defineAsyncComponent(() => import('@/components/cosmetics/effects/HauntEffect.vue')),
  mist: defineAsyncComponent(() => import('@/components/cosmetics/effects/MistEffect.vue')),
  pumpkin_bash: defineAsyncComponent(() => import('@/components/cosmetics/effects/PumpkinBashEffect.vue')),
  eldritch: defineAsyncComponent(() => import('@/components/cosmetics/effects/EldritchEffect.vue')),
  clawed: defineAsyncComponent(() => import('@/components/cosmetics/effects/ClawedEffect.vue')),
  shackled: defineAsyncComponent(() => import('@/components/cosmetics/effects/ShackledEffect.vue')),
  brambles: defineAsyncComponent(() => import('@/components/cosmetics/effects/BramblesEffect.vue')),
  magical_orb: defineAsyncComponent(() => import('@/components/cosmetics/effects/MagicalOrbEffect.vue')),
}

export const ABOVE_CONTENT_TYPES = new Set(['shackled'])

export const UNDER_CONTENT_TYPES = new Set(['holographic'])

export const BLEED_TYPES = new Set([
  'aurora',
  'entity',
  'snowfall',
  'fireworks',
  'fireflies',
  'haunt',
  'pumpkin_bash',
  'eldritch',
  'brambles',
  'magical_orb',
])
