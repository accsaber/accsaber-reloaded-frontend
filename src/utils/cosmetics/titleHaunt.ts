import type { TitleHauntSpec } from '@/types/api/items'
import { lerpHex } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant } from '@/utils/cosmetics/titleAura'
import { sinHash01 } from '@/utils/random'

type Style = Record<string, string>

function poltergeistThrow(i: number, n: number, cycle: number, local: number, interval: number): Style | null {
  const victims = [
    Math.floor(sinHash01(cycle * 11 + 3) * n),
    sinHash01(cycle * 7 + 1) > 0.45 ? Math.floor(sinHash01(cycle * 5 + 9) * n) : -1,
    sinHash01(cycle * 13 + 2) > 0.7 ? Math.floor(sinHash01(cycle * 17 + 4) * n) : -1,
  ]
  const slot = victims.indexOf(i)
  if (slot < 0) return null
  const start = interval * 0.3 + slot * 260
  const fly = 1300
  if (local < start || local > start + fly) return null
  const u = (local - start) / fly
  const e = Math.sin(u * Math.PI)
  const dir = sinHash01(cycle * 3 + i) > 0.5 ? 1 : -1
  const wob = Math.sin(u * Math.PI * 3) * 0.08
  const spin = sinHash01(cycle * 23 + i) > 0.5 ? 360 * u : 42 * e
  return { transform: `translate(${(dir * 0.28 * e + wob).toFixed(3)}em, ${(-0.95 * e).toFixed(3)}em) rotate(${(dir * spin).toFixed(1)}deg)` }
}

const SLAM_RISE = 320
const SLAM_HOLD = 260
const SLAM_DROP = 110
const SLAM_SETTLE = 260

function poltergeistSlam(i: number, local: number, interval: number): Style | null {
  const t = local - (interval * 0.25 + i * 45)
  if (t < 0 || t > SLAM_RISE + SLAM_HOLD + SLAM_DROP + SLAM_SETTLE) return null
  const tilt = (sinHash01(i * 7 + 1) - 0.5) * 16
  if (t < SLAM_RISE) {
    const e = 1 - Math.pow(1 - t / SLAM_RISE, 3)
    return { transform: `translateY(${(-0.55 * e).toFixed(3)}em) rotate(${(tilt * e).toFixed(1)}deg)` }
  }
  if (t < SLAM_RISE + SLAM_HOLD) {
    const wob = Math.sin((t - SLAM_RISE) * 0.02 + i) * 0.03
    return { transform: `translate(${wob.toFixed(3)}em, -0.55em) rotate(${tilt.toFixed(1)}deg)` }
  }
  if (t < SLAM_RISE + SLAM_HOLD + SLAM_DROP) {
    const u = (t - SLAM_RISE - SLAM_HOLD) / SLAM_DROP
    return { transform: `translateY(${(-0.55 * (1 - u * u)).toFixed(3)}em) rotate(${(tilt * (1 - u)).toFixed(1)}deg)` }
  }
  const u = (t - SLAM_RISE - SLAM_HOLD - SLAM_DROP) / SLAM_SETTLE
  const bounce = Math.sin(u * Math.PI) * Math.exp(-u * 3) * 0.12
  const squash = 1 - Math.sin(u * Math.PI) * Math.exp(-u * 4) * 0.18
  return { transform: `translateY(${(-bounce).toFixed(3)}em) scale(${(2 - squash).toFixed(3)}, ${squash.toFixed(3)})`, transformOrigin: '50% 100%' }
}

function poltergeistShove(i: number, n: number, cycle: number, local: number, interval: number): Style | null {
  const shover = Math.floor(sinHash01(cycle * 29 + 5) * (n - 1))
  const dir = sinHash01(cycle * 31 + 6) > 0.5 ? 1 : -1
  const target = shover + dir
  if (target < 0 || target >= n) return null
  const t = local - interval * 0.35
  if (t < 0 || t > 900) return null
  const u = t / 900
  const hit = u < 0.25 ? u / 0.25 : Math.max(0, 1 - (u - 0.25) / 0.75)
  const spring = Math.sin(u * Math.PI * 2) * Math.exp(-u * 2)
  if (i === shover) return { transform: `translateX(${(dir * 0.32 * hit).toFixed(3)}em) scaleX(${(1 - 0.22 * hit).toFixed(3)})`, transformOrigin: dir > 0 ? '100% 50%' : '0% 50%' }
  if (i === target) return { transform: `translateX(${(dir * (0.3 * hit + 0.08 * spring)).toFixed(3)}em) rotate(${(dir * 18 * hit).toFixed(1)}deg)`, transformOrigin: '50% 100%' }
  return null
}

function poltergeist(tMs: number, i: number, n: number, spec: TitleHauntSpec): Style {
  const interval = spec.intervalMs ?? 4000
  const cycle = Math.floor(tMs / interval)
  const local = tMs % interval
  const kind = sinHash01(cycle * 19 + 5)
  const act = kind < 0.22
    ? poltergeistSlam(i, local, interval)
    : kind < 0.5 ? poltergeistShove(i, n, cycle, local, interval) : poltergeistThrow(i, n, cycle, local, interval)
  if (act) return act
  const twitch = sinHash01(Math.floor(tMs / 90) * 3 + i * 7) < 0.04
  return twitch ? { transform: `translate(${((sinHash01(cycle + i) - 0.5) * 0.08).toFixed(3)}em, ${((sinHash01(cycle * 2 + i) - 0.5) * 0.06).toFixed(3)}em)` } : {}
}

function phantom(t: number, i: number, ghost: string): Style {
  const shadows: string[] = []
  for (let g = 0; g < 4; g++) {
    const u = (t * 0.6 + i * 0.13 + g / 4) % 1
    const sway = Math.sin(u * 5 + i + g) * 0.08
    shadows.push(`${sway.toFixed(3)}em ${(-u * 1.05).toFixed(3)}em ${(u * 0.05).toFixed(3)}em ${withAlpha(ghost, (1 - u) * 0.65)}`)
  }
  return {
    opacity: (0.45 + 0.2 * Math.sin(t * 2 + i)).toFixed(3),
    transform: `translateY(${(Math.sin(t * 1.3 + i * 0.7) * 0.04).toFixed(3)}em)`,
    textShadow: shadows.join(', '),
  }
}

function possessed(t: number, i: number, bleed: string): Style {
  const dx = Math.sin(t * 37 + i * 9) * Math.sin(t * 23) * 0.06
  const flip = Math.sin(t * 5.3 + i * 2) > 0.985
  const out: Style = { transform: `translateX(${dx.toFixed(3)}em)${flip ? ' scaleX(-1)' : ''}` }
  if (Math.sin(t * 16 + i) <= -0.9) out.opacity = '0.25'
  if (Math.sin(t * 3 + i) > 0.94) out.textShadow = `0.12em 0.05em 0 ${withAlpha(bleed, 0.7)}`
  return out
}

function wraith(t: number, i: number, ghost: string, base: string): Style {
  const drift = Math.sin(t * 1.1 + i * 0.8)
  const shadows: string[] = []
  for (let g = 0; g < 3; g++) {
    const u = (t * 0.45 + i * 0.17 + g / 3) % 1
    shadows.push(`${(Math.sin(u * 6 + i) * 0.12).toFixed(3)}em ${(-u * 1.1).toFixed(3)}em ${(0.02 + u * 0.08).toFixed(3)}em ${withAlpha(ghost, (1 - u) * 0.5)}`)
  }
  const pulse = 0.55 + 0.45 * Math.sin(t * 0.9 + i * 0.6)
  return {
    color: lerpHex(base, ghost, pulse),
    opacity: (0.7 + 0.25 * pulse).toFixed(3),
    transform: `translateY(${(drift * 0.07).toFixed(3)}em) skewX(${(drift * 4).toFixed(2)}deg)`,
    textShadow: shadows.join(', '),
  }
}

function banshee(t: number, i: number, ghost: string, base: string): Style {
  const wail = 0.5 + 0.5 * Math.sin(t * 2.6 - i * 0.7)
  const moan = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 0.3)
  const stretch = 1 + wail * 0.22 + moan * 0.08
  const sway = Math.sin(t * 1.9 - i * 0.5) * 0.05
  return {
    color: lerpHex(base, ghost, wail * 0.6),
    transform: `translateX(${sway.toFixed(3)}em) scaleY(${stretch.toFixed(3)}) skewX(${(sway * 60).toFixed(2)}deg)`,
    transformOrigin: '50% 100%',
    textShadow: `0 0 ${(0.15 + 0.35 * wail).toFixed(2)}em ${ghost}, 0 ${(-0.15 * wail).toFixed(3)}em ${(0.2 + 0.2 * wail).toFixed(2)}em ${withAlpha(ghost, 0.45)}`,
  }
}

export function hauntCharStyle(tMs: number, i: number, n: number, spec: TitleHauntSpec, light: boolean, base: string): Style {
  const t = tMs / 1000
  const ghost = pickVariant(light, spec.lightGhost, spec.ghost, base)
  switch (spec.mode ?? 'poltergeist') {
    case 'phantom': return phantom(t, i, ghost)
    case 'possessed': return possessed(t, i, pickVariant(light, spec.lightBleed, spec.bleed, base))
    case 'wraith': return wraith(t, i, ghost, base)
    case 'banshee': return banshee(t, i, ghost, base)
    case 'poltergeist': return poltergeist(tMs, i, n, spec)
  }
}
