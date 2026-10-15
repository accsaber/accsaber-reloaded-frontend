import type { AssetSet, ItemVariant, VisualEffect } from './common'
import type { ModifierEffectSpec } from './effects'

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
  fx?: ModifierEffectSpec
  variants?: ItemVariant[]
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
  tints: string[]
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
  wisp: string
  candle: string
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
