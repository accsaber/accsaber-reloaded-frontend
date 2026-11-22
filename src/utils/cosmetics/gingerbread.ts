import type { BorderGingerbreadOverlaySpec } from '@/types/cosmetics/border'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { framePoint } from '@/utils/cosmetics/overlayCanvas'
import { hash01 } from '@/utils/random'

const TAU = Math.PI * 2
const HEAD = { x: 50, y: -5, r: 13.5 }
const LIMBS: [number, number, number, number][] = [
  [2, 38, -11, 31],
  [98, 38, 111, 31],
  [30, 98, 26, 111],
  [70, 98, 74, 111],
]
const LIMB_WIDTH = 14
const CUFFS: [number, number, number, number][] = [
  [-9.5, 25.5, -4.5, 36.5],
  [109.5, 25.5, 104.5, 36.5],
  [19.5, 106.5, 33.5, 108.5],
  [66.5, 108.5, 80.5, 106.5],
]

export const GINGERBREAD_BITES: [number, number, number][] = [
  [50, -7, 15], [-9, 32, 13], [109, 32, 13], [27, 110, 13], [73, 110, 13],
  [12, 8, 17], [38, 3, 15], [62, 3, 15], [88, 8, 17],
  [4, 30, 14], [4, 55, 15], [5, 80, 15], [96, 30, 14], [96, 55, 15], [95, 80, 15],
  [16, 95, 17], [50, 97, 18], [84, 95, 17],
]

function silhouette(ctx: Ctx, color: string): void {
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineWidth = LIMB_WIDTH
  for (const [ax, ay, bx, by] of LIMBS) {
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.roundRect(0, 0, 100, 100, 16)
  ctx.arc(HEAD.x, HEAD.y, HEAD.r, 0, TAU)
  ctx.fill()
}

function piping(ctx: Ctx): void {
  const steps = 280
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const p = framePoint(u, 4.6)
    const wave = Math.sin(u * TAU * 34)
    ctx.lineTo(p.x + Math.sin(p.angle) * wave, p.y - Math.cos(p.angle) * wave)
  }
  ctx.stroke()
}

function zigzag(ctx: Ctx, ax: number, ay: number, bx: number, by: number): void {
  const peaks = 4
  const len = Math.hypot(bx - ax, by - ay)
  const nx = -(by - ay) / len
  const ny = (bx - ax) / len
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  for (let i = 1; i <= peaks * 2; i++) {
    const t = i / (peaks * 2)
    const side = i % 2 ? 1.5 : -1.5
    ctx.lineTo(ax + (bx - ax) * t + nx * side, ay + (by - ay) * t + ny * side)
  }
  ctx.stroke()
}

function face(ctx: Ctx, o: BorderGingerbreadOverlaySpec, icing: string): void {
  ctx.fillStyle = o.ink
  ctx.strokeStyle = o.ink
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(HEAD.x - 5, HEAD.y - 2, 1.3, 0, TAU)
  ctx.fill()
  ctx.beginPath()
  if (o.face === 'wink') {
    ctx.moveTo(HEAD.x + 3.4, HEAD.y - 2)
    ctx.lineTo(HEAD.x + 6.6, HEAD.y - 2)
    ctx.stroke()
  } else {
    ctx.arc(HEAD.x + 5, HEAD.y - 2, 1.3, 0, TAU)
    ctx.fill()
  }
  ctx.strokeStyle = icing
  ctx.beginPath()
  if (o.face === 'frown') ctx.arc(HEAD.x, HEAD.y + 8.5, 5.5, Math.PI * 1.22, Math.PI * 1.78)
  else ctx.arc(HEAD.x, HEAD.y, 5.5, Math.PI * 0.18, Math.PI * 0.82)
  ctx.stroke()
}

function bow(ctx: Ctx, color: string, knot: string): void {
  ctx.fillStyle = color
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(50, 5.4)
    ctx.lineTo(50 + side * 6.4, 2.2)
    ctx.lineTo(50 + side * 6.4, 8.6)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = knot
  ctx.beginPath()
  ctx.arc(50, 5.4, 1.5, 0, TAU)
  ctx.fill()
}

function gumdrops(ctx: Ctx, colors: string[]): void {
  colors.slice(0, 3).forEach((color, i) => {
    const x = 39 + i * 11
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, 95.4, 2.3, 0, TAU)
    ctx.fill()
  })
}

function sprinkles(ctx: Ctx, colors: string[]): void {
  ctx.lineWidth = 0.9
  ctx.lineCap = 'round'
  for (let i = 0; i < 30; i++) {
    const p = framePoint(hash01(i * 3.7 + 1), 1.6 + hash01(i * 9.1) * 6)
    const a = hash01(i * 5.3) * Math.PI
    ctx.strokeStyle = colors[i % colors.length]
    ctx.beginPath()
    ctx.moveTo(p.x - Math.cos(a) * 1.1, p.y - Math.sin(a) * 1.1)
    ctx.lineTo(p.x + Math.cos(a) * 1.1, p.y + Math.sin(a) * 1.1)
    ctx.stroke()
  }
}

export function paintGingerbread(ctx: Ctx, o: BorderGingerbreadOverlaySpec, icing: string): void {
  silhouette(ctx, o.cookie)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.strokeStyle = icing
  ctx.lineWidth = 0.9
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (o.sprinkles?.length) sprinkles(ctx, o.sprinkles)
  else piping(ctx)
  ctx.strokeStyle = icing
  ctx.lineWidth = 1
  for (const [ax, ay, bx, by] of CUFFS) zigzag(ctx, ax, ay, bx, by)
  face(ctx, o, icing)
  bow(ctx, o.bow, icing)
  gumdrops(ctx, o.gumdrops)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.roundRect(9, 9, 82, 82, 11)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
}

export function biteMark(ctx: Ctx, x: number, y: number, r: number): void {
  const teeth = 9
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  for (let k = 0; k < teeth; k++) {
    const a = (k / teeth) * TAU + x
    ctx.moveTo(x + Math.cos(a) * r + r * 0.22, y + Math.sin(a) * r)
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.22, 0, TAU)
  }
}
