import type { PaginationParams } from '../pagination'

export type ItemSource =
  | 'milestone'
  | 'milestone_set'
  | 'campaign_milestone'
  | 'campaign_difficulty'
  | 'campaign_completion'
  | 'level'
  | 'trade'
  | 'manual'
  | 'crate_drop'
  | 'supporter_tier'

export type KnownItemTypeKey =
  | 'badge'
  | 'title'
  | 'profile_border'
  | 'profile_border_shape'
  | 'profile_border_color'
  | 'theme'
  | 'profile_visual'
  | 'profile_background'
  | 'profile_thumbnail_background'
  | 'statistic'
  | 'perk'
  | 'saber'
  | 'item_pedestal'

export type ItemTypeKey = KnownItemTypeKey | (string & {})

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

export type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | (string & {})

export type Loop = 'loop' | 'pingpong' | 'once'

export interface GradientStop {
  atPct: number
  hex: string
}

export type Gradient =
  | { type: 'linear'; angleDeg: number; stops: GradientStop[] }
  | { type: 'radial'; centerXPct?: number; centerYPct?: number; radiusPct?: number; stops: GradientStop[] }
  | { type: 'conic'; centerXPct?: number; centerYPct?: number; angleDeg?: number; stops: GradientStop[] }

export interface VisualEffect {
  type: string
  [param: string]: unknown
}

export interface AssetSet {
  svg?: string
  raster?: { '1x'?: string; '2x'?: string; '3x'?: string; '4x'?: string; [k: string]: string | undefined }
  video?: string
  altText: string
}

export interface ModifierEffectSpec {
  contractVersion: 1
  compositions: Composition[]
  themeCompositions?: Composition[]
}

export interface Composition {
  type: string
  [param: string]: unknown
}

export interface ItemModifierRef {
  id: string
  key: string
  name: string
  colorHex: string
  effectSpec: ModifierEffectSpec | null
}

export interface UnusualEffectRef {
  id: string
  key: string
  name: string
  effectSpec: ModifierEffectSpec | null
}

export interface ItemModifierResponse {
  id: string
  key: string
  name: string
  description: string | null
  colorHex: string
  effectSpec: ModifierEffectSpec | null
  globalDropChance: number | null
  seasonStart: string | null
  seasonEnd: string | null
  active: boolean
  createdAt: string
}

export interface ItemTypeResponse {
  id: string
  parentTypeId: string | null
  key: ItemTypeKey
  name: string
  description: string | null
  valueSchema: Record<string, unknown> | null
  active: boolean
  createdAt: string
}

export interface TitleGlistenSpec {
  enabled: boolean
  highlight?: string
  intervalMs?: number
  durationMs?: number
  bandPctOfDiagonal?: number
}

export interface TitleStateValue {
  atMs: number
  color?: string
  gradient?: Gradient
  lightColor?: string
  lightGradient?: Gradient
  fontWeight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  fontStyle?: 'normal' | 'italic'
  letterSpacingPx?: number
  effects?: VisualEffect[]
  glisten?: TitleGlistenSpec
}

export type TitleFont = 'pixel_8bit' | (string & {})

export interface TitleFlashSpec {
  enabled: boolean
  color?: string
  lightColor?: string
  minIntervalMs?: number
  maxIntervalMs?: number
  durationMs?: number
}

export type TitleSparkleShape = 'star' | 'paw' | 'firefly' | 'snowflake'

export interface TitleSparkleSpec {
  enabled: boolean
  color?: string
  lightColor?: string
  perSecond?: number
  sizePx?: number
  fadeMs?: number
  shape?: TitleSparkleShape
  spreadPct?: number
}

export type TitleOrnamentIcon = 'yarn_ball' | 'alpha' | (string & {})

export interface TitleOrnamentSpec {
  icon: TitleOrnamentIcon
  color?: string
  lightColor?: string
  sizeEm?: number
}

export interface TitleFlameAuraSpec {
  type: 'flame'
  enabled: boolean
  inner?: string
  outer?: string
  spark?: string
  lightInner?: string
  lightOuter?: string
  lightSpark?: string
}

export interface TitleHazeAuraSpec {
  type: 'haze'
  enabled: boolean
  color?: string
  glow?: string
  lightColor?: string
  lightGlow?: string
  orbs?: boolean
  motes?: boolean
}

export interface TitleLanternAuraSpec {
  type: 'lantern'
  enabled: boolean
  glow?: string
  core?: string
  lightGlow?: string
  lightCore?: string
  embers?: number
  gutterEveryS?: number
  gutterS?: number
}

export interface TitleGhostsAuraSpec {
  type: 'ghosts'
  enabled: boolean
  color?: string
  glow?: string
  lightColor?: string
  lightGlow?: string
  count?: number
}

export interface TitleSmokeAuraSpec {
  type: 'smoke'
  enabled: boolean
  smoke?: string
  ember?: string
  lightSmoke?: string
  lightEmber?: string
}

export interface TitleAscensionAuraSpec {
  type: 'ascension'
  enabled: boolean
  ray?: string
  shine?: string
  lightRay?: string
  lightShine?: string
  lift?: boolean
  intervalS?: number
}

export interface TitleRunesAuraSpec {
  type: 'runes'
  enabled: boolean
  color?: string
  glow?: string
  lightColor?: string
  lightGlow?: string
  count?: number
}

export interface TitleStormAuraSpec {
  type: 'storm'
  enabled: boolean
  arc?: string
  glow?: string
  lightArc?: string
  lightGlow?: string
  intervalMs?: number
}

export interface TitleSigilAuraSpec {
  type: 'sigil'
  enabled: boolean
  color?: string
  lightColor?: string
  periodS?: number
}

export interface TitleEarthAuraSpec {
  type: 'earth'
  enabled: boolean
  stone?: string
  lightStone?: string
  dust?: string
  lightDust?: string
  count?: number
}

export interface TitleWindAuraSpec {
  type: 'wind'
  enabled: boolean
  color?: string
  lightColor?: string
  leaf?: string
  lightLeaf?: string
  gustMs?: number
}

export interface TitleWaterAuraSpec {
  type: 'water'
  enabled: boolean
  color?: string
  lightColor?: string
  foam?: string
  lightFoam?: string
}

export interface TitleFairyAuraSpec {
  type: 'fairy'
  enabled: boolean
  colors?: string[]
  lightColors?: string[]
  count?: number
}

export interface TitleBloodAuraSpec {
  type: 'blood'
  enabled: boolean
  color?: string
  lightColor?: string
  glow?: string
  lightGlow?: string
  bat?: string
  lightBat?: string
  bats?: number
  bpm?: number
}

export interface TitleCosmicAuraSpec {
  type: 'cosmic'
  enabled: boolean
  star?: string
  lightStar?: string
  nebula?: string
  lightNebula?: string
  planet?: string
  lightPlanet?: string
}

export interface TitleLightAuraSpec {
  type: 'light'
  enabled: boolean
  color?: string
  lightColor?: string
}

export interface TitleVoidAuraSpec {
  type: 'void'
  enabled: boolean
  color?: string
  lightColor?: string
  rim?: string
  lightRim?: string
}

export interface TitleInfernoAuraSpec {
  type: 'inferno'
  enabled: boolean
  core?: string
  flame?: string
  ember?: string
  lightCore?: string
  lightFlame?: string
  lightEmber?: string
  tongues?: number
}

export interface TitleIceAuraSpec {
  type: 'ice'
  enabled: boolean
  frost?: string
  ice?: string
  lightFrost?: string
  lightIce?: string
  intervalMs?: number
}

export type TitleAuraSpec =
  | TitleRunesAuraSpec
  | TitleInfernoAuraSpec
  | TitleIceAuraSpec
  | TitleBloodAuraSpec
  | TitleCosmicAuraSpec
  | TitleLightAuraSpec
  | TitleVoidAuraSpec
  | TitleEarthAuraSpec
  | TitleWindAuraSpec
  | TitleWaterAuraSpec
  | TitleFairyAuraSpec
  | TitleStormAuraSpec
  | TitleSigilAuraSpec
  | TitleFlameAuraSpec
  | TitleHazeAuraSpec
  | TitleSmokeAuraSpec
  | TitleAscensionAuraSpec
  | TitleGhostsAuraSpec
  | TitleLanternAuraSpec

export type TitleAuraType = TitleAuraSpec['type']

export interface TitleChromaticSplitSpec {
  enabled: boolean
  colorA?: string
  colorB?: string
  lightColorA?: string
  lightColorB?: string
  offsetPx?: number
  minIntervalMs?: number
  maxIntervalMs?: number
  durationMs?: number
}

export interface TitleForgeSpec {
  enabled: boolean
  raw?: string
  hot?: string
  heat?: string
  lightRaw?: string
  lightHot?: string
  lightHeat?: string
  intervalMs?: number
  staggerMs?: number
  stampMs?: number
  coolMs?: number
}

export interface TitleBlazeSpec {
  enabled: boolean
  ember?: string
  flame?: string
  hot?: string
  lightEmber?: string
  lightFlame?: string
  lightHot?: string
  intervalMs?: number
  spreadMs?: number
  burnMs?: number
  dieMs?: number
}

export interface TitleCrustSpec {
  enabled: boolean
  crust?: string
  crack?: string
  molten?: string
  moltenHot?: string
  lightCrust?: string
  lightCrack?: string
  minIntervalMs?: number
  maxIntervalMs?: number
  eruptMs?: number
}

export interface TitleSpectrumSplitSpec {
  enabled: boolean
  colors?: string[]
  lightColors?: string[]
  fused?: string
  lightFused?: string
  offsetPx?: number
  intervalMs?: number
  splitMs?: number
  microIntervalMs?: number
  microMs?: number
}

export type TitleHauntMode = 'poltergeist' | 'phantom' | 'possessed' | 'wraith' | 'banshee'

export interface TitleHauntSpec {
  enabled: boolean
  mode?: TitleHauntMode
  ghost?: string
  lightGhost?: string
  bleed?: string
  lightBleed?: string
  intervalMs?: number
}

export interface TitleFrostSpec {
  enabled: boolean
  frost?: string
  glint?: string
  lightFrost?: string
  lightGlint?: string
  intervalMs?: number
  creepMs?: number
  holdMs?: number
  thawMs?: number
}

export interface TitleTransmuteSpec {
  enabled: boolean
  lead?: string
  gold?: string
  glint?: string
  lightLead?: string
  lightGold?: string
  lightGlint?: string
  intervalMs?: number
  stepMs?: number
  failChance?: number
}

export interface TitleRuneSpec {
  enabled: boolean
  color?: string
  lightColor?: string
  intervalMs?: number
  holdMs?: number
}

export interface TitleLanternSpec {
  enabled: boolean
  dim?: string
  lit?: string
  glow?: string
  lightDim?: string
  lightLit?: string
  lightGlow?: string
  gutterEveryS?: number
  gutterS?: number
}

export type BrewIngredientKind = 'eye' | 'mushroom' | 'newt' | 'spider'

export interface TitleBrewIngredient {
  kind: BrewIngredientKind
  color: string
  lightColor?: string
}

export interface TitleBrewSpec {
  enabled: boolean
  ingredients: TitleBrewIngredient[]
  bone?: string
  bubbles?: number
  dropMinS?: number
  dropMaxS?: number
  surface?: number
  bobEm?: number
}

export interface TitleQuakeSpec {
  enabled: boolean
  stone?: string
  lightStone?: string
  crack?: string
  lightCrack?: string
  intervalMs?: number
}

export interface TitleGustSpec {
  enabled: boolean
  intervalMs?: number
  leanDeg?: number
  throwEm?: number
}

export interface TitleRippleSpec {
  enabled: boolean
  deep?: string
  shallow?: string
  lightDeep?: string
  lightShallow?: string
  ampEm?: number
  periodMs?: number
  intervalMs?: number
}

export interface TitlePixieSpec {
  enabled: boolean
  colors?: string[]
  lightColors?: string[]
  intervalMs?: number
}

export interface TitleBleedSpec {
  enabled: boolean
  blood?: string
  lightBlood?: string
  bpm?: number
  intervalMs?: number
}

export interface TitleGalaxySpec {
  enabled: boolean
  colors?: string[]
  lightColors?: string[]
  intervalMs?: number
}

export interface TitleFlareSpec {
  enabled: boolean
  color?: string
  lightColor?: string
  intervalMs?: number
}

export interface TitleDevourSpec {
  enabled: boolean
  intervalMs?: number
}

export interface TitleSearSpec {
  enabled: boolean
  hot?: string
  ember?: string
  lightHot?: string
  lightEmber?: string
  intervalMs?: number
}

export interface TitleShockSpec {
  enabled: boolean
  arc?: string
  lightArc?: string
  intervalMs?: number
}

export interface TitleFloatSpec {
  enabled: boolean
  ampEm?: number
  periodMs?: number
  tiltDeg?: number
}

export interface TitleJoltSpec {
  enabled: boolean
  scale?: number
  windupMs?: number
  holdMs?: number
  recoilMs?: number
  minIntervalMs?: number
  maxIntervalMs?: number
  flash?: string
  lightFlash?: string
  screamColor?: string
  lightScreamColor?: string
  rings?: boolean
}

export interface TitleValue {
  text: string
  font?: TitleFont
  states: TitleStateValue[]
  ornament?: TitleOrnamentSpec
  flashes?: TitleFlashSpec
  sparkles?: TitleSparkleSpec
  aura?: TitleAuraSpec
  chromaticSplit?: TitleChromaticSplitSpec
  forge?: TitleForgeSpec
  blaze?: TitleBlazeSpec
  crust?: TitleCrustSpec
  spectrumSplit?: TitleSpectrumSplitSpec
  haunt?: TitleHauntSpec
  jolt?: TitleJoltSpec
  float?: TitleFloatSpec
  lantern?: TitleLanternSpec
  brew?: TitleBrewSpec
  quake?: TitleQuakeSpec
  gust?: TitleGustSpec
  ripple?: TitleRippleSpec
  pixie?: TitlePixieSpec
  bleed?: TitleBleedSpec
  galaxy?: TitleGalaxySpec
  flare?: TitleFlareSpec
  devour?: TitleDevourSpec
  shock?: TitleShockSpec
  sear?: TitleSearSpec
  frost?: TitleFrostSpec
  transmute?: TitleTransmuteSpec
  rune?: TitleRuneSpec
  variants?: ItemVariant[]
  durationMs?: number
  loop?: Loop
  easing?: Easing
}

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
  material?: CoffinMaterial
  lid?: string
  trim?: string
  seam?: string
  soil?: string
  root?: string
  bone?: string
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
  color?: string
  sources: { x: number; y: number }[]
  minIntervalMs?: number
  maxIntervalMs?: number
  gravity?: number
}

export type BorderOverlaySpec =
  | BorderRainOverlaySpec
  | BorderDripOverlaySpec
  | BorderDryBonesOverlaySpec
  | BorderCoffinOverlaySpec
  | BorderBlackHoleOverlaySpec
  | BorderArcadeOverlaySpec
  | BorderThermalOverlaySpec
  | BorderBlueprintOverlaySpec

export type BorderOverlayType = BorderOverlaySpec['type']

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
  | 'reaper' | 'brute' | 'swampthing' | 'deepone' | 'vampire' | 'wolf' | 'butcher' | 'psycho' | 'nailhead' | 'manfly' | 'zombie'
  | 'eye' | 'wisp' | 'skull' | 'sphere'
  | 'moth' | 'mothron' | 'bigbat' | 'raven' | 'fly' | 'dragonfly'
  | 'bat'

export interface EclipseRoster {
  walkers?: EclipseCreatureKind[]
  drifters?: EclipseCreatureKind[]
  flyers?: EclipseCreatureKind[]
  swarm?: EclipseCreatureKind
}

export interface EclipseFill {
  type: 'eclipse'
  sky: string
  dusk: string
  corona: string
  shadow?: string
  creatures?: boolean
  roster?: EclipseRoster
  intervalS?: number
}

export type BorderColorFill =
  | { type: 'solid'; hex: string }
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

export interface ItemVariant {
  key: string
  label: string
  recolor?: Record<string, string>
  [override: string]: unknown
}

export interface BorderColorValue {
  states: BorderColorStateValue[]
  variants?: ItemVariant[]
  durationMs?: number
  loop?: Loop
  easing?: Easing
}

export interface BadgeValue {
  asset: AssetSet
  tint?: string
  effects?: VisualEffect[]
}

export type BackgroundFit = 'cover' | 'contain' | 'tile' | 'center'

export type BackgroundBlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light'
  | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity'

export interface ProfileBackgroundValue {
  asset: AssetSet
  fit?: BackgroundFit
  opacity?: number
  blendMode?: BackgroundBlendMode
  filters?: VisualEffect[]
  parallax?: { depth?: number; [k: string]: unknown }
}

export interface FacetVaultScene {
  type: 'facet_vault'
  base?: 'light' | 'dark'
  ink: string
  facets: string[]
  edge?: string
  edgeOpacity?: number
  caustic?: string
  causticOpacity?: number
  causticAngleDeg?: number
  sheen?: boolean
  sheenColor?: string
  sheenOpacity?: number
}

export interface GroveScene {
  type: 'grove'
  base?: 'light' | 'dark'
  skyTop: string
  skyBottom: string
  trunk: string
  vine: string
  fruits: string[]
  firefly: string
  fireflyAlt?: string
  mushroomA?: string
  mushroomB?: string
  wisp?: string
  mist?: string
}

export interface SanctumScene {
  type: 'sanctum'
  base?: 'light' | 'dark'
  wallTop: string
  wallBottom: string
  shaft: string
  throne: string
  rim: string
  mote?: string
}

export interface MonumentScene {
  type: 'monument'
  base?: 'light' | 'dark'
  skyTop: string
  skyBottom: string
  stone: string
  seam: string
  edge?: string
  cloud?: string
}

export interface TorchlitScene {
  type: 'torchlit'
  base?: 'light' | 'dark'
  sky: string
  ground: string
  flame: string
  flameDeep: string
  ember: string
}

export interface FusionScene {
  type: 'fusion'
  base?: 'light' | 'dark'
  bg: string
  beam: string
  colors: string[]
}

export interface HallwayScene {
  type: 'hallway'
  base?: 'light' | 'dark'
  wall: string
  floor: string
  beam: string
  figure: string
  face: string
  scareMinS?: number
  scareMaxS?: number
}

export interface GraveyardScene {
  type: 'graveyard'
  base?: 'light' | 'dark'
  skyTop: string
  skyBottom: string
  ground: string
  stone: string
  moon: string
  fog: string
  wisp?: string
}

export interface PumpkinPatchScene {
  type: 'pumpkin_patch'
  base?: 'light' | 'dark'
  skyTop: string
  skyBottom: string
  ground: string
  pumpkin: string
  pumpkinLit: string
  vine: string
  moon: string
  candle: string
}

export interface FullMoonScene {
  type: 'full_moon'
  base?: 'light' | 'dark'
  skyTop: string
  skyBottom: string
  moon: string
  crater: string
  cloud: string
  bat: string
}

export type ThumbnailScene =
  | HallwayScene
  | GraveyardScene
  | PumpkinPatchScene
  | FullMoonScene
  | FacetVaultScene
  | GroveScene
  | SanctumScene
  | MonumentScene
  | TorchlitScene
  | FusionScene

export interface ProfileThumbnailBackgroundValue {
  asset?: AssetSet
  scene?: ThumbnailScene
  fit?: BackgroundFit
  opacity?: number
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  variants?: ItemVariant[]
}

export interface ThemeValue {
  tokens: Record<string, string>
  altTokens?: Record<string, string>
}

export interface StatisticValue {
  statKey: string
  label: string
  icon?: string
  format?: {
    type: 'integer' | 'decimal' | 'duration' | 'percent' | 'custom'
    decimals?: number
    suffix?: string
    prefix?: string
  }
}

export interface PerkValue {
  effect: string
  amount?: number
}

export type CrateIconLayer = 'back' | 'lid' | 'panel' | 'front'

export interface CrateIconGlow {
  cx: number
  cy: number
  r: number
  stops: { offset: number; color: string }[]
}

export interface CrateIconPath {
  d: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  fillOpacity?: number
  strokeOpacity?: number
  transform?: string
  layer?: CrateIconLayer
}

export interface CrateIconValue {
  strap?: string
  latch?: string
  seam?: string
  glow?: CrateIconGlow
  paths?: CrateIconPath[]
}

export interface DownloadableFileValue {
  file: string
}

export type ItemValue =
  | TitleValue
  | BorderShapeValue
  | BorderColorValue
  | BadgeValue
  | ProfileBackgroundValue
  | ProfileThumbnailBackgroundValue
  | ThemeValue
  | StatisticValue
  | PerkValue
  | DownloadableFileValue

export interface ItemResponse {
  id: string
  typeId: string
  typeKey: ItemTypeKey
  name: string
  description: string | null
  iconUrl: string | null
  value: ItemValue | null
  rarity: ItemRarity
  downloadable: boolean
  serialized: boolean
  tradeable: boolean
  visible: boolean
  active: boolean
  deprecated: boolean
  stackable: boolean
  welcomeGrant: boolean
  missionPoolable: boolean
  unlockLevel: number | null
  worth: number | null
  requirement: string | null
  obtainableUntil: string | null
  createdAt: string
}

export interface CrateContentResponse {
  rewardItem: ItemResponse
  dropWeight: number
  dropChance: number
}

export interface CrateModifierResponse {
  modifier: ItemModifierRef
  dropChance: number
}

export interface CrateOpenResponse {
  id: string
  crate: ItemResponse
  consumedLinkId: string
  reward: UserItemResponse
  rolledAt: string
}

export interface UnusualEffectResponse extends UnusualEffectRef {
  description: string | null
  active: boolean
  createdAt: string
}

export interface UnusualEffectCrateGroup {
  crateId: string
  crateName: string
  crateIconUrl: string | null
  effects: UnusualEffectResponse[]
}

export interface UnusualEffectGroupsResponse {
  groups: UnusualEffectCrateGroup[]
  ungrouped: UnusualEffectResponse[]
}

export interface CreateUnusualEffectRequest {
  key: string
  name: string
  description?: string | null
  effectSpec: ModifierEffectSpec
}

export interface UpdateUnusualEffectRequest {
  name?: string | null
  description?: string | null
  effectSpec?: ModifierEffectSpec | null
}

export interface UserItemResponse {
  linkId: string
  item: ItemResponse
  modifiers: ItemModifierRef[]
  unusualEffect: UnusualEffectRef | null
  serialNumber: number | null
  quantity: number
  counters?: Record<string, number> | null
  source: ItemSource
  sourceId: string | null
  awardedByStaffId: string | null
  reason: string | null
  awardedAt: string
  variantKey?: string | null
}

export type EquippedItemsResponse = Partial<Record<ItemTypeKey, UserItemResponse | null>>

export interface DisintegrationResponse {
  linkId: string
  itemId: string
  quantityDisintegrated: number
  remainingQuantity?: number | null
  essenceGained: number
  balance: number
}

export interface EssenceBalance {
  balance: number
  reserved: number
}

export interface ItemListParams {
  typeId?: string
  tradeable?: boolean
}

export interface AdminItemListParams extends ItemListParams {
  includeInactive?: boolean
}

export interface AdminItemTypeListParams {
  includeInactive?: boolean
}

export interface UserItemListParams {
  typeKey?: ItemTypeKey
}

export interface InventoryListParams extends PaginationParams {
  typeKey?: ItemTypeKey
  rarity?: ItemRarity
  modifierKey?: string | string[]
  tradeable?: boolean
  search?: string
}

export type ItemHolderSort = 'RECENT' | 'RANK' | 'FOLLOWING'

export interface ItemHolderListParams extends PaginationParams {
  sort?: ItemHolderSort
  modifier?: string | string[]
}

export interface ItemHolderResponse {
  userId: string
  userName: string
  avatarUrl: string
  cdnAvatarUrl?: string | null
  country: string
  quantity: number
  lowestSerial: number | null
  acquiredAt: string
  modifiers: string[]
  ranking: number | null
  following: boolean
}

export interface CreateItemTypeRequest {
  parentTypeId?: string
  key: string
  name: string
  description?: string
  valueSchema?: Record<string, unknown>
}

export interface UpdateItemTypeRequest {
  name?: string
  description?: string
  valueSchema?: Record<string, unknown>
}

export interface CreateItemRequest {
  typeId: string
  name: string
  description?: string
  iconUrl?: string
  value?: Record<string, unknown>
  tradeable?: boolean
  visible?: boolean
  rarity?: ItemRarity
  stackable?: boolean
  welcomeGrant?: boolean
  missionPoolable?: boolean
  active?: boolean
  worth?: number | null
  requirement?: string | null
  unlockLevel?: number | null
}

export interface UpdateItemRequest {
  name?: string
  description?: string
  iconUrl?: string
  value?: Record<string, unknown>
  tradeable?: boolean
  visible?: boolean
  rarity?: ItemRarity
  stackable?: boolean
  welcomeGrant?: boolean
  missionPoolable?: boolean
  worth?: number | null
  requirement?: string | null
  unlockLevel?: number | null
}

export interface AwardItemRequest {
  userId: string
  itemId: string
  reason?: string
  modifierKeys?: string[]
  unusualEffectId?: string
  quantity?: number
}

export interface EquipItemRequest {
  linkId: string
  variantKey?: string
}

export interface PatchItemModifierRequest {
  globalDropChance: number | null
  seasonStart: string | null
  seasonEnd: string | null
}

export interface PutCrateModifierRequest {
  dropChance: number
}
