import type { TitleBleedSpec, TitleDevourSpec, TitleFlareSpec, TitleGalaxySpec, TitleGustSpec, TitlePixieSpec, TitleQuakeSpec, TitleRippleSpec, TitleSearSpec, TitleShockSpec } from '@/types/api/items'
import { lerpHex } from '@/utils/color'
import { hash01 } from '@/utils/random'

type Style = Record<string, string>

function pick(light: boolean, lightValue: string | undefined, value: string | undefined, fallback: string): string {
  return (light ? lightValue : undefined) ?? value ?? fallback
}

function easeOut(u: number): number {
  return 1 - Math.pow(1 - u, 3)
}

function clamp01(u: number): number {
  return Math.min(1, Math.max(0, u))
}

const QUAKE_PETRIFY = 500
const QUAKE_SHAKE = 600
const QUAKE_CRUMBLE = 600
const QUAKE_GAP = 500
const QUAKE_REBUILD = 700

export function quakeCharStyle(tMs: number, i: number, n: number, spec: TitleQuakeSpec, light: boolean, base: string): Style {
  const interval = spec.intervalMs ?? 9000
  const stone = pick(light, spec.lightStone, spec.stone, '#8a8378')
  const crack = pick(light, spec.lightCrack, spec.crack, '#2b2620')
  const local = (tMs % interval) - interval * 0.35
  const stagger = Math.min(100, 400 / Math.max(1, n))
  if (local < 0) return {}
  const shakeAt = QUAKE_PETRIFY
  const crumbleAt = shakeAt + QUAKE_SHAKE
  const gapAt = crumbleAt + QUAKE_CRUMBLE
  const rebuildAt = gapAt + QUAKE_GAP
  const doneAt = rebuildAt + QUAKE_REBUILD
  if (local < shakeAt) {
    const u = clamp01((local - i * stagger) / 260)
    return { color: lerpHex(base, stone, u), textShadow: u > 0.5 ? `0.02em 0.02em 0 ${crack}` : 'none' }
  }
  if (local < crumbleAt) {
    const k = (local - shakeAt) / QUAKE_SHAKE
    const jx = Math.sin(local * 0.9 + i * 3) * 0.05 * k
    const jy = Math.cos(local * 1.1 + i * 2) * 0.04 * k
    return { color: stone, textShadow: `0.02em 0.02em 0 ${crack}, -0.015em 0.03em 0 ${crack}`, transform: `translate(${jx.toFixed(3)}em, ${jy.toFixed(3)}em)` }
  }
  if (local < gapAt) {
    const u = clamp01((local - crumbleAt - i * stagger * 0.6) / (QUAKE_CRUMBLE - stagger * 0.6 * n))
    const drop = u * u * 1.2
    const rot = (hash01(i * 7) - 0.5) * 50 * u
    return { color: stone, opacity: (1 - u).toFixed(3), transform: `translateY(${drop.toFixed(3)}em) rotate(${rot.toFixed(1)}deg)` }
  }
  if (local < rebuildAt) return { opacity: '0' }
  if (local < doneAt) {
    const u = clamp01((local - rebuildAt - (n - 1 - i) * stagger * 0.5) / (QUAKE_REBUILD - stagger * 0.5 * n))
    const e = easeOut(u)
    return { color: lerpHex(stone, base, e), opacity: e.toFixed(3), transform: `translateY(${((1 - e) * 0.8).toFixed(3)}em)` }
  }
  return {}
}

export function gustCharStyle(tMs: number, i: number, n: number, spec: TitleGustSpec): Style {
  const interval = spec.intervalMs ?? 6000
  const lean = spec.leanDeg ?? 10
  const throwEm = spec.throwEm ?? 0.45
  const t = tMs / 1000
  const breeze = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 0.45)
  let skew = -lean * 0.35 * breeze
  let dx = Math.sin(t * 2.3 + i * 0.6) * 0.012
  let rot = 0
  const local = (tMs % interval) - interval * 0.55
  const delay = i * 55
  if (local >= delay && local < delay + 1300) {
    const u = (local - delay) / 1300
    const kick = Math.sin(u * Math.PI) * Math.exp(-u * 1.6) * 1.4
    dx += throwEm * kick * (0.45 + i / Math.max(1, n))
    skew -= lean * 1.4 * kick
    rot = 7 * kick
  }
  return { transform: `translateX(${dx.toFixed(3)}em) skewX(${skew.toFixed(2)}deg) rotate(${rot.toFixed(2)}deg)`, transformOrigin: '50% 100%' }
}

export function rippleCharStyle(tMs: number, i: number, n: number, spec: TitleRippleSpec, light: boolean): Style {
  const period = spec.periodMs ?? 1800
  const amp = spec.ampEm ?? 0.08
  const interval = spec.intervalMs ?? 5000
  const deep = pick(light, spec.lightDeep, spec.deep, '#3b82f6')
  const shallow = pick(light, spec.lightShallow, spec.shallow, '#bae6fd')
  const phase = (tMs / period) * Math.PI * 2 - i * 0.9
  const wave = Math.sin(phase)
  let dy = wave * amp
  let sy = 1 + 0.07 * Math.sin(phase + 1)
  let shadow = 'none'
  const cycle = Math.floor(tMs / interval)
  const victim = Math.floor(hash01(cycle * 13 + 5) * n)
  const local = (tMs % interval) - interval * 0.6
  if (i === victim && local >= 0 && local < 700) {
    const u = local / 700
    const dip = Math.sin(u * Math.PI) * Math.exp(-u * 2)
    dy += dip * 0.35
    sy *= 1 - dip * 0.25
    shadow = `0 -0.1em 0.25em rgba(255,255,255,${(0.6 * dip).toFixed(2)})`
  }
  return {
    color: lerpHex(deep, shallow, 0.5 + 0.5 * wave),
    transform: `translateY(${dy.toFixed(3)}em) scaleY(${sy.toFixed(3)})`,
    transformOrigin: '50% 100%',
    textShadow: shadow,
  }
}

export function pixieCharStyle(tMs: number, i: number, n: number, spec: TitlePixieSpec, light: boolean): Style {
  const colors = (light ? spec.lightColors : undefined) ?? spec.colors ?? ['#f9a8d4', '#a7f3d0', '#fde68a', '#c4b5fd']
  const interval = spec.intervalMs ?? 4000
  const pos = tMs / 900 + i * 0.7
  const idx = Math.floor(pos) % colors.length
  const next = (idx + 1) % colors.length
  const color = lerpHex(colors[idx] ?? '#f9a8d4', colors[next] ?? '#a7f3d0', pos % 1)
  const cycle = Math.floor(tMs / interval)
  const victim = Math.floor(hash01(cycle * 17 + 9) * n)
  const local = (tMs % interval) - interval * 0.5
  let scale = 1
  let rot = 0
  let glow = 0
  if (i === victim && local >= 0 && local < 750) {
    if (local < 250) scale = 1 - local / 250
    else if (local < 450) scale = 0
    else scale = easeOut((local - 450) / 300)
    rot = (local / 750) * 360
    glow = Math.sin((local / 750) * Math.PI)
  }
  return {
    color,
    transform: `scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`,
    textShadow: glow > 0.02 ? `0 0 ${(0.4 * glow).toFixed(2)}em ${color}` : 'none',
  }
}

export function bleedCharStyle(tMs: number, i: number, n: number, spec: TitleBleedSpec, light: boolean, base: string): Style {
  const blood = pick(light, spec.lightBlood, spec.blood, '#b91c1c')
  const bpm = spec.bpm ?? 56
  const interval = spec.intervalMs ?? 7000
  const u = ((tMs / 1000) * bpm / 60) % 1
  const beat = Math.max(Math.max(0, 1 - Math.abs(u - 0.1) / 0.12), Math.max(0, 1 - Math.abs(u - 0.32) / 0.14) * 0.6)
  const scale = 1 + beat * 0.07
  const cycle = Math.floor(tMs / interval)
  const victim = Math.floor(hash01(cycle * 23 + 3) * n)
  const local = (tMs % interval) - interval * 0.6
  let sy = 1
  let dye = beat * 0.35
  let shadow = `0 0.05em 0.12em ${blood}`
  if (i === victim && local >= 0 && local < 1400) {
    const k = local / 1400
    const stretch = Math.sin(k * Math.PI)
    sy = 1 + stretch * 0.45
    dye = Math.max(dye, stretch)
    shadow = `0 ${(0.25 * stretch).toFixed(2)}em 0.12em ${blood}, 0 ${(0.5 * stretch).toFixed(2)}em 0.06em ${blood}`
  }
  return {
    color: lerpHex(base, blood, dye),
    transform: `scale(${scale.toFixed(3)}, ${(scale * sy).toFixed(3)})`,
    transformOrigin: '50% 0%',
    textShadow: shadow,
  }
}

export function galaxyCharStyle(tMs: number, i: number, n: number, spec: TitleGalaxySpec, light: boolean): Style {
  const colors = (light ? spec.lightColors : undefined) ?? spec.colors ?? ['#c4b5fd', '#60a5fa', '#f0abfc']
  const interval = spec.intervalMs ?? 6000
  const t = tMs / 1000
  const a = colors[i % colors.length] ?? '#c4b5fd'
  const b = colors[(i + 1) % colors.length] ?? '#60a5fa'
  const c = colors[(i + 2) % colors.length] ?? '#f0abfc'
  const pos = ((t * 18 + i * 37) % 200)
  const tw = 0.85 + 0.15 * Math.sin(t * 3 + i * 1.3)
  const cycle = Math.floor(tMs / interval)
  const victim = Math.floor(hash01(cycle * 29 + 7) * n)
  const local = (tMs % interval) - interval * 0.55
  let warp = ''
  if (i === victim && local >= 0 && local < 600) {
    const k = Math.sin((local / 600) * Math.PI)
    warp = `scaleX(${(1 - k * 0.6).toFixed(3)}) translateX(${(k * 0.1).toFixed(3)}em)`
  }
  return {
    background: `linear-gradient(115deg, ${a} 0%, ${b} 40%, ${c} 70%, ${a} 100%)`,
    backgroundSize: '200% 100%',
    backgroundPosition: `${pos.toFixed(1)}% 0`,
    '-webkit-background-clip': 'text',
    'background-clip': 'text',
    color: 'transparent',
    opacity: tw.toFixed(3),
    transform: warp || 'none',
  }
}

export function flareCharStyle(tMs: number, i: number, n: number, spec: TitleFlareSpec, light: boolean, base: string): Style {
  const color = pick(light, spec.lightColor, spec.color, '#fff3c4')
  const interval = spec.intervalMs ?? 6000
  const t = tMs / 1000
  const halo = 0.15 + 0.1 * Math.sin(t * 1.3 + i * 0.5)
  const local = (tMs % interval) - interval * 0.5
  const delay = i * 90
  let k = 0
  if (local >= delay && local < delay + 700) k = Math.sin(((local - delay) / 700) * Math.PI)
  return {
    color: lerpHex(base, '#ffffff', k),
    textShadow: `0 0 ${(halo + 0.6 * k).toFixed(2)}em ${color}${k > 0.3 ? `, 0 0 ${(1.2 * k).toFixed(2)}em ${color}` : ''}`,
    transform: `scale(${(1 + k * 0.12).toFixed(3)})`,
  }
}

export function devourCharStyle(tMs: number, i: number, n: number, spec: TitleDevourSpec, light: boolean): Style {
  const interval = spec.intervalMs ?? 8000
  const dark = light ? '#1a0b2e' : '#05030a'
  const cycle = Math.floor(tMs / interval)
  const fromLeft = hash01(cycle * 31 + 11) < 0.5
  const order = fromLeft ? i : n - 1 - i
  const stagger = 110
  const local = (tMs % interval) - interval * 0.4
  const eatAt = order * stagger
  const eatDur = 420
  const holdUntil = n * stagger + 700
  const backAt = holdUntil + (n - 1 - order) * stagger
  let k = 0
  if (local >= eatAt && local < eatAt + eatDur) k = (local - eatAt) / eatDur
  else if (local >= eatAt + eatDur && local < backAt) k = 1
  else if (local >= backAt && local < backAt + eatDur) k = 1 - (local - backAt) / eatDur
  if (k <= 0) return {}
  const e = k < 1 ? 1 - Math.pow(1 - k, 2) : 1
  return {
    transform: `scale(${(1 - e).toFixed(3)}) rotate(${(e * 200).toFixed(1)}deg) translateY(${(e * 0.3).toFixed(3)}em)`,
    opacity: (1 - e * 0.85).toFixed(3),
    color: dark,
    textShadow: e > 0.1 && e < 0.95 ? `0 0 ${(0.25 * e).toFixed(2)}em #a78bfa` : 'none',
  }
}

export function shockCharStyle(tMs: number, i: number, n: number, spec: TitleShockSpec, light: boolean, base: string): Style {
  const arc = pick(light, spec.lightArc, spec.arc, '#dbeafe')
  const interval = spec.intervalMs ?? 4200
  const c = (tMs % interval) / interval
  const charge = Math.pow(c, 3)
  const crackle = hash01(Math.floor(tMs / 45) * 7 + i * 13) < 0.08 + charge * 0.3
  const jx = crackle ? (hash01(Math.floor(tMs / 45) * 3 + i) - 0.5) * 0.08 * (0.4 + charge) : 0
  const jy = crackle ? (hash01(Math.floor(tMs / 45) * 5 + i) - 0.5) * 0.06 * (0.4 + charge) : 0
  const strike = c > 0.93 ? Math.min(1, (c - 0.93) / 0.02) : 0
  const after = c < 0.12 ? 1 - c / 0.12 : 0
  const flash = Math.max(strike, after * (0.4 + 0.6 * (hash01(Math.floor(tMs / 30) + i) < 0.7 ? 1 : 0)))
  const glow = 0.08 + 0.18 * charge + 0.6 * flash
  const color = flash > 0 ? lerpHex(base, '#ffffff', Math.min(1, flash * 1.2)) : lerpHex(base, arc, crackle ? 0.6 : 0)
  const split = flash > 0.3 ? `, -0.04em 0 0 rgba(96,165,250,${(0.7 * flash).toFixed(2)}), 0.04em 0 0 rgba(244,114,182,${(0.5 * flash).toFixed(2)})` : ''
  const jolt = strike > 0 ? -0.06 * strike : 0
  return {
    color,
    transform: `translate(${jx.toFixed(3)}em, ${(jy + jolt).toFixed(3)}em)`,
    textShadow: `0 0 ${glow.toFixed(2)}em ${arc}${split}`,
  }
}

export function searCharStyle(tMs: number, i: number, n: number, spec: TitleSearSpec, light: boolean, base: string): Style {
  const hot = pick(light, spec.lightHot, spec.hot, '#fff3c4')
  const ember = pick(light, spec.lightEmber, spec.ember, '#7c2d12')
  const interval = spec.intervalMs ?? 6000
  const t = tMs / 1000
  const heat = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 0.9) * Math.sin(t * 1.1 + i * 0.4)
  const shimmer = Math.sin(t * 9 + i * 2.2) * 0.02 * heat
  const cycle = Math.floor(tMs / interval)
  const victim = Math.floor(hash01(cycle * 19 + 1) * n)
  const local = (tMs % interval) - interval * 0.5
  let flare = 0
  let cool = 0
  if (i === victim && local >= 0 && local < 1500) {
    const u = local / 1500
    flare = u < 0.25 ? Math.sin((u / 0.25) * Math.PI * 0.5) : Math.max(0, 1 - (u - 0.25) / 0.35)
    cool = u > 0.5 ? Math.sin(((u - 0.5) / 0.5) * Math.PI) : 0
  }
  const color = cool > 0 ? lerpHex(base, ember, cool) : lerpHex(lerpHex(base, hot, heat * 0.35), '#ffffff', flare)
  return {
    color,
    transform: `translateY(${(-shimmer).toFixed(3)}em) scale(${(1 + flare * 0.16).toFixed(3)})`,
    textShadow: `0 0 ${(0.12 + 0.2 * heat + 0.7 * flare).toFixed(2)}em ${hot}, 0 0.02em 0.04em ${ember}`,
  }
}
