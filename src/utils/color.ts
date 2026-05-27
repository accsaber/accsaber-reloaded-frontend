export function brightenRgb(rgb: string, amount: number): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return rgb
  const r = Math.min(255, Math.round(Number(match[1]) + amount))
  const g = Math.min(255, Math.round(Number(match[2]) + amount))
  const b = Math.min(255, Math.round(Number(match[3]) + amount))
  return `rgb(${r}, ${g}, ${b})`
}

export type RGB = [number, number, number]

export function parseHex(hex: string): RGB | null {
  const m = hex.match(/^#([0-9a-fA-F]{3,8})$/)
  if (!m) return null
  let s = m[1]
  if (s.length === 3 || s.length === 4) s = s.split('').map((c) => c + c).join('')
  if (s.length !== 6 && s.length !== 8) return null
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}

export function toHex(rgb: RGB): string {
  return '#' + rgb
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')
}

export function darken(hex: string, factor: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  return toHex([rgb[0] * (1 - factor), rgb[1] * (1 - factor), rgb[2] * (1 - factor)])
}

export function lighten(hex: string, factor: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  return toHex([
    rgb[0] + (255 - rgb[0]) * factor,
    rgb[1] + (255 - rgb[1]) * factor,
    rgb[2] + (255 - rgb[2]) * factor,
  ])
}

export function lerpHex(a: string, b: string, t: number): string {
  const ar = parseHex(a)
  const br = parseHex(b)
  if (!ar || !br) return t < 0.5 ? a : b
  return toHex([
    ar[0] + (br[0] - ar[0]) * t,
    ar[1] + (br[1] - ar[1]) * t,
    ar[2] + (br[2] - ar[2]) * t,
  ])
}

export function luminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0.5
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
}
