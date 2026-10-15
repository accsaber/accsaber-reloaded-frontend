import type { Easing, Gradient, ItemVariant, Loop, VisualEffect } from './common'
import type { ModifierEffectSpec } from './effects'

export interface BorderShapePathValue {
  d: string
  stroke?: string
  strokeWidth?: number
  fill?: string
  strokeLinecap?: 'butt' | 'round' | 'square'
  strokeLinejoin?: 'miter' | 'round' | 'bevel'
  strokeDasharray?: string
  strokeOpacity?: number
  fillOpacity?: number
  transform?: string
  twinkle?: boolean
}

export interface BorderShapeStateValue {
  atMs: number
  paths?: BorderShapePathValue[]
  filters?: VisualEffect[]
}

export type BorderShapeRenderMode = 'path' | 'pixel'

export type BorderShapeMotif = 'heart_climb' | (string & {})

export interface ShapeSparkleSpec {
  enabled: boolean
  perSecond?: number
  sizePx?: number
  fadeMs?: number
}

export interface ShapeGlistenSpec {
  enabled: boolean
  intervalMs?: number
  durationMs?: number
  bandPctOfDiagonal?: number
}

export type PaletteStopName =
  | 'outline'
  | 'deepShadow'
  | 'shadow'
  | 'midShadow'
  | 'base'
  | 'midHighlight'
  | 'highlight'
  | 'apexHighlight'

export type PaletteDerivationOp =
  | { fn: 'darken'; of: PaletteStopName; amount: number }
  | { fn: 'lighten'; of: PaletteStopName; amount: number }
  | { fn: 'lerp'; from: PaletteStopName; to: PaletteStopName; at: number }

export interface PaletteDerivation {
  outline?: PaletteDerivationOp
  deepShadow?: PaletteDerivationOp
  midShadow?: PaletteDerivationOp
  midHighlight?: PaletteDerivationOp
  apexHighlight?: PaletteDerivationOp
}

export interface FrameRampBand {
  upToPct: number
  stop: PaletteStopName
}

export interface FrameRampSpec {
  angleDeg: number
  bands: FrameRampBand[]
}

export interface FrameStreaksPatternStep {
  stop: PaletteStopName | null
  lengthPx: number
}

export interface FrameStreaksSpec {
  angleDeg: number
  blendMode?: string
  pattern: FrameStreaksPatternStep[]
}

export interface FrameSpec {
  thicknessProportional?: number
  thicknessMinPx?: number
  thicknessMaxPx?: number
  cornerRadiusProportional?: number
  cornerRadiusMinPx?: number
  outlineWidthPx?: number
  ramp?: FrameRampSpec
  streaks?: FrameStreaksSpec
}

export type AvatarFit = 'cover' | 'safe'

export interface BorderDecal {
  viewBox: string
  paths: BorderShapePathValue[]
  xPct: number
  yPct: number
  sizePct: number
  rotateDeg?: number
  opacity?: number
  pulse?: { periodMs?: number; scaleAmp?: number }
  swing?: { periodMs?: number; deg?: number }
}

export interface BorderRainOverlaySpec {
  type: 'rain'
  enabled: boolean
  color?: string
  drops?: number
  splash?: boolean
  puddle?: boolean
}

export interface BorderBlackHoleOverlaySpec {
  type: 'blackhole'
  enabled: boolean
  glow?: string
  suction?: {
    fillType: 'cosmic'
  }
  vortex?: {
    maxLuminance: number
    color?: string
    arms?: number
  }
}

export interface BorderArcadeOverlaySpec {
  type: 'arcade'
  enabled: boolean
  invader?: string
  ship?: string
  bullet?: string
  burst?: string
  hp?: string
  mp?: string
  symbols?: string[]
  hudBg?: string
  hudEdge?: string
  hudGloss?: string
  barBg?: string
  hpLabel?: string
  hpEmpty?: string
  mpLabel?: string
  mpEmpty?: string
}

export type ThermalPalette = 'ironbow' | 'whitehot' | 'nightvision'

export interface BorderThermalOverlaySpec {
  type: 'thermal'
  enabled: boolean
  intervalMs?: number
  holdMs?: number
  palette?: ThermalPalette
  led?: string
  hud?: string
  window?: { x: number; y: number; w: number; h: number }
}

export interface BorderBlueprintOverlaySpec {
  type: 'blueprint'
  enabled: boolean
  draft?: string
  draftDim?: string
  pivot?: { x: number; y: number }
  mirror?: boolean
  radius?: number
  sweepFromDeg?: number
  sweepToDeg?: number
  periodMs?: number
  dim?: { x1: number; y1: number; x2: number; y2: number }
}

export type CoffinMaterial = 'oak' | 'iron' | 'stone' | 'glass'

export interface BorderCoffinOverlaySpec {
  type: 'coffin'
  enabled: boolean
  material: CoffinMaterial
  lid: string
  trim: string
  seam: string
  soil: string
  root: string
  bone: string
  rust?: string
  intervalMs?: number
  holdMs?: number
  hover?: boolean
}

export type DryBonesPathKind = 'bone' | 'shade' | 'dark' | 'crack' | 'socket'

export interface DryBonesPart {
  x: number
  y: number
  flat?: number
  role?: 'skull' | 'jaw'
  paths: { d: string; kind: DryBonesPathKind; opacity?: number }[]
}

export interface BorderDryBonesOverlaySpec {
  type: 'drybones'
  enabled: boolean
  bone: string
  shade: string
  dark: string
  crack: string
  rim: string
  parts: DryBonesPart[]
  minIntervalMs?: number
  maxIntervalMs?: number
  hover?: boolean
}

export interface BorderDripOverlaySpec {
  type: 'drip'
  enabled: boolean
  color: string
  sources: { x: number; y: number }[]
  minIntervalMs?: number
  maxIntervalMs?: number
  gravity?: number
}

export interface BorderUmbraOverlaySpec {
  type: 'umbra'
  enabled: boolean
  moon: string
  corona: string
  prominence: string
  streamers?: number
  streamerLen?: number
  prominences?: number
  plumes?: boolean
  flares?: boolean
  annular?: boolean
}

export type BorderOverlaySpec =
  | BorderUmbraOverlaySpec
  | BorderRainOverlaySpec
  | BorderDripOverlaySpec
  | BorderDryBonesOverlaySpec
  | BorderCoffinOverlaySpec
  | BorderBlackHoleOverlaySpec
  | BorderArcadeOverlaySpec
  | BorderThermalOverlaySpec
  | BorderBlueprintOverlaySpec

export type BorderOverlayType = BorderOverlaySpec['type']

export interface BorderOverlayHost {
  avatarUrl?: string | null
  avatarMask?: string | null
  color?: BorderColorValue | null
}

export interface BorderShapeValue {
  viewBox?: string
  avatarMask?: string
  avatarFit?: AvatarFit
  decals?: BorderDecal[]
  overlay?: BorderOverlaySpec
  renderMode?: BorderShapeRenderMode
  pixelSize?: number
  motif?: BorderShapeMotif
  frame?: FrameSpec
  paletteDerivation?: PaletteDerivation
  sparkles?: ShapeSparkleSpec
  glisten?: ShapeGlistenSpec
  fx?: ModifierEffectSpec
  states: BorderShapeStateValue[]
  variants?: ItemVariant[]
  durationMs?: number
  loop?: Loop
  easing?: Easing
}

export interface PixelMetalFill {
  type: 'pixel_metal'
  base: string
  highlight: string
  shadow: string
}

export interface CosmicFill {
  type: 'cosmic'
  space: string
  star: string
  nebulas: string[]
  accent: string
  planets?: boolean
  blackHoles?: boolean
  comets?: boolean
  shooting?: boolean
  speed?: number
}

export interface ToonFill {
  type: 'toon'
  ink: string
  line: string
  staticFps?: number
  staticCell?: number
  staticAlpha?: number
}

export interface PrismFill {
  type: 'prism'
  rose: string
  edge: string
  lo?: string
  hi?: string
  ink?: string
  fringeA?: string
  fringeB?: string
  snapMinS?: number
  snapMaxS?: number
  steps?: number
  glitchMs?: number
  shearPct?: number
  slices?: number
}

export interface GroveFill {
  type: 'grove'
  deep: string
  moss: string
  vine: string
  fruits: string[]
  firefly: string
  fireflyAlt?: string
  mushroomA?: string
  mushroomB?: string
  spore?: string
  intervalS?: number
}

export interface RegaliaFill {
  type: 'regalia'
  steel: string
  sheen: string
  shadow: string
  body: string
  silver: string
  core?: string
  intervalS?: number
}

export interface ColossusFill {
  type: 'colossus'
  stoneA: string
  stoneB: string
  block: string
  seam: string
  flash?: string
  intervalS?: number
}

export interface StolenFlameFill {
  type: 'stolenflame'
  night: string
  flame: string
  flameDeep: string
  ember: string
  intervalS?: number
}

export interface DominionFill {
  type: 'dominion'
  colors: string[]
  body?: string
  space?: string
  intervalS?: number
  microS?: number
}

export interface BrewFill {
  type: 'brew'
  colors: string[]
  bone: string
  bubbles?: number
  dropMinS?: number
  dropMaxS?: number
}

export interface WoodFill {
  type: 'wood'
  base: string
  dark: string
  light: string
  plank?: number
}

export interface CandleFill {
  type: 'candle'
  dark: string
  flame: string
  glow: string
  count?: number
}

export type EclipseCreatureKind =
  | 'reaper' | 'brute' | 'swampthing' | 'deepone' | 'vampire' | 'wolf' | 'manfly' | 'zombie'
  | 'eye' | 'wisp' | 'skull'
  | 'moth' | 'mothron' | 'bigbat' | 'raven' | 'fly' | 'dragonfly'
  | 'bat'

export interface EclipseRoster {
  walkers: EclipseCreatureKind[]
  drifters: EclipseCreatureKind[]
  flyers: EclipseCreatureKind[]
  swarm: EclipseCreatureKind
}

export interface EclipseFill {
  type: 'eclipse'
  sky: string
  dusk: string
  corona: string
  prominence: string
  shadow: string
  roster: EclipseRoster
}

export interface ConfettiFill {
  type: 'confetti'
  dark: string
  colors: string[]
  flash?: string
  count?: number
}

export interface JewelFill {
  type: 'jewel'
  velvet: string
  gems: string[]
  glint?: string
  seam?: string
  count?: number
  pace?: number
}

export interface LaserFill {
  type: 'laser'
  dark: string
  core: string
  glow: string
  spark?: string
  speed?: number
}

export interface ChartFill {
  type: 'chart'
  paper: string
  ink: string
  route: string
  rose?: string
}

export interface HazardFill {
  type: 'hazard'
  a: string
  b: string
  alarm?: string
  speed?: number
}

export interface WarpFill {
  type: 'warp'
  space: string
  streak: string
  core: string
  flare?: string
  tint?: string
  speed?: number
}

export type BorderColorFill =
  | { type: 'solid'; hex: string }
  | ConfettiFill
  | JewelFill
  | LaserFill
  | ChartFill
  | HazardFill
  | WarpFill
  | EclipseFill
  | CandleFill
  | WoodFill
  | BrewFill
  | Gradient
  | PixelMetalFill
  | CosmicFill
  | ToonFill
  | PrismFill
  | GroveFill
  | RegaliaFill
  | ColossusFill
  | StolenFlameFill
  | DominionFill

export interface BorderColorStateValue {
  atMs: number
  fill: BorderColorFill
  filters?: VisualEffect[]
}

export interface BorderColorValue {
  states: BorderColorStateValue[]
  variants?: ItemVariant[]
  durationMs?: number
  loop?: Loop
  easing?: Easing
}
