import type { CanvasFill } from '@/utils/cosmetics/interpolate'
import { defineAsyncComponent, type Component } from 'vue'

const BrewBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/BrewBorderFill.vue'))
const CandleBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/CandleBorderFill.vue'))
const ChartBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/ChartBorderFill.vue'))
const ColossusBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/ColossusBorderFill.vue'))
const ConfettiBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/ConfettiBorderFill.vue'))
const CosmicBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/CosmicBorderFill.vue'))
const DominionBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/DominionBorderFill.vue'))
const EclipseBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/EclipseBorderFill.vue'))
const GroveBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/GroveBorderFill.vue'))
const HazardBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/HazardBorderFill.vue'))
const JewelBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/JewelBorderFill.vue'))
const KnitBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/KnitBorderFill.vue'))
const LaserBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/LaserBorderFill.vue'))
const LightsBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/LightsBorderFill.vue'))
const PrismBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/PrismBorderFill.vue'))
const RegaliaBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/RegaliaBorderFill.vue'))
const StarshineAura = defineAsyncComponent(() => import('@/components/cosmetics/borders/StarshineAura.vue'))
const StarshineBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/StarshineBorderFill.vue'))
const StolenFlameBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/StolenFlameBorderFill.vue'))
const ToonBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/ToonBorderFill.vue'))
const WarpBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/WarpBorderFill.vue'))
const WoodBorderFill = defineAsyncComponent(() => import('@/components/cosmetics/borders/WoodBorderFill.vue'))

export interface RimStyle {
  stroke: string
  width: number
  opacity: number
}

interface FillRenderer<F extends CanvasFill> {
  component: Component
  margin: boolean
  aura?: Component
  trace?: 'shape' | 'wall'
  rim: (fill: F) => RimStyle
}

type FillRegistry = { [K in CanvasFill['type']]: FillRenderer<Extract<CanvasFill, { type: K }>> }

export const FILL_RENDERERS: FillRegistry = {
  cosmic: { component: CosmicBorderFill, margin: true, rim: (f) => ({ stroke: f.star, width: 0.8, opacity: 0.45 }) },
  toon: { component: ToonBorderFill, margin: true, rim: (f) => ({ stroke: f.line, width: 1.4, opacity: 1 }) },
  candle: { component: CandleBorderFill, margin: true, trace: 'wall', rim: (f) => ({ stroke: f.glow, width: 0.8, opacity: 0.35 }) },
  wood: { component: WoodBorderFill, margin: true, rim: (f) => ({ stroke: f.dark, width: 1, opacity: 0.7 }) },
  knit: { component: KnitBorderFill, margin: true, rim: (f) => ({ stroke: f.shade, width: 1, opacity: 0.7 }) },
  brew: { component: BrewBorderFill, margin: true, rim: (f) => ({ stroke: f.bone, width: 0.8, opacity: 0.5 }) },
  prism: { component: PrismBorderFill, margin: true, rim: (f) => ({ stroke: f.edge, width: 0.9, opacity: 0.5 }) },
  grove: { component: GroveBorderFill, margin: true, rim: (f) => ({ stroke: f.firefly, width: 0.8, opacity: 0.45 }) },
  regalia: { component: RegaliaBorderFill, margin: true, rim: (f) => ({ stroke: f.core ?? '#ffffff', width: 0.9, opacity: 0.55 }) },
  colossus: { component: ColossusBorderFill, margin: true, rim: (f) => ({ stroke: f.seam, width: 0.9, opacity: 0.5 }) },
  stolenflame: { component: StolenFlameBorderFill, margin: true, rim: (f) => ({ stroke: f.flame, width: 0.9, opacity: 0.5 }) },
  dominion: { component: DominionBorderFill, margin: true, rim: (f) => ({ stroke: f.body ?? '#ffffff', width: 0.9, opacity: 0.65 }) },
  eclipse: { component: EclipseBorderFill, margin: true, rim: (f) => ({ stroke: f.corona, width: 0.9, opacity: 0.5 }) },
  starshine: { component: StarshineBorderFill, margin: true, aura: StarshineAura, trace: 'wall', rim: (f) => ({ stroke: f.glint, width: 0.8, opacity: 0.5 }) },
  lights: { component: LightsBorderFill, margin: true, trace: 'wall', rim: (f) => ({ stroke: f.wire, width: 0.8, opacity: 0.6 }) },
  confetti: { component: ConfettiBorderFill, margin: false, rim: (f) => ({ stroke: f.colors[0] ?? f.dark, width: 0.8, opacity: 0.45 }) },
  jewel: { component: JewelBorderFill, margin: false, rim: (f) => ({ stroke: f.glint ?? '#ffffff', width: 0.8, opacity: 0.5 }) },
  laser: { component: LaserBorderFill, margin: false, trace: 'shape', rim: (f) => ({ stroke: f.core, width: 0.9, opacity: 0.55 }) },
  chart: { component: ChartBorderFill, margin: false, rim: (f) => ({ stroke: f.ink, width: 1, opacity: 0.7 }) },
  hazard: { component: HazardBorderFill, margin: false, rim: (f) => ({ stroke: f.a, width: 0.9, opacity: 0.6 }) },
  warp: { component: WarpBorderFill, margin: false, rim: (f) => ({ stroke: f.streak, width: 0.8, opacity: 0.45 }) },
}

export function fillRenderer<F extends CanvasFill>(fill: F): FillRenderer<F> {
  return FILL_RENDERERS[fill.type] as unknown as FillRenderer<F>
}
