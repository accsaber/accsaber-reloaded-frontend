import type { BrewIngredientKind } from '@/types/api/items'
import { darken, lerpHex, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

export const BREW_INGREDIENT_KINDS: BrewIngredientKind[] = ['eye', 'mushroom', 'newt', 'spider']

const BLEND_S = 1.6
const POP_S = 0.3
const BUBBLE_GLINT = 'rgba(255, 255, 255, 0.4)'

export interface BrewDrop {
  kind: BrewIngredientKind
  color: string
  x: number
  y: number
  vy: number
  land: number
  splash: number
}

export interface BrewRing {
  x: number
  y: number
  age: number
}

export interface BrewBubble {
  x: number
  y: number
  r: number
  vy: number
  pop: number
}

export interface BrewState {
  clock: number
  nextDropAt: number
  drops: BrewDrop[]
  rings: BrewRing[]
  bubbles: BrewBubble[]
  from: string
  to: string
  blend: number
}

export interface BrewRules {
  gravity: number
  sinkS: number
  ringS: number
  gap: () => number
  spawn: () => BrewDrop
  rise: (b: BrewBubble, dt: number, clock: number) => void
  respawn: (b: BrewBubble) => void
}

export interface BrewInk {
  fill: string
  ring: string
}

export function brewState(color: string, bubbles: BrewBubble[], firstDropAt: number): BrewState {
  return { clock: 0, nextDropAt: firstDropAt, drops: [], rings: [], bubbles, from: color, to: color, blend: 1 }
}

export function brewLiquid(s: BrewState): string {
  return s.blend >= 1 ? s.to : lerpHex(s.from, s.to, s.blend)
}

function keep<T>(list: T[], alive: (v: T) => boolean): void {
  let n = 0
  for (const v of list) if (alive(v)) list[n++] = v
  list.length = n
}

function stepDrops(s: BrewState, dt: number, rules: BrewRules): BrewDrop | null {
  let landed: BrewDrop | null = null
  for (const d of s.drops) {
    if (d.splash >= 0) {
      d.splash += dt
      continue
    }
    d.vy += rules.gravity * dt
    d.y += d.vy * dt
    if (d.y < d.land) continue
    d.splash = 0
    s.rings.push({ x: d.x, y: d.land, age: 0 })
    s.from = brewLiquid(s)
    s.to = d.color
    s.blend = 0
    landed = d
  }
  keep(s.drops, (d) => d.splash < rules.sinkS)
  return landed
}

export function stepBrew(s: BrewState, dt: number, rules: BrewRules): BrewDrop | null {
  s.clock += dt
  if (s.clock >= s.nextDropAt) {
    s.drops.push(rules.spawn())
    s.nextDropAt = s.clock + rules.gap()
  }
  const landed = stepDrops(s, dt, rules)
  for (const r of s.rings) r.age += dt
  keep(s.rings, (r) => r.age < rules.ringS)
  s.blend = Math.min(1, s.blend + dt / BLEND_S)
  for (const b of s.bubbles) {
    if (b.pop <= 0) rules.rise(b, dt, s.clock)
    else if ((b.pop += dt) > POP_S) rules.respawn(b)
  }
  return landed
}

export function brewInk(color: string): BrewInk {
  return { fill: withAlpha(lighten(color, 0.45), 0.35), ring: lighten(color, 0.5) }
}

export function swirlArms(ctx: Ctx, cx: number, cy: number, scale: number, phase: number, r0: number): void {
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath()
    for (let i = 0; i <= 60; i++) {
      const u = i / 60
      const a = u * Math.PI * 3.2 + arm * 2.09 + phase
      const r = (r0 + u * 70) * scale
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    }
    ctx.stroke()
  }
}

export function boneShape(ctx: Ctx, size: number): void {
  ctx.beginPath()
  ctx.roundRect(-size, -size * 0.18, size * 2, size * 0.36, size * 0.18)
  ctx.fill()
  for (const ex of [-1, 1]) {
    for (const ey of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(ex * size, ey * size * 0.22, size * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function skullShape(ctx: Ctx, size: number, color: string): void {
  ctx.beginPath()
  ctx.arc(0, -size * 0.2, size * 0.85, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(-size * 0.5, size * 0.3, size, size * 0.55)
  ctx.fillStyle = color
  for (const ex of [-0.33, 0.33]) {
    ctx.beginPath()
    ctx.arc(ex * size, -size * 0.25, size * 0.24, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.moveTo(0, size * 0.05)
  ctx.lineTo(size * 0.12, size * 0.3)
  ctx.lineTo(-size * 0.12, size * 0.3)
  ctx.closePath()
  ctx.fill()
  for (let i = -1; i <= 1; i++) ctx.fillRect(i * size * 0.26 - size * 0.05, size * 0.45, size * 0.1, size * 0.3)
}

export function drawBubble(ctx: Ctx, x: number, y: number, r: number, pop: number, stroke: number, ink: BrewInk): void {
  if (pop > 0) {
    ctx.globalAlpha = 0.6 * (1 - pop / POP_S)
    ctx.strokeStyle = ink.ring
    ctx.lineWidth = Math.max(0.6, stroke)
    ctx.beginPath()
    ctx.arc(x, y, r * (1 + pop * 6), 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
    return
  }
  ctx.fillStyle = ink.fill
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = BUBBLE_GLINT
  ctx.beginPath()
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2)
  ctx.fill()
}

function dot(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function drawEye(ctx: Ctx, s: number, body: string, bone: string): void {
  ctx.fillStyle = bone
  dot(ctx, 0, 0, s)
  ctx.fillStyle = body
  dot(ctx, s * 0.15, 0, s * 0.5)
  ctx.fillStyle = darken(body, 0.8)
  dot(ctx, s * 0.2, 0, s * 0.22)
}

function drawMushroom(ctx: Ctx, s: number, body: string, bone: string): void {
  ctx.fillStyle = bone
  ctx.fillRect(-s * 0.25, 0, s * 0.5, s)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(0, 0, s, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = bone
  for (const [dx, dy] of [[-0.4, -0.4], [0.35, -0.5], [0, -0.15]]) dot(ctx, dx * s, dy * s, s * 0.14)
}

function drawNewt(ctx: Ctx, s: number, body: string): void {
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 1.1, s * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(s * 1, 0)
  ctx.quadraticCurveTo(s * 1.8, s * 0.1, s * 2.2, -s * 0.5)
  ctx.lineWidth = s * 0.22
  ctx.strokeStyle = body
  ctx.stroke()
  ctx.fillStyle = darken(body, 0.8)
  dot(ctx, -s * 0.6, -s * 0.15, s * 0.1)
}

function drawSpider(ctx: Ctx, s: number, body: string): void {
  const shell = darken(body, 0.45)
  ctx.fillStyle = shell
  dot(ctx, 0, 0, s * 0.6)
  ctx.strokeStyle = shell
  ctx.lineWidth = s * 0.14
  for (let i = 0; i < 4; i++) {
    for (const sd of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(sd * s * 0.4, -s * 0.3 + i * s * 0.22)
      ctx.lineTo(sd * s * 1.2, -s * 0.7 + i * s * 0.35)
      ctx.lineTo(sd * s * 1.5, s * 0.1 + i * s * 0.3)
      ctx.stroke()
    }
  }
}

export function drawIngredient(ctx: Ctx, kind: BrewIngredientKind, s: number, body: string, bone: string): void {
  if (kind === 'eye') drawEye(ctx, s, body, bone)
  else if (kind === 'mushroom') drawMushroom(ctx, s, body, bone)
  else if (kind === 'newt') drawNewt(ctx, s, body)
  else drawSpider(ctx, s, body)
}
