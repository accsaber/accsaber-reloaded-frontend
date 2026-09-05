import type { Component } from 'vue'
import AuroraEffect from '@/components/cosmetics/effects/AuroraEffect.vue'
import BorderOutlineEffect from '@/components/cosmetics/effects/BorderOutlineEffect.vue'
import BramblesEffect from '@/components/cosmetics/effects/BramblesEffect.vue'
import ClawedEffect from '@/components/cosmetics/effects/ClawedEffect.vue'
import EldritchEffect from '@/components/cosmetics/effects/EldritchEffect.vue'
import EntityEffect from '@/components/cosmetics/effects/EntityEffect.vue'
import FilterEffect from '@/components/cosmetics/effects/FilterEffect.vue'
import FirefliesEffect from '@/components/cosmetics/effects/FirefliesEffect.vue'
import FireworksEffect from '@/components/cosmetics/effects/FireworksEffect.vue'
import GlowEffect from '@/components/cosmetics/effects/GlowEffect.vue'
import HauntEffect from '@/components/cosmetics/effects/HauntEffect.vue'
import HolographicEffect from '@/components/cosmetics/effects/HolographicEffect.vue'
import LabelOverlayEffect from '@/components/cosmetics/effects/LabelOverlayEffect.vue'
import MagicalOrbEffect from '@/components/cosmetics/effects/MagicalOrbEffect.vue'
import MistEffect from '@/components/cosmetics/effects/MistEffect.vue'
import NightSkyEffect from '@/components/cosmetics/effects/NightSkyEffect.vue'
import ParticleFieldEffect from '@/components/cosmetics/effects/ParticleFieldEffect.vue'
import PumpkinBashEffect from '@/components/cosmetics/effects/PumpkinBashEffect.vue'
import RaysEffect from '@/components/cosmetics/effects/RaysEffect.vue'
import ShackledEffect from '@/components/cosmetics/effects/ShackledEffect.vue'
import SnowfallEffect from '@/components/cosmetics/effects/SnowfallEffect.vue'
import WearEffect from '@/components/cosmetics/effects/WearEffect.vue'

export const EFFECT_REGISTRY: Record<string, Component> = {
  border_outline: BorderOutlineEffect,
  label_overlay: LabelOverlayEffect,
  stat_counter: LabelOverlayEffect,
  filter: FilterEffect,
  glow: GlowEffect,
  holographic: HolographicEffect,
  particles: ParticleFieldEffect,
  rays: RaysEffect,
  aurora: AuroraEffect,
  entity: EntityEffect,
  fireflies: FirefliesEffect,
  fireworks: FireworksEffect,
  snowfall: SnowfallEffect,
  night_sky: NightSkyEffect,
  wear: WearEffect,
  haunt: HauntEffect,
  mist: MistEffect,
  pumpkin_bash: PumpkinBashEffect,
  eldritch: EldritchEffect,
  clawed: ClawedEffect,
  shackled: ShackledEffect,
  brambles: BramblesEffect,
  magical_orb: MagicalOrbEffect,
}

export const ABOVE_CONTENT_TYPES = new Set(['shackled'])

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
