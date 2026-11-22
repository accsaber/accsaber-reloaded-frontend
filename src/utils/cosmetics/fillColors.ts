import type { BorderColorFill } from '@/types/cosmetics/border'
import { darken, lighten, luminance } from '@/utils/color'

export type MetalTriple = [shadow: string, base: string, highlight: string]

export function tripleFromHex(base: string): MetalTriple {
  return [darken(base, 0.45), base, lighten(base, 0.45)]
}

function tripleFromColors(colors: string[]): MetalTriple | null {
  if (colors.length === 0) return null
  const sorted = [...colors].sort((a, b) => luminance(a) - luminance(b))
  const n = sorted.length
  if (n === 1) return tripleFromHex(sorted[0])
  return [sorted[0], sorted[Math.floor((n - 1) / 2)], sorted[n - 1]]
}

export function fillTriple(fill: BorderColorFill): MetalTriple | null {
  switch (fill.type) {
    case 'pixel_metal': return [fill.shadow, fill.base, fill.highlight]
    case 'solid': return tripleFromHex(fill.hex)
    case 'linear':
    case 'radial':
    case 'conic': return tripleFromColors(fill.stops.map((s) => s.hex))
    case 'cosmic': return [fill.space, fill.nebulas[0] ?? fill.accent, lighten(fill.star, 0.1)]
    case 'toon': return [darken(fill.ink, 0.3), fill.ink, fill.line]
    case 'laser': return [fill.dark, fill.glow, fill.core]
    case 'lights': return [fill.base, fill.colors[0] ?? fill.wire, fill.colors[1] ?? fill.wire]
    case 'starshine': return [fill.deep, fill.base, fill.light]
    case 'candle': return tripleFromColors([fill.dark, fill.glow, fill.flame])
    case 'wood': return [fill.dark, fill.base, fill.light]
    case 'knit': return [fill.shade, fill.wool, fill.motif]
    case 'brew': return tripleFromColors([...fill.colors, fill.bone])
    case 'prism': return [fill.ink ?? darken(fill.rose, 0.45), fill.lo ?? fill.rose, fill.hi ?? fill.edge]
    case 'grove': return [fill.deep, fill.moss, fill.vine]
    case 'regalia': return [fill.shadow, fill.body, fill.core ?? fill.silver]
    case 'colossus': return tripleFromColors([fill.stoneA, fill.stoneB, fill.block, fill.seam])
    case 'stolenflame': return [fill.night, fill.flameDeep, fill.flame]
    case 'dominion': return tripleFromColors(fill.colors)
    case 'eclipse': return tripleFromColors([fill.shadow, fill.dusk, fill.corona])
    case 'confetti': return fill.colors[0] ? [fill.dark, fill.colors[0], fill.flash ?? lighten(fill.colors[0], 0.45)] : tripleFromHex(fill.dark)
    case 'jewel': return fill.gems[0] ? [fill.velvet, fill.gems[0], fill.glint ?? lighten(fill.gems[0], 0.45)] : tripleFromHex(fill.velvet)
    case 'chart': return [fill.ink, fill.route, fill.paper]
    case 'hazard': return tripleFromColors([fill.a, fill.b])
    case 'warp': return [fill.space, fill.streak, fill.core]
    default: {
      const unhandled: never = fill
      return unhandled
    }
  }
}
