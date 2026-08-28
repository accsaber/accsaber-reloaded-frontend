import { lerpHex, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01 } from '@/utils/random'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

export interface HorrorFaceColors {
  figure: string
  face: string
}

export interface HorrorFaceOptions {
  hair?: number
}

type Pt = [number, number]

const FACE_W = 40
const FACE_H = 52
const FACE_RES = 2
const BLACK = '#000000'
const FACE_TINTS = ['#8a1a12', '#56682a', '#7a5638', '']
let faceLayer: HTMLCanvasElement | null = null

function circle(o: Ctx, x: number, y: number, r: number): void {
  o.beginPath()
  o.arc(x, y, Math.max(0, r), 0, Math.PI * 2)
  o.fill()
}

function ellipse(o: Ctx, x: number, y: number, rx: number, ry: number): void {
  o.beginPath()
  o.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2)
  o.fill()
}

function faceContext(): Ctx | null {
  if (!faceLayer) {
    faceLayer = document.createElement('canvas')
    faceLayer.width = FACE_W * FACE_RES
    faceLayer.height = FACE_H * FACE_RES
  }
  return faceLayer.getContext('2d')
}

function lightPoint(seed: number): Pt {
  const side = hash01(seed * 5) < 0.5 ? -1 : 1
  return [20 + side * (5 + hash01(seed * 9) * 5), 22 + hash01(seed * 11) * 8]
}

function paintHeadMass(o: Ctx, seed: number, c: HorrorFaceColors): void {
  o.fillStyle = c.figure
  ellipse(o, 20, 29, 18 + hash01(seed * 3) * 3, 33)
  for (let i = 0; i < 5; i++) {
    ellipse(o, 3 + hash01(seed * 41 + i) * 34, 16 + hash01(seed * 43 + i) * 30, 4 + hash01(seed * 47 + i) * 5, 8 + hash01(seed * 53 + i) * 8)
  }
}

function paintLitSkin(o: Ctx, seed: number, c: HorrorFaceColors): void {
  const skin = lerpHex(c.face, c.figure, 0.2 + hash01(seed * 31) * 0.25)
  o.fillStyle = skin
  ellipse(o, 20, 28, 12, 17)
  const [lx, ly] = lightPoint(seed)
  const sh = o.createRadialGradient(lx, ly, 3, lx, ly, 19)
  sh.addColorStop(0, withAlpha(c.figure, 0))
  sh.addColorStop(0.55, withAlpha(c.figure, 0.2))
  sh.addColorStop(1, withAlpha(c.figure, 0.85))
  o.fillStyle = sh
  ellipse(o, 20, 28, 12.5, 17.5)
}

function paintEye(o: Ctx, ex: number, ey: number, lit: number, hollow: boolean, seed: number, c: HorrorFaceColors): void {
  const g = o.createRadialGradient(ex, ey, 0.5, ex, ey, 6.5)
  g.addColorStop(0, withAlpha(c.figure, 0.95))
  g.addColorStop(1, withAlpha(c.figure, 0))
  o.fillStyle = g
  ellipse(o, ex, ey, 6.5, 5.2)
  if (hollow) {
    o.fillStyle = c.figure
    ellipse(o, ex, ey, 4.4, 3.4)
    o.fillStyle = withAlpha(c.face, 0.45 + 0.4 * lit)
    circle(o, ex + 1.2, ey - 0.8, 0.8)
    circle(o, ex - 1.6, ey + 0.6, 0.45)
    return
  }
  o.fillStyle = withAlpha(lighten(c.face, 0.7), 0.65 + 0.35 * lit)
  ellipse(o, ex, ey, 4.2, 3)
  const ix = ex + (hash01(seed * 61 + ex) - 0.5) * 2.6
  o.fillStyle = lerpHex(c.figure, c.face, 0.15)
  circle(o, ix, ey, 2)
  o.fillStyle = c.figure
  circle(o, ix, ey, 0.9)
}

function paintFeatures(o: Ctx, seed: number, c: HorrorFaceColors): void {
  const [lx] = lightPoint(seed)
  const hollow = hash01(seed * 7 + 1) < 0.2
  for (const side of [-1, 1]) {
    const ex = 20 + side * 7 + (hash01(seed * 13 + side) - 0.5) * 2
    const ey = 24 + (hash01(seed * 17 + side) - 0.5) * 4
    const lit = Math.max(0.25, 1 - Math.abs(ex - lx) / 18)
    paintEye(o, ex, ey, lit, hollow, seed + side, c)
  }
  o.fillStyle = withAlpha(c.figure, 0.5)
  ellipse(o, 20.5, 31, 2.4, 4)
  if (hash01(seed * 43 + 3) < 0.6) {
    o.fillStyle = withAlpha(c.figure, 0.75)
    ellipse(o, 20 + (hash01(seed * 47) - 0.5) * 5, 38 + hash01(seed * 37) * 3, 3 + hash01(seed * 53) * 4, 1.2 + hash01(seed * 59) * 2.2)
  }
}

function paintStrands(o: Ctx, seed: number, c: HorrorFaceColors, hair: number): void {
  o.strokeStyle = c.figure
  const count = Math.round(14 * hair)
  for (let i = 0; i < count; i++) {
    const hx = 4 + hash01(seed * 71 + i) * 32
    const short = hash01(seed * 67 + i) < 0.4 / hair
    const len = (short ? 6 + hash01(seed * 73 + i) * 10 : 14 + hash01(seed * 73 + i) * 26) * Math.min(1.6, hair)
    const drift = (hash01(seed * 79 + i) - 0.5) * 10
    o.lineWidth = 0.7 + hash01(seed * 83 + i) * 0.9
    o.globalAlpha = 0.7 + hash01(seed * 89 + i) * 0.3
    o.beginPath()
    o.moveTo(hx, 2)
    o.quadraticCurveTo(hx + drift, 2 + len * 0.5, hx + drift * 1.5, 2 + len)
    o.stroke()
  }
  o.globalAlpha = 1
}

function paintShadowBands(o: Ctx, seed: number, c: HorrorFaceColors): void {
  o.fillStyle = withAlpha(c.figure, 0.5)
  for (let i = 0; i < 2; i++) {
    o.save()
    o.translate(20, 26)
    o.rotate((hash01(seed * 91 + i) - 0.5) * 0.8)
    o.fillRect(-30, 5 + hash01(seed * 97 + i) * 12, 60, 2 + hash01(seed * 101 + i) * 4)
    o.restore()
  }
}

function paintVignetteAndGrain(o: Ctx, seed: number, tinted: boolean, c: HorrorFaceColors): void {
  const tint = FACE_TINTS[Math.floor(hash01(seed * 103) * FACE_TINTS.length)]
  o.globalCompositeOperation = 'source-atop'
  if (tint && tinted) {
    o.fillStyle = withAlpha(tint, 0.3)
    o.fillRect(0, 0, FACE_W, FACE_H)
  }
  for (let i = 0; i < 90; i++) {
    const dark = Math.random() < 0.6
    o.fillStyle = withAlpha(dark ? c.figure : c.face, dark ? 0.4 : 0.12)
    o.fillRect(Math.random() * FACE_W, Math.random() * FACE_H, 1, 1)
  }
  o.globalCompositeOperation = 'destination-in'
  const v = o.createRadialGradient(20, 26, 6, 20, 26, 25)
  v.addColorStop(0, withAlpha(BLACK, 1))
  v.addColorStop(0.7, withAlpha(BLACK, 0.85))
  v.addColorStop(1, withAlpha(BLACK, 0))
  o.fillStyle = v
  o.fillRect(0, 0, FACE_W, FACE_H)
  o.globalCompositeOperation = 'source-over'
}

function paintFace(seed: number, tinted: boolean, c: HorrorFaceColors, hair: number): HTMLCanvasElement | null {
  const o = faceContext()
  if (!o || !faceLayer) return null
  o.setTransform(FACE_RES, 0, 0, FACE_RES, 0, 0)
  o.clearRect(0, 0, FACE_W, FACE_H)
  paintHeadMass(o, seed, c)
  paintLitSkin(o, seed, c)
  paintFeatures(o, seed, c)
  paintStrands(o, seed, c, hair)
  paintShadowBands(o, seed, c)
  paintVignetteAndGrain(o, seed, tinted, c)
  return faceLayer
}

export function drawHorrorFace(ctx: Ctx, cx: number, cy: number, H: number, seed: number, c: HorrorFaceColors, opts: HorrorFaceOptions = {}): void {
  const layer = paintFace(seed, H >= 36, c, opts.hair ?? 1)
  if (!layer) return
  const tilt = (hash01(seed * 107) - 0.5) * 0.5
  const k = H / 40
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tilt)
  ctx.scale(k, k)
  ctx.globalAlpha = 0.35
  ctx.drawImage(layer, -20 + (Math.random() - 0.5) * 2, -26 + (Math.random() - 0.5) * 1.5, FACE_W, FACE_H)
  ctx.globalAlpha = 1
  const strips = 4
  const sh = FACE_H / strips
  for (let i = 0; i < strips; i++) {
    const tear = Math.random() < 0.3 ? (Math.random() - 0.5) * 3 : 0
    ctx.drawImage(layer, 0, i * sh * FACE_RES, FACE_W * FACE_RES, sh * FACE_RES, -20 + tear, -26 + i * sh, FACE_W, sh)
  }
  ctx.fillStyle = withAlpha(c.figure, 0.4)
  for (let i = 0; i < 2; i++) ctx.fillRect(-22, -26 + Math.random() * FACE_H, 44, 1)
  ctx.restore()
}
