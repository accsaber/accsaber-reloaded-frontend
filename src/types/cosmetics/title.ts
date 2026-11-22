import type { BorderShapePathValue } from './border'
import type { Easing, Gradient, ItemVariant, Loop } from './common'
import type { ModifierEffectSpec } from './effects'

type Pigments<K extends string> = { [P in K]?: string } & { [P in K as `light${Capitalize<P>}`]?: string }

export interface TitleGlistenSpec {
  enabled: boolean
  highlight?: string
  intervalMs?: number
  durationMs?: number
  bandPctOfDiagonal?: number
}

export interface TitleStateValue extends Pigments<'color'> {
  atMs: number
  gradient?: Gradient
  lightGradient?: Gradient
  fontWeight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  fontStyle?: 'normal' | 'italic'
  letterSpacingPx?: number
  glow?: TitleGlowSpec
  outline?: TitleOutlineSpec
  glisten?: TitleGlistenSpec
}

export interface TitleGlowSpec {
  color: string
  lightColor?: string
  blurEm: number
}

export interface TitleOutlineSpec {
  color: string
  lightColor?: string
  widthPx: number
}

export type TitleFont = 'pixel_8bit' | 'varela_round' | 'graffiti' | (string & {})

export interface TitleFlashSpec extends Pigments<'color'> {
  enabled: boolean
  minIntervalMs?: number
  maxIntervalMs?: number
  durationMs?: number
}

export type TitleSparkleShape = 'star' | 'paw' | 'firefly' | 'snowflake'

export interface TitleSparkleSpec extends Pigments<'color'> {
  enabled: boolean
  perSecond?: number
  sizePx?: number
  fadeMs?: number
  shape?: TitleSparkleShape
  spreadPct?: number
}

export type TitleOrnamentIcon = 'yarn_ball' | 'alpha' | (string & {})

export interface TitleOrnamentSpec extends Pigments<'color'> {
  icon?: TitleOrnamentIcon
  viewBox?: string
  paths?: Omit<BorderShapePathValue, 'twinkle'>[]
  fillRule?: 'evenodd'
  sizeEm?: number
  orbit?: TitleOrnamentOrbitSpec
}

export interface TitleOrnamentOrbitSpec {
  enabled: boolean
  periodMs?: number
  rxPct?: number
  ryEm?: number
  tiltDeg?: number
}

export interface TitleFlameAuraSpec extends Pigments<'inner' | 'outer' | 'spark'> {
  type: 'flame'
  enabled: boolean
}

export interface TitleHazeAuraSpec extends Pigments<'color' | 'glow'> {
  type: 'haze'
  enabled: boolean
  orbs?: boolean
  motes?: boolean
}

export interface TitleCoronaAuraSpec {
  type: 'corona'
  enabled: boolean
  color: string
  lightColor?: string
  prominence: string
  streamers?: number
  streamerLen?: number
  prominences?: number
  plumes?: boolean
  annular?: boolean
}

export interface TitleAuroraAuraSpec extends Pigments<'star'> {
  type: 'aurora'
  enabled: boolean
  colors: string[]
  lightColors?: string[]
  curtains?: number
  stars?: number
  speed?: number
}

export interface TitleLanternAuraSpec extends Pigments<'glow' | 'core'> {
  type: 'lantern'
  enabled: boolean
  embers?: number
}

export interface TitleGhostsAuraSpec extends Pigments<'color' | 'glow'> {
  type: 'ghosts'
  enabled: boolean
  count?: number
}

export interface TitleSmokeAuraSpec extends Pigments<'smoke' | 'ember'> {
  type: 'smoke'
  enabled: boolean
}

export interface TitleAscensionAuraSpec extends Pigments<'ray' | 'shine'> {
  type: 'ascension'
  enabled: boolean
  lift?: boolean
  intervalS?: number
}

export interface TitleRunesAuraSpec extends Pigments<'color' | 'glow'> {
  type: 'runes'
  enabled: boolean
  count?: number
}

export interface TitleStormAuraSpec extends Pigments<'arc' | 'glow'> {
  type: 'storm'
  enabled: boolean
  intervalMs?: number
}

export interface TitleSigilAuraSpec extends Pigments<'color'> {
  type: 'sigil'
  enabled: boolean
  periodS?: number
}

export interface TitleEarthAuraSpec extends Pigments<'stone' | 'dust'> {
  type: 'earth'
  enabled: boolean
  count?: number
}

export interface TitleWindAuraSpec extends Pigments<'color' | 'leaf'> {
  type: 'wind'
  enabled: boolean
  gustMs?: number
}

export interface TitleWaterAuraSpec extends Pigments<'color' | 'foam'> {
  type: 'water'
  enabled: boolean
}

export interface TitleFairyAuraSpec extends Pigments<'spark'> {
  type: 'fairy'
  enabled: boolean
  colors?: string[]
  lightColors?: string[]
  count?: number
}

export interface TitleBloodAuraSpec extends Pigments<'color' | 'glow' | 'bat'> {
  type: 'blood'
  enabled: boolean
  bats?: number
}

export interface TitleCosmicAuraSpec extends Pigments<'star' | 'nebula' | 'planet'> {
  type: 'cosmic'
  enabled: boolean
}

export interface TitleLightAuraSpec extends Pigments<'color' | 'flare'> {
  type: 'light'
  enabled: boolean
}

export interface TitleVoidAuraSpec extends Pigments<'color' | 'rim'> {
  type: 'void'
  enabled: boolean
}

export interface TitleInfernoAuraSpec extends Pigments<'core' | 'flame' | 'ember'> {
  type: 'inferno'
  enabled: boolean
  tongues?: number
}

export interface TitleIceAuraSpec extends Pigments<'frost' | 'ice' | 'snow'> {
  type: 'ice'
  enabled: boolean
}

export interface TitleSpotlightAuraSpec extends Pigments<'beam'> {
  type: 'spotlight'
  enabled: boolean
  beams?: number
  periodS?: number
}

export interface TitleStampsAuraSpec {
  type: 'stamps'
  enabled: boolean
  colors?: string[]
  lightColors?: string[]
  intervalMs?: number
}

export interface TitleMeadowAuraSpec extends Pigments<'grass' | 'seed'> {
  type: 'meadow'
  enabled: boolean
  blades?: number
}

export interface TitleHoardAuraSpec extends Pigments<'coin' | 'rim' | 'smoke' | 'flame' | 'eye'> {
  type: 'hoard'
  enabled: boolean
  gems?: string[]
  lightGems?: string[]
  dropEveryS?: number
  breatheEveryS?: number
  eyesEveryS?: number
}

export type TitleSeasonKey = 'spring' | 'summer' | 'autumn' | 'winter'

export interface TitleSeasonsAuraSpec extends Pigments<'spring' | 'summer' | 'autumn' | 'winter'> {
  type: 'seasons'
  enabled: boolean
  season?: TitleSeasonKey | 'cycle'
  seasonS?: number
}

export interface TitleCurioAuraSpec extends Pigments<'color' | 'glint'> {
  type: 'curio'
  enabled: boolean
  count?: number
}

export interface TitleRadarAuraSpec extends Pigments<'sweep' | 'blip'> {
  type: 'radar'
  enabled: boolean
  periodS?: number
}

export interface TitleWaypointsAuraSpec extends Pigments<'path' | 'flag'> {
  type: 'waypoints'
  enabled: boolean
  periodS?: number
}

export interface TitleBloqsAuraSpec extends Pigments<'left' | 'right' | 'streak' | 'score'> {
  type: 'bloqs'
  enabled: boolean
  intervalMs?: number
}

export interface TitleSplatterAuraSpec {
  type: 'splatter'
  enabled: boolean
  colors?: string[]
  lightColors?: string[]
  intervalMs?: number
  lifeMs?: number
}

export interface TitleConstellationAuraSpec extends Pigments<'star' | 'accent' | 'letter'> {
  type: 'constellation'
  enabled: boolean
  nodesPerLetter?: number
  breakEveryMs?: number
  pull?: number
}

export interface TitleGraffitiAuraSpec extends Pigments<'color'> {
  type: 'graffiti'
  enabled: boolean
}

export type TitleAuraSpec =
  | TitleConstellationAuraSpec
  | TitleGraffitiAuraSpec
  | TitleSplatterAuraSpec
  | TitleBloqsAuraSpec
  | TitleSpotlightAuraSpec
  | TitleStampsAuraSpec
  | TitleMeadowAuraSpec
  | TitleHoardAuraSpec
  | TitleSeasonsAuraSpec
  | TitleCurioAuraSpec
  | TitleRadarAuraSpec
  | TitleWaypointsAuraSpec
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
  | TitleAuroraAuraSpec
  | TitleCoronaAuraSpec

export type TitleAuraType = TitleAuraSpec['type']

export interface TitleChromaticSplitSpec extends Pigments<'colorA' | 'colorB'> {
  enabled: boolean
  offsetPx?: number
  minIntervalMs?: number
  maxIntervalMs?: number
  durationMs?: number
}

export interface TitleForgeSpec extends Pigments<'raw' | 'hot' | 'heat'> {
  enabled: boolean
  intervalMs?: number
  staggerMs?: number
  stampMs?: number
  coolMs?: number
}

export interface TitleBlazeSpec extends Pigments<'ember' | 'flame' | 'hot'> {
  enabled: boolean
  intervalMs?: number
  spreadMs?: number
  burnMs?: number
  dieMs?: number
}

export interface TitleSpectrumSplitSpec extends Pigments<'fused'> {
  enabled: boolean
  colors?: string[]
  lightColors?: string[]
  offsetPx?: number
  intervalMs?: number
  splitMs?: number
  microIntervalMs?: number
  microMs?: number
}

export type TitleHauntMode = 'poltergeist' | 'phantom' | 'possessed' | 'wraith' | 'banshee'

export interface TitleHauntSpec extends Pigments<'ghost' | 'bleed'> {
  enabled: boolean
  mode?: TitleHauntMode
  intervalMs?: number
}

export interface TitleFrostSpec extends Pigments<'frost' | 'glint'> {
  enabled: boolean
  intervalMs?: number
  creepMs?: number
  holdMs?: number
  thawMs?: number
}

export interface TitleStarlitSpec extends Pigments<'flash' | 'tint' | 'ink'> {
  enabled: boolean
  intervalMs?: number
  travelMs?: number
  floatEm?: number
  floatMs?: number
}

export interface TitleTransmuteSpec extends Pigments<'lead' | 'gold' | 'glint'> {
  enabled: boolean
  intervalMs?: number
  stepMs?: number
  failChance?: number
}

export interface TitleRuneSpec extends Pigments<'color'> {
  enabled: boolean
  intervalMs?: number
  holdMs?: number
}

export interface TitleEclipseSpec {
  enabled: boolean
  dark: string
  corona: string
  lightCorona?: string
  bead: string
  annular?: boolean
}

export interface TitleLanternSpec extends Pigments<'dim' | 'lit' | 'glow'> {
  enabled: boolean
  gutterEveryS?: number
  gutterS?: number
}

export type BrewIngredientKind = 'eye' | 'mushroom' | 'newt' | 'spider' | 'marshmallow' | 'candy_cane' | 'cinnamon'

export interface TitleBrewIngredient {
  kind: BrewIngredientKind
  color: string
  lightColor?: string
  ink?: string
}

export interface TitleBrewSpec {
  enabled: boolean
  ingredients: TitleBrewIngredient[]
  bone: string
  floats?: 'bones' | 'marshmallows'
  depth?: number
  bubbles?: number
  dropMinS?: number
  dropMaxS?: number
  surface?: number
  bobEm?: number
}

export interface TitleTorchSpec extends Pigments<'flame' | 'core' | 'lit'> {
  enabled: boolean
  stepMs?: number
}

export interface TitleWarcrySpec extends Pigments<'strain' | 'wave'> {
  enabled: boolean
  intervalMs?: number
  strainMs?: number
}

export interface TitleQuakeSpec extends Pigments<'stone' | 'crack'> {
  enabled: boolean
  intervalMs?: number
}

export interface TitleGustSpec {
  enabled: boolean
  intervalMs?: number
  leanDeg?: number
  throwEm?: number
}

export interface TitleRippleSpec extends Pigments<'deep' | 'shallow' | 'glint'> {
  enabled: boolean
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

export interface TitleBleedSpec extends Pigments<'blood'> {
  enabled: boolean
  bpm?: number
  intervalMs?: number
}

export interface TitleGalaxySpec {
  enabled: boolean
  colors?: string[]
  lightColors?: string[]
  intervalMs?: number
}

export interface TitleFlareSpec extends Pigments<'color' | 'core'> {
  enabled: boolean
  intervalMs?: number
}

export interface TitleDevourSpec extends Pigments<'dark' | 'edge'> {
  enabled: boolean
  intervalMs?: number
}

export interface TitleShiverSpec extends Pigments<'cold' | 'breath'> {
  enabled: boolean
  intervalMs?: number
}

export interface TitleSearSpec extends Pigments<'hot' | 'ember' | 'core'> {
  enabled: boolean
  intervalMs?: number
}

export interface TitleShockSpec extends Pigments<'arc' | 'flash' | 'splitA' | 'splitB'> {
  enabled: boolean
  intervalMs?: number
}

export interface TitleBoilSpec {
  enabled: boolean
  stepMs?: number
  offsetEm?: number
  tweakDeg?: number
  tweakEm?: number
}

export interface TitleFloatSpec {
  enabled: boolean
  ampEm?: number
  periodMs?: number
  tiltDeg?: number
}

export interface TitleJoltSpec extends Pigments<'flash' | 'screamColor'> {
  enabled: boolean
  scale?: number
  windupMs?: number
  holdMs?: number
  recoilMs?: number
  minIntervalMs?: number
  maxIntervalMs?: number
  rings?: boolean
}

export interface TitleSproutSpec extends Pigments<'glint'> {
  enabled: boolean
  intervalMs?: number
  stepMs?: number
}

export interface TitleAscentSpec extends Pigments<'glow'> {
  enabled: boolean
  riseEm?: number
  periodMs?: number
}

export interface TitleSliceSpec extends Pigments<'flash'> {
  enabled: boolean
  intervalMs?: number
  gapEm?: number
}

export interface TitleTickSpec extends Pigments<'done'> {
  enabled: boolean
  intervalMs?: number
  stepMs?: number
}

export interface TitleMetronomeSpec extends Pigments<'accent'> {
  enabled: boolean
  beatMs?: number
  tiltDeg?: number
}

export interface TitleScrawlSpec extends Pigments<'ink'> {
  enabled: boolean
  intervalMs?: number
}

export interface TitleReelSpec extends Pigments<'gold'> {
  enabled: boolean
  intervalMs?: number
  spinMs?: number
  stepMs?: number
  jackpotChance?: number
}

export interface TitleRestartSpec {
  enabled: boolean
  intervalMs?: number
}

export interface TitlePunchSpec extends Pigments<'ink'> {
  enabled: boolean
  intervalMs?: number
}

export interface TitleHammerSpec extends Pigments<'hot' | 'spark'> {
  enabled: boolean
  intervalMs?: number
  stepMs?: number
}

export interface TitleExcavateSpec extends Pigments<'sand' | 'gold'> {
  enabled: boolean
  intervalMs?: number
  stepMs?: number
}

export interface TitleQuestSpec extends Pigments<'mark' | 'done'> {
  enabled: boolean
  intervalMs?: number
}

export interface TitleScalesSpec extends Pigments<'deep' | 'ridge' | 'glint'> {
  enabled: boolean
  shimmerMs?: number
  sizeEm?: number
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
  spectrumSplit?: TitleSpectrumSplitSpec
  haunt?: TitleHauntSpec
  jolt?: TitleJoltSpec
  float?: TitleFloatSpec
  boil?: TitleBoilSpec
  lantern?: TitleLanternSpec
  eclipse?: TitleEclipseSpec
  brew?: TitleBrewSpec
  quake?: TitleQuakeSpec
  warcry?: TitleWarcrySpec
  torch?: TitleTorchSpec
  gust?: TitleGustSpec
  ripple?: TitleRippleSpec
  pixie?: TitlePixieSpec
  bleed?: TitleBleedSpec
  galaxy?: TitleGalaxySpec
  flare?: TitleFlareSpec
  devour?: TitleDevourSpec
  shock?: TitleShockSpec
  sear?: TitleSearSpec
  shiver?: TitleShiverSpec
  frost?: TitleFrostSpec
  transmute?: TitleTransmuteSpec
  starlit?: TitleStarlitSpec
  rune?: TitleRuneSpec
  sprout?: TitleSproutSpec
  ascent?: TitleAscentSpec
  slice?: TitleSliceSpec
  tick?: TitleTickSpec
  metronome?: TitleMetronomeSpec
  scrawl?: TitleScrawlSpec
  reel?: TitleReelSpec
  restart?: TitleRestartSpec
  punch?: TitlePunchSpec
  hammer?: TitleHammerSpec
  excavate?: TitleExcavateSpec
  quest?: TitleQuestSpec
  scales?: TitleScalesSpec
  fx?: ModifierEffectSpec
  variants?: ItemVariant[]
  durationMs?: number
  loop?: Loop
  easing?: Easing
}
