import type { BorderColorFill } from '@/types/api/items'
import { luminance, parseHex } from '@/utils/color'

export interface OverlaySpace {
  sx: number
  sy: number
  s: number
  toX: (u: number) => number
  toY: (u: number) => number
}

export function overlaySpace(w: number, h: number, margin: number): OverlaySpace {
  const span = 100 + margin * 2
  const sx = w / span
  const sy = h / span
  return {
    sx,
    sy,
    s: (sx + sy) / 2,
    toX: (u: number) => (u + margin) * sx,
    toY: (u: number) => (u + margin) * sy,
  }
}

export function framePoint(u: number, inset: number): { x: number; y: number; angle: number } {
  const lo = inset
  const hi = 100 - inset
  const d = (((u % 1) + 1) % 1) * 4
  const side = Math.floor(d)
  const f = (d - side) * (hi - lo)
  if (side === 0) return { x: lo + f, y: lo, angle: 0 }
  if (side === 1) return { x: hi, y: lo + f, angle: Math.PI / 2 }
  if (side === 2) return { x: hi - f, y: hi, angle: Math.PI }
  return { x: lo, y: hi - f, angle: -Math.PI / 2 }
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

export function frameDelta(now: number, last: number, reduced: boolean, maxSec = 0.05): number {
  return reduced ? 0 : Math.min(maxSec, (now - last) / 1000)
}

export function fillMeanLuminance(fill: BorderColorFill | undefined): number | null {
  if (!fill) return null
  if (fill.type === 'solid') return luminance(fill.hex)
  if (fill.type === 'linear' || fill.type === 'radial' || fill.type === 'conic') {
    if (fill.stops.length === 0) return null
    return fill.stops.reduce((sum, s) => sum + luminance(s.hex), 0) / fill.stops.length
  }
  return null
}

export function primaryFillHex(fill: BorderColorFill | undefined): string | null {
  if (!fill) return null
  if (fill.type === 'solid') return fill.hex
  if (fill.type === 'linear' || fill.type === 'radial' || fill.type === 'conic') return fill.stops[0]?.hex ?? null
  if (fill.type === 'pixel_metal') return fill.highlight
  if (fill.type === 'cosmic') return fill.star
  if (fill.type === 'toon') return fill.line
  return null
}
