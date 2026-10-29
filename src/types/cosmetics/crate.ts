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
  base?: boolean
  strap?: string
  latch?: string
  seam?: string
  glow?: CrateIconGlow
  paths?: CrateIconPath[]
}
