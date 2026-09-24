import BrewBorderFill from '@/components/cosmetics/borders/BrewBorderFill.vue'
import CandleBorderFill from '@/components/cosmetics/borders/CandleBorderFill.vue'
import ChartBorderFill from '@/components/cosmetics/borders/ChartBorderFill.vue'
import ColossusBorderFill from '@/components/cosmetics/borders/ColossusBorderFill.vue'
import ConfettiBorderFill from '@/components/cosmetics/borders/ConfettiBorderFill.vue'
import CosmicBorderFill from '@/components/cosmetics/borders/CosmicBorderFill.vue'
import DominionBorderFill from '@/components/cosmetics/borders/DominionBorderFill.vue'
import EclipseBorderFill from '@/components/cosmetics/borders/EclipseBorderFill.vue'
import GroveBorderFill from '@/components/cosmetics/borders/GroveBorderFill.vue'
import HazardBorderFill from '@/components/cosmetics/borders/HazardBorderFill.vue'
import JewelBorderFill from '@/components/cosmetics/borders/JewelBorderFill.vue'
import LaserBorderFill from '@/components/cosmetics/borders/LaserBorderFill.vue'
import PrismBorderFill from '@/components/cosmetics/borders/PrismBorderFill.vue'
import RegaliaBorderFill from '@/components/cosmetics/borders/RegaliaBorderFill.vue'
import StolenFlameBorderFill from '@/components/cosmetics/borders/StolenFlameBorderFill.vue'
import ToonBorderFill from '@/components/cosmetics/borders/ToonBorderFill.vue'
import WarpBorderFill from '@/components/cosmetics/borders/WarpBorderFill.vue'
import WoodBorderFill from '@/components/cosmetics/borders/WoodBorderFill.vue'
import type { CanvasFill } from '@/utils/items'
import type { Component } from 'vue'

export interface RimStyle {
  stroke: string
  width: number
  opacity: number
}

interface FillRenderer<F extends CanvasFill> {
  component: Component
  margin: boolean
  rim: (fill: F) => RimStyle
}

type FillRegistry = { [K in CanvasFill['type']]: FillRenderer<Extract<CanvasFill, { type: K }>> }

export const FILL_RENDERERS: FillRegistry = {
  cosmic: { component: CosmicBorderFill, margin: true, rim: (f) => ({ stroke: f.star, width: 0.8, opacity: 0.45 }) },
  toon: { component: ToonBorderFill, margin: true, rim: (f) => ({ stroke: f.line, width: 1.4, opacity: 1 }) },
  candle: { component: CandleBorderFill, margin: true, rim: (f) => ({ stroke: f.glow, width: 0.8, opacity: 0.35 }) },
  wood: { component: WoodBorderFill, margin: true, rim: (f) => ({ stroke: f.dark, width: 1, opacity: 0.7 }) },
  brew: { component: BrewBorderFill, margin: true, rim: (f) => ({ stroke: f.bone, width: 0.8, opacity: 0.5 }) },
  prism: { component: PrismBorderFill, margin: true, rim: (f) => ({ stroke: f.edge, width: 0.9, opacity: 0.5 }) },
  grove: { component: GroveBorderFill, margin: true, rim: (f) => ({ stroke: f.firefly, width: 0.8, opacity: 0.45 }) },
  regalia: { component: RegaliaBorderFill, margin: true, rim: (f) => ({ stroke: f.core ?? '#ffffff', width: 0.9, opacity: 0.55 }) },
  colossus: { component: ColossusBorderFill, margin: true, rim: (f) => ({ stroke: f.seam, width: 0.9, opacity: 0.5 }) },
  stolenflame: { component: StolenFlameBorderFill, margin: true, rim: (f) => ({ stroke: f.flame, width: 0.9, opacity: 0.5 }) },
  dominion: { component: DominionBorderFill, margin: true, rim: (f) => ({ stroke: f.body ?? '#ffffff', width: 0.9, opacity: 0.65 }) },
  eclipse: { component: EclipseBorderFill, margin: true, rim: (f) => ({ stroke: f.corona, width: 0.9, opacity: 0.5 }) },
  confetti: { component: ConfettiBorderFill, margin: false, rim: (f) => ({ stroke: f.colors[0] ?? f.dark, width: 0.8, opacity: 0.45 }) },
  jewel: { component: JewelBorderFill, margin: false, rim: (f) => ({ stroke: f.glint ?? '#ffffff', width: 0.8, opacity: 0.5 }) },
  laser: { component: LaserBorderFill, margin: false, rim: (f) => ({ stroke: f.core, width: 0.9, opacity: 0.55 }) },
  chart: { component: ChartBorderFill, margin: false, rim: (f) => ({ stroke: f.ink, width: 1, opacity: 0.7 }) },
  hazard: { component: HazardBorderFill, margin: false, rim: (f) => ({ stroke: f.a, width: 0.9, opacity: 0.6 }) },
  warp: { component: WarpBorderFill, margin: false, rim: (f) => ({ stroke: f.streak, width: 0.8, opacity: 0.45 }) },
}

export function fillRenderer<F extends CanvasFill>(fill: F): FillRenderer<F> {
  return FILL_RENDERERS[fill.type] as unknown as FillRenderer<F>
}
