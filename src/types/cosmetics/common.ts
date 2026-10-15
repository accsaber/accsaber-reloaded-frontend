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

export interface ItemVariant {
  key: string
  label: string
  recolor?: Record<string, string>
  [override: string]: unknown
}
