import type {
  TitleAscentSpec,
  TitleExcavateSpec,
  TitleHammerSpec,
  TitleMetronomeSpec,
  TitlePunchSpec,
  TitleQuestSpec,
  TitleReelSpec,
  TitleRestartSpec,
  TitleScrawlSpec,
  TitleSliceSpec,
  TitleSproutSpec,
  TitleTickSpec,
} from '@/types/api/items'
import { lerpHex } from '@/utils/color'
import { hash01 } from '@/utils/random'

type Style = Record<string, string>

function pick(light: boolean, lightValue: string | undefined, value: string | undefined, fallback: string): string {
  return (light ? lightValue : undefined) ?? value ?? fallback
}

function clamp01(u: number): number {
  return Math.min(1, Math.max(0, u))
}

function easeOut(u: number): number {
  return 1 - Math.pow(1 - u, 3)
}

function elastic(u: number): number {
  return 1 - Math.cos(u * Math.PI * 3) * Math.exp(-u * 5) * (1 - u)
}

export function sproutCharStyle(tMs: number, i: number, n: number, spec: TitleSproutSpec, light: boolean): Style {
  const interval = spec.intervalMs ?? 8000
  const step = spec.stepMs ?? 130
  const glint = pick(light, spec.lightGlint, spec.glint, '#d9f99d')
  const local = tMs % interval
  const growAt = 500 + i * step
  const wiltAt = interval - 600 + i * step * 0.4
  if (local < growAt) return { opacity: '0', transform: 'scaleY(0)', transformOrigin: '50% 100%' }
  if (local < growAt + 420) {
    const u = (local - growAt) / 420
    const s = u < 0.7 ? (u / 0.7) * 1.14 : 1.14 - 0.14 * ((u - 0.7) / 0.3)
    const flash = u > 0.6 ? Math.sin(((u - 0.6) / 0.4) * Math.PI) : 0
    return {
      opacity: clamp01(u * 2).toFixed(3),
      transform: `scaleY(${s.toFixed(3)})`,
      transformOrigin: '50% 100%',
      textShadow: flash > 0.05 ? `0 -0.1em ${(0.3 * flash).toFixed(2)}em ${glint}` : 'none',
    }
  }
  if (local >= wiltAt) {
    const u = clamp01((local - wiltAt) / 350)
    return { opacity: (1 - u).toFixed(3), transform: `scaleY(${(1 - u).toFixed(3)})`, transformOrigin: '50% 100%' }
  }
  const sway = Math.sin(tMs / 900 + i * 0.8) * 1.2
  return { transform: `rotate(${sway.toFixed(2)}deg)`, transformOrigin: '50% 100%' }
}

export function ascentCharStyle(tMs: number, i: number, n: number, spec: TitleAscentSpec, light: boolean, base: string): Style {
  const rise = spec.riseEm ?? 0.16
  const period = spec.periodMs ?? 4200
  const glow = pick(light, spec.lightGlow, spec.glow, '#e0f2fe')
  const slope = n > 1 ? (i / (n - 1)) * rise : 0
  const pos = ((tMs % period) / period) * (n + 2) - 1
  const near = Math.max(0, 1 - Math.abs(i - pos))
  const out: Style = {
    transform: `translateY(${(-slope - 0.09 * near).toFixed(3)}em)`,
  }
  if (near > 0.05) {
    out.color = lerpHex(base, glow, near * 0.85)
    out.textShadow = `0 0 ${(0.3 * near).toFixed(2)}em ${glow}`
  }
  return out
}

export function sliceCharStyle(tMs: number, i: number, n: number, spec: TitleSliceSpec, light: boolean): Style {
  const interval = spec.intervalMs ?? 6500
  const gap = spec.gapEm ?? 0.14
  const flash = pick(light, spec.lightFlash, spec.flash, '#e0f2fe')
  const local = (tMs % interval) - interval * 0.6
  const dur = 780
  if (local < 0 || local > dur) return {}
  const u = local / dur
  const side = n > 1 ? ((i - (n - 1) / 2) / ((n - 1) / 2)) : 0
  if (u < 0.18) {
    const sweep = (u / 0.18) * (n + 1) - 0.5
    const near = Math.max(0, 1 - Math.abs(i - sweep) / 1.4)
    if (near < 0.05) return {}
    return { color: flash, textShadow: `0 0 ${(0.4 * near).toFixed(2)}em ${flash}`, transform: `skewX(${(-8 * near).toFixed(2)}deg)` }
  }
  if (u < 0.72) {
    const k = Math.sin(((u - 0.18) / 0.54) * Math.PI)
    return {
      transform: `translate(${(side * gap * 0.5 * k).toFixed(3)}em, ${(-side * gap * k).toFixed(3)}em) rotate(${(side * 3 * k).toFixed(2)}deg)`,
    }
  }
  const k = elastic((u - 0.72) / 0.28)
  const rem = 1 - k
  return { transform: `translate(${(side * gap * 0.5 * rem).toFixed(3)}em, ${(-side * gap * rem).toFixed(3)}em)` }
}

export function tickCharStyle(tMs: number, i: number, n: number, spec: TitleTickSpec, light: boolean, base: string): Style {
  const step = spec.stepMs ?? 420
  const interval = spec.intervalMs ?? (n * step + 3200)
  const done = pick(light, spec.lightDone, spec.done, '#22c55e')
  const local = tMs % interval
  const checkAt = 600 + i * step
  if (local < checkAt) return {}
  if (local > interval - 500) {
    const u = (local - (interval - 500)) / 500
    return { color: lerpHex(done, base, u), opacity: (1 - 0.3 * Math.sin(u * Math.PI)).toFixed(3) }
  }
  const u = clamp01((local - checkAt) / 260)
  const pop = Math.sin(u * Math.PI) * 0.14
  return {
    color: done,
    textDecoration: 'line-through',
    transform: `scale(${(1 + pop).toFixed(3)})`,
    textShadow: u < 1 ? `0 0 ${(0.35 * Math.sin(u * Math.PI)).toFixed(2)}em ${done}` : 'none',
  }
}

export function metronomeCharStyle(tMs: number, i: number, n: number, spec: TitleMetronomeSpec, light: boolean, base: string): Style {
  const beatMs = spec.beatMs ?? 640
  const tilt = spec.tiltDeg ?? 3.2
  const accent = pick(light, spec.lightAccent, spec.accent, '#a5b4fc')
  const beat = Math.floor(tMs / beatMs)
  const u = (tMs % beatMs) / beatMs
  const dir = beat % 2 === 0 ? 1 : -1
  const settle = easeOut(Math.min(1, u * 2.2))
  const angle = dir * tilt * (2 * settle - 1) * -1
  const out: Style = {
    transform: `rotate(${angle.toFixed(2)}deg)`,
    transformOrigin: '50% 100%',
  }
  if (beat % 4 === 0 && u < 0.3) {
    const a = Math.sin((u / 0.3) * Math.PI)
    out.color = lerpHex(base, accent, a * 0.8)
    out.textShadow = `0 0 ${(0.25 * a).toFixed(2)}em ${accent}`
  }
  void i
  void n
  return out
}

export function scrawlCharStyle(tMs: number, i: number, n: number, spec: TitleScrawlSpec, light: boolean): Style {
  const interval = spec.intervalMs ?? 5600
  const ink = pick(light, spec.lightInk, spec.ink, '#ef4444')
  const local = tMs % interval
  const u = local / interval
  if (u > 0.78 && u < 0.84) {
    const k = Math.sin(((u - 0.78) / 0.06) * Math.PI)
    return { textShadow: `0 0 ${(0.3 * k).toFixed(2)}em ${ink}` }
  }
  if (u >= 0.84) return {}
  const heat = Math.pow(u / 0.78, 2)
  if (heat < 0.08) return {}
  const jx = Math.sin(tMs * 0.11 + i * 13.7) * 0.045 * heat
  const jy = Math.cos(tMs * 0.13 + i * 7.1) * 0.035 * heat
  const off = 0.1 * heat
  const ghost = hash01(Math.floor(tMs / 140) * 5 + i * 3) < 0.14 * heat
  const out: Style = {
    transform: `translate(${jx.toFixed(3)}em, ${jy.toFixed(3)}em)`,
    textShadow: `${off.toFixed(3)}em ${(off * 0.4).toFixed(3)}em 0 ${ink}66`,
  }
  if (ghost) out.textShadow += `, ${(-off * 1.6).toFixed(3)}em 0 0 ${ink}99`
  void n
  return out
}

const REEL_CHARS = 'ABCDEFGHIJKLNOPQRSTUVXYZ0123456789'

const REEL_CELL: Style = { display: 'inline-block', width: '1.1ch', textAlign: 'center' }

function reelWindow(tMs: number, i: number, spec: TitleReelSpec): { spinning: boolean; landedAgo: number; cycle: number } {
  const interval = spec.intervalMs ?? 9000
  const spin = spec.spinMs ?? 1300
  const step = spec.stepMs ?? 170
  const cycle = Math.floor(tMs / interval)
  const local = tMs % interval
  const start = interval * 0.55
  const landAt = start + spin + i * step
  return { spinning: local >= start && local < landAt, landedAgo: local - landAt, cycle }
}

export function reelCharAt(tMs: number, i: number, ch: string, spec: TitleReelSpec): string {
  if (ch === ' ') return ch
  const w = reelWindow(tMs, i, spec)
  if (!w.spinning) return ch
  const tick = Math.floor(tMs / 65)
  return REEL_CHARS[Math.floor(hash01(tick * 7 + i * 31) * REEL_CHARS.length)]
}

export function reelCharStyle(tMs: number, i: number, n: number, spec: TitleReelSpec, light: boolean, base: string): Style {
  const gold = pick(light, spec.lightGold, spec.gold, '#f2c94c')
  const w = reelWindow(tMs, i, spec)
  if (w.spinning) {
    return {
      ...REEL_CELL,
      color: lerpHex(base, '#888888', 0.45),
      transform: `translateY(${(Math.sin(tMs * 0.06 + i * 4) * 0.05).toFixed(3)}em)`,
      textShadow: `0 0.09em 0.06em ${base}55, 0 -0.09em 0.06em ${base}55`,
    }
  }
  if (w.landedAgo >= 0 && w.landedAgo < 240) {
    const k = Math.sin((w.landedAgo / 240) * Math.PI)
    return { ...REEL_CELL, color: lerpHex(base, gold, k), transform: `scale(${(1 + 0.12 * k).toFixed(3)})`, textShadow: `0 0 ${(0.3 * k).toFixed(2)}em ${gold}` }
  }
  const step = spec.stepMs ?? 170
  const interval = spec.intervalMs ?? 9000
  const allLanded = (interval * 0.55) + (spec.spinMs ?? 1300) + (n - 1) * step + 240
  const local = tMs % interval
  if (hash01(w.cycle * 17 + 3) < (spec.jackpotChance ?? 0.1) && local >= allLanded && local < allLanded + 1100) {
    const k = Math.sin(((local - allLanded) / 1100) * Math.PI)
    return { ...REEL_CELL, color: gold, textShadow: `0 0 ${(0.4 * k).toFixed(2)}em ${gold}` }
  }
  return { ...REEL_CELL }
}

export function restartCharStyle(tMs: number, i: number, n: number, spec: TitleRestartSpec): Style {
  const interval = spec.intervalMs ?? 4600
  const local = (tMs % interval) - interval * 0.55
  const sweep = 420
  const stagger = sweep / Math.max(1, n)
  const dieAt = i * stagger
  const riseAt = sweep + 160 + i * stagger
  if (local < dieAt || local > riseAt + 300) return {}
  if (local < dieAt + 180) {
    const u = (local - dieAt) / 180
    return {
      opacity: (1 - u).toFixed(3),
      transform: `translateY(${(0.3 * u).toFixed(3)}em) rotate(${((hash01(i * 11) - 0.5) * 24 * u).toFixed(1)}deg)`,
    }
  }
  if (local < riseAt) return { opacity: '0' }
  const u = clamp01((local - riseAt) / 300)
  const e = easeOut(u)
  return { opacity: e.toFixed(3), transform: `translateY(${((1 - e) * 0.35).toFixed(3)}em)` }
}

export function punchCharStyle(tMs: number, i: number, n: number, spec: TitlePunchSpec, light: boolean, base: string): Style {
  const interval = spec.intervalMs ?? 6400
  const ink = pick(light, spec.lightInk, spec.ink, '#4ade80')
  const local = (tMs % interval) - interval * 0.65
  const dur = 520
  if (local >= 0 && local <= dur) {
    const u = local / dur
    const center = (n - 1) / 2
    const wave = Math.max(0, 1 - Math.abs(i - center) / (center + 1)) * 0.3 + 0.7
    if (u < 0.38) {
      const k = easeOut(u / 0.38) * wave
      return {
        transform: `scaleY(${(1 - 0.2 * k).toFixed(3)}) translateY(${(0.05 * k).toFixed(3)}em)`,
        transformOrigin: '50% 100%',
        color: lerpHex(base, ink, k * 0.7),
      }
    }
    const k = elastic((u - 0.38) / 0.62)
    const rem = (1 - k) * wave
    const flash = u < 0.55 ? Math.sin(((u - 0.38) / 0.17) * Math.PI) : 0
    return {
      transform: `scaleY(${(1 - 0.2 * rem).toFixed(3)})`,
      transformOrigin: '50% 100%',
      color: lerpHex(base, ink, rem * 0.7),
      textShadow: flash > 0.05 ? `0 0 ${(0.35 * flash).toFixed(2)}em ${ink}` : 'none',
    }
  }
  const sec = Math.floor(tMs / 1000)
  if (i === sec % n && tMs % 1000 < 90) return { textShadow: `0 0 0.12em ${ink}` }
  return {}
}

export function hammerCharStyle(tMs: number, i: number, n: number, spec: TitleHammerSpec, light: boolean, base: string): Style {
  const interval = spec.intervalMs ?? 7500
  const step = spec.stepMs ?? 190
  const hot = pick(light, spec.lightHot, spec.hot, '#ffb35c')
  const spark = pick(light, spec.lightSpark, spec.spark, '#fff1dd')
  const hitAt = interval * 0.5 + i * step
  const local = (tMs % interval) - hitAt
  if (local >= 0 && local < 140) {
    const u = local / 140
    return {
      transform: `scaleY(${(1 - 0.3 * Math.sin(u * Math.PI)).toFixed(3)})`,
      transformOrigin: '50% 100%',
      color: hot,
      textShadow: `0.12em -0.1em 0 ${spark}aa, -0.1em -0.14em 0 ${spark}77, 0 0 0.3em ${hot}`,
    }
  }
  if (local >= 140 && local < 800) {
    const u = (local - 140) / 660
    const k = elastic(Math.min(1, u * 1.6))
    return {
      transform: `scaleY(${(1 - 0.3 * (1 - k)).toFixed(3)})`,
      transformOrigin: '50% 100%',
      color: lerpHex(hot, base, easeOut(u)),
      textShadow: u < 0.4 ? `0 0 ${(0.2 * (1 - u / 0.4)).toFixed(2)}em ${hot}` : 'none',
    }
  }
  const breathe = 0.5 + 0.5 * Math.sin(tMs * 0.0011 + i * 1.9)
  void n
  return { textShadow: `0 0 ${(0.05 + 0.07 * breathe).toFixed(3)}em ${hot}44` }
}

export function excavateCharStyle(tMs: number, i: number, n: number, spec: TitleExcavateSpec, light: boolean): Style {
  const interval = spec.intervalMs ?? 10000
  const step = spec.stepMs ?? 340
  const sand = pick(light, spec.lightSand, spec.sand, '#c9a87a')
  const gold = pick(light, spec.lightGold, spec.gold, '#f2c94c')
  const cycle = Math.floor(tMs / interval)
  const local = tMs % interval
  const order = Math.floor(hash01(cycle * 31 + i * 7) * n)
  const brushAt = 900 + order * step
  const buryAt = interval * 0.85 + order * step * 0.25
  if (local >= buryAt) {
    const u = clamp01((local - buryAt) / 500)
    return { color: lerpHex(gold, sand, u), textShadow: 'none' }
  }
  if (local < brushAt) {
    return { color: sand, textShadow: `0.02em 0.02em 0 ${sand}66` }
  }
  if (local < brushAt + 420) {
    const u = (local - brushAt) / 420
    const jx = Math.sin(tMs * 0.09 + i * 5) * 0.04 * (1 - u)
    return {
      color: lerpHex(sand, gold, easeOut(u)),
      transform: `translateX(${jx.toFixed(3)}em)`,
      textShadow: `0 ${(0.1 * (1 - u)).toFixed(3)}em ${(0.15 * (1 - u)).toFixed(3)}em ${sand}`,
    }
  }
  const shimmer = 0.5 + 0.5 * Math.sin(tMs * 0.004 + i * 2.3)
  return { color: gold, textShadow: `0 0 ${(0.04 + 0.1 * shimmer).toFixed(3)}em ${gold}55` }
}

export interface QuestMarker {
  key: number
  leftPct: number
  text: '!' | '✓'
  color: string
  opacity: number
  scale: number
  bobEm: number
}

function questVictims(cycle: number, n: number): number[] {
  const count = Math.min(3, Math.max(1, Math.floor(n / 4)))
  const out: number[] = []
  for (let k = 0; k < count; k++) {
    const v = Math.floor(hash01(cycle * 41 + k * 13) * n)
    if (!out.includes(v)) out.push(v)
  }
  return out
}

export function questMarkers(tMs: number, n: number, spec: TitleQuestSpec, light: boolean): QuestMarker[] {
  const interval = spec.intervalMs ?? 9500
  const mark = pick(light, spec.lightMark, spec.mark, '#f2c94c')
  const done = pick(light, spec.lightDone, spec.done, '#4ade80')
  const cycle = Math.floor(tMs / interval)
  const local = tMs % interval
  const out: QuestMarker[] = []
  for (const [slot, v] of questVictims(cycle, n).entries()) {
    const showAt = 500 + slot * 600
    const resolveAt = interval * 0.55 + slot * 500
    const goneAt = interval - 700
    if (local < showAt || local > goneAt + 400) continue
    const resolved = local >= resolveAt
    let opacity = 1
    let scale = 1
    if (local < showAt + 260) {
      const u = (local - showAt) / 260
      opacity = u
      scale = 1.5 - 0.5 * easeOut(u)
    } else if (local > goneAt) {
      opacity = clamp01(1 - (local - goneAt) / 400)
    }
    if (resolved && local < resolveAt + 240) {
      scale = 1 + 0.35 * Math.sin(((local - resolveAt) / 240) * Math.PI)
    }
    out.push({
      key: v,
      leftPct: ((v + 0.5) / n) * 100,
      text: resolved ? '✓' : '!',
      color: resolved ? done : mark,
      opacity,
      scale,
      bobEm: resolved ? 0 : Math.sin(tMs / 380 + slot * 2) * 0.06,
    })
  }
  return out
}

export function questCharStyle(tMs: number, i: number, n: number, spec: TitleQuestSpec, light: boolean, base: string): Style {
  const interval = spec.intervalMs ?? 9500
  const done = pick(light, spec.lightDone, spec.done, '#4ade80')
  const cycle = Math.floor(tMs / interval)
  const local = tMs % interval
  const victims = questVictims(cycle, n)
  const slot = victims.indexOf(i)
  if (slot >= 0) {
    const resolveAt = interval * 0.55 + slot * 500
    if (local >= resolveAt && local < resolveAt + 500) {
      const k = Math.sin(((local - resolveAt) / 500) * Math.PI)
      return { color: lerpHex(base, done, k), textShadow: `0 0 ${(0.3 * k).toFixed(2)}em ${done}` }
    }
  }
  const shineAt = interval * 0.82
  if (local >= shineAt && local < shineAt + 600) {
    const pos = ((local - shineAt) / 600) * (n + 2) - 1
    const near = Math.max(0, 1 - Math.abs(i - pos) / 1.5)
    if (near > 0.05) return { textShadow: `0 0 ${(0.3 * near).toFixed(2)}em #ffffff${Math.round(near * 200).toString(16).padStart(2, '0')}` }
  }
  return {}
}
