import type {
  TitleBleedSpec,
  TitleBoilSpec,
  TitleFrostSpec,
  TitleLanternSpec,
  TitleStarlitSpec,
} from '@/types/cosmetics/title'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'

export interface TitleAuraLinks {
  frost?: TitleFrostSpec
  bleed?: TitleBleedSpec
  lantern?: TitleLanternSpec
  boil?: TitleBoilSpec
  starlit?: TitleStarlitSpec
}

export const TITLE_AURA_PAD = { x: 0.9, top: 1.7, bottom: 1.05 } as const

export interface TitleAuraRect {
  x: number
  y: number
  w: number
  h: number
  fs: number
}

export function titleAuraRect(canvas: HTMLCanvasElement): TitleAuraRect {
  const fs = parseFloat(getComputedStyle(canvas).fontSize) || 12
  return {
    x: TITLE_AURA_PAD.x * fs,
    y: TITLE_AURA_PAD.top * fs,
    w: canvas.clientWidth - 2 * TITLE_AURA_PAD.x * fs,
    h: canvas.clientHeight - (TITLE_AURA_PAD.top + TITLE_AURA_PAD.bottom) * fs,
    fs,
  }
}

export function drawTitleHalo(ctx: CanvasRenderingContext2D, r: TitleAuraRect, core: string, glow: string, level: number): void {
  ctx.save()
  ctx.translate(r.x + r.w * 0.5, r.y + r.h * 0.55)
  ctx.scale(r.w * 0.62 + r.fs * 0.6, r.fs * 1.1)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, withAlpha(core, 0.34 * level))
  g.addColorStop(0.35, withAlpha(glow, 0.22 * level))
  g.addColorStop(1, withAlpha(glow, 0))
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

export function pickVariant<T>(light: boolean, lightValue: T | undefined, value: T): T
export function pickVariant<T>(light: boolean, lightValue: T | undefined, value: T | undefined, fallback: T): T
export function pickVariant<T>(light: boolean, lightValue: T | undefined, value: T | undefined, fallback?: T): T {
  return ((light ? lightValue : undefined) ?? value ?? fallback) as T
}
