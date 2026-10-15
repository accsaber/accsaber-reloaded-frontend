import type { BorderShapePathValue } from './border'
import type { Easing, Gradient, ItemVariant, Loop } from './common'
import type { ModifierEffectSpec } from './effects'

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
  icon?: TitleOrnamentIcon
  viewBox?: string
  paths?: Omit<BorderShapePathValue, 'twinkle'>[]
  fillRule?: 'evenodd'
  color?: string
  lightColor?: string
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

export interface TitleLanternAuraSpec {
  type: 'lantern'
  enabled: boolean
  glow?: string
  core?: string
  lightGlow?: string
  lightCore?: string
  embers?: number
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
  spark?: string
  lightSpark?: string
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
  flare?: string
  lightFlare?: string
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
  snow?: string
  lightSnow?: string
}

export interface TitleSpotlightAuraSpec {
  type: 'spotlight'
  enabled: boolean
  beam?: string
  lightBeam?: string
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

export interface TitleMeadowAuraSpec {
  type: 'meadow'
  enabled: boolean
  grass?: string
  lightGrass?: string
  seed?: string
  lightSeed?: string
  blades?: number
}

export interface TitleHoardAuraSpec {
  type: 'hoard'
  enabled: boolean
  coin?: string
  rim?: string
  smoke?: string
  flame?: string
  eye?: string
  gems?: string[]
  lightCoin?: string
  lightRim?: string
  lightSmoke?: string
  lightFlame?: string
  lightEye?: string
  lightGems?: string[]
  dropEveryS?: number
  breatheEveryS?: number
  eyesEveryS?: number
}

export type TitleSeasonKey = 'spring' | 'summer' | 'autumn' | 'winter'

export interface TitleSeasonsAuraSpec {
  type: 'seasons'
  enabled: boolean
  season?: TitleSeasonKey | 'cycle'
  spring?: string
  summer?: string
  autumn?: string
  winter?: string
  lightSpring?: string
  lightSummer?: string
  lightAutumn?: string
  lightWinter?: string
  seasonS?: number
}

export interface TitleCurioAuraSpec {
  type: 'curio'
  enabled: boolean
  color?: string
  glint?: string
  lightColor?: string
  lightGlint?: string
  count?: number
}

export interface TitleRadarAuraSpec {
  type: 'radar'
  enabled: boolean
  sweep?: string
  blip?: string
  lightSweep?: string
  lightBlip?: string
  periodS?: number
}

export interface TitleWaypointsAuraSpec {
  type: 'waypoints'
  enabled: boolean
  path?: string
  flag?: string
  lightPath?: string
  lightFlag?: string
  periodS?: number
}

export interface TitleBloqsAuraSpec {
  type: 'bloqs'
  enabled: boolean
  left?: string
  right?: string
  streak?: string
  score?: string
  lightLeft?: string
  lightRight?: string
  lightStreak?: string
  lightScore?: string
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

export interface TitleConstellationAuraSpec {
  type: 'constellation'
  enabled: boolean
  star?: string
  lightStar?: string
  accent?: string
  lightAccent?: string
  letter?: string
  lightLetter?: string
  nodesPerLetter?: number
  breakEveryMs?: number
  pull?: number
}

export interface TitleGraffitiAuraSpec {
  type: 'graffiti'
  enabled: boolean
  color?: string
  lightColor?: string
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
  | TitleCoronaAuraSpec

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

export interface TitleEclipseSpec {
  enabled: boolean
  dark: string
  corona: string
  lightCorona?: string
  bead: string
  annular?: boolean
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
  bone: string
  bubbles?: number
  dropMinS?: number
  dropMaxS?: number
  surface?: number
  bobEm?: number
}

export interface TitleTorchSpec {
  enabled: boolean
  flame?: string
  core?: string
  lit?: string
  lightFlame?: string
  lightCore?: string
  lightLit?: string
  stepMs?: number
}

export interface TitleWarcrySpec {
  enabled: boolean
  strain?: string
  wave?: string
  lightStrain?: string
  lightWave?: string
  intervalMs?: number
  strainMs?: number
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
  glint?: string
  lightGlint?: string
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
  core?: string
  lightCore?: string
  intervalMs?: number
}

export interface TitleDevourSpec {
  enabled: boolean
  dark?: string
  lightDark?: string
  edge?: string
  lightEdge?: string
  intervalMs?: number
}

export interface TitleSearSpec {
  enabled: boolean
  hot?: string
  ember?: string
  lightHot?: string
  lightEmber?: string
  core?: string
  lightCore?: string
  intervalMs?: number
}

export interface TitleShockSpec {
  enabled: boolean
  arc?: string
  lightArc?: string
  flash?: string
  lightFlash?: string
  splitA?: string
  lightSplitA?: string
  splitB?: string
  lightSplitB?: string
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

export interface TitleSproutSpec {
  enabled: boolean
  glint?: string
  lightGlint?: string
  intervalMs?: number
  stepMs?: number
}

export interface TitleAscentSpec {
  enabled: boolean
  glow?: string
  lightGlow?: string
  riseEm?: number
  periodMs?: number
}

export interface TitleSliceSpec {
  enabled: boolean
  flash?: string
  lightFlash?: string
  intervalMs?: number
  gapEm?: number
}

export interface TitleTickSpec {
  enabled: boolean
  done?: string
  lightDone?: string
  intervalMs?: number
  stepMs?: number
}

export interface TitleMetronomeSpec {
  enabled: boolean
  accent?: string
  lightAccent?: string
  beatMs?: number
  tiltDeg?: number
}

export interface TitleScrawlSpec {
  enabled: boolean
  ink?: string
  lightInk?: string
  intervalMs?: number
}

export interface TitleReelSpec {
  enabled: boolean
  gold?: string
  lightGold?: string
  intervalMs?: number
  spinMs?: number
  stepMs?: number
  jackpotChance?: number
}

export interface TitleRestartSpec {
  enabled: boolean
  intervalMs?: number
}

export interface TitlePunchSpec {
  enabled: boolean
  ink?: string
  lightInk?: string
  intervalMs?: number
}

export interface TitleHammerSpec {
  enabled: boolean
  hot?: string
  spark?: string
  lightHot?: string
  lightSpark?: string
  intervalMs?: number
  stepMs?: number
}

export interface TitleExcavateSpec {
  enabled: boolean
  sand?: string
  gold?: string
  lightSand?: string
  lightGold?: string
  intervalMs?: number
  stepMs?: number
}

export interface TitleQuestSpec {
  enabled: boolean
  mark?: string
  done?: string
  lightMark?: string
  lightDone?: string
  intervalMs?: number
}

export interface TitleScalesSpec {
  enabled: boolean
  deep?: string
  ridge?: string
  glint?: string
  lightDeep?: string
  lightRidge?: string
  lightGlint?: string
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
  crust?: TitleCrustSpec
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
  frost?: TitleFrostSpec
  transmute?: TitleTransmuteSpec
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
