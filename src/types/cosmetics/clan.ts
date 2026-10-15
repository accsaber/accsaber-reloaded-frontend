import type { BorderDecal, BorderShapePathValue } from './border'
import type { ItemVariant } from './common'
import type { ModifierEffectSpec } from './effects'
import type { TitleValue } from './title'

export type ClanTitleEffectValue = Omit<TitleValue, 'text'>

export interface ClanTagCap {
  viewBox: string
  paths: BorderShapePathValue[]
}

export interface ClanTagDecal extends Pick<BorderDecal, 'viewBox' | 'paths' | 'rotateDeg' | 'opacity' | 'pulse' | 'swing'> {
  anchor: 'left' | 'center' | 'right'
  xEm?: number
  yEm?: number
  sizeEm: number
}

export interface ClanTagCardValue {
  left?: ClanTagCap
  right?: ClanTagCap
  decals?: ClanTagDecal[]
  fx?: ModifierEffectSpec
  variants?: ItemVariant[]
}
