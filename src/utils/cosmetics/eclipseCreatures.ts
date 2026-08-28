import type { EclipseCreatureKind } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

export interface CreaturePalette {
  shadow: string
  corona: string
}

export interface CreaturePose {
  x: number
  y: number
  s: number
  t: number
  dir: number
  seed: number
}

type Painter = (ctx: Ctx, p: CreaturePose, pal: CreaturePalette) => void

function begin(ctx: Ctx, p: CreaturePose, pal: CreaturePalette): void {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.scale(p.dir * p.s, p.s)
  ctx.fillStyle = pal.shadow
  ctx.strokeStyle = withAlpha(pal.corona, 0.55)
  ctx.lineWidth = 0.35
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
}

function body(ctx: Ctx, pts: [number, number][]): void {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function eyes(ctx: Ctx, pal: CreaturePalette, pts: [number, number][], r = 0.32): void {
  ctx.fillStyle = pal.corona
  for (const [x, y] of pts) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function legs(ctx: Ctx, t: number, y: number, spread: number, len: number): void {
  const g = Math.sin(t * 6)
  ctx.beginPath()
  ctx.rect(-spread - 0.5, y, 1, len + g * 0.5)
  ctx.rect(spread - 0.5, y, 1, len - g * 0.5)
  ctx.fill()
}

const reaper: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  body(ctx, [[-2.8, 0], [-2.2, -3.5], [-1.2, -6.2], [0, -7.4], [1.2, -6.2], [2.2, -3.5], [2.8, 0]])
  ctx.beginPath()
  ctx.ellipse(0, -5.4, 1.1, 0.8, 0, 0, Math.PI * 2)
  ctx.fillStyle = withAlpha(pal.corona, 0.12)
  ctx.fill()
  eyes(ctx, pal, [[-0.45, -5.5], [0.45, -5.5]], 0.22)
  ctx.strokeStyle = pal.shadow
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(3.2, 0.2)
  ctx.lineTo(3.2, -9)
  ctx.stroke()
  ctx.fillStyle = pal.shadow
  ctx.beginPath()
  ctx.moveTo(3.2, -9)
  ctx.quadraticCurveTo(-1 + Math.sin(p.t * 2) * 0.3, -10.4, -3, -8.2)
  ctx.quadraticCurveTo(-0.4, -9, 3.2, -8)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const brute: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  legs(ctx, p.t, -2.6, 1.6, 2.6)
  body(ctx, [[-3, -2.4], [-3, -6.6], [-1.6, -6.6], [-1.6, -8.8], [1.6, -8.8], [1.6, -6.6], [3, -6.6], [3, -2.4]])
  ctx.fillRect(-2.2, -8, 0.6, 0.7)
  ctx.fillRect(1.6, -8, 0.6, 0.7)
  ctx.fillStyle = pal.corona
  ctx.fillRect(-1.1, -7.9, 0.7, 0.5)
  ctx.fillRect(0.4, -7.9, 0.7, 0.5)
  ctx.fillStyle = pal.shadow
  ctx.beginPath()
  ctx.rect(-4.2, -6.2, 1.2, 3.6)
  ctx.rect(3, -6.2, 1.2, 3.6)
  ctx.fill()
  ctx.restore()
}

const swampthing: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  legs(ctx, p.t, -2.4, 1.5, 2.4)
  body(ctx, [[-3.4, -2.2], [-3.8, -5.5], [-2.4, -8.2], [0, -9], [2.4, -8.2], [3.8, -5.5], [3.4, -2.2]])
  for (let i = 0; i < 4; i++) {
    const drop = ((p.t * 1.3 + i * 0.7) % 1)
    ctx.fillRect(-2.4 + i * 1.6, -5 + drop * 4, 0.5, 1.2)
  }
  eyes(ctx, pal, [[-0.9, -7], [0.9, -7]], 0.28)
  ctx.beginPath()
  ctx.rect(-4.6, -6, 1.1, 3)
  ctx.rect(3.5, -6, 1.1, 3)
  ctx.fillStyle = pal.shadow
  ctx.fill()
  ctx.restore()
}

const deepone: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  legs(ctx, p.t, -2.2, 1.2, 2.2)
  body(ctx, [[-2.4, -2], [-2.8, -5.6], [-1.4, -7.8], [0, -8.2], [1.4, -7.8], [2.8, -5.6], [2.4, -2]])
  body(ctx, [[0, -8.2], [-0.8, -10.4], [0.8, -9.8]])
  body(ctx, [[-2.8, -5.2], [-4.6, -6.6], [-4.2, -4.2]])
  body(ctx, [[2.8, -5.2], [4.6, -6.6], [4.2, -4.2]])
  eyes(ctx, pal, [[-1, -6.6], [1, -6.6]], 0.36)
  ctx.restore()
}

const vampire: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  body(ctx, [[-3.2, 0], [-2.2, -4], [-1.2, -6.4], [0, -7], [1.2, -6.4], [2.2, -4], [3.2, 0]])
  ctx.beginPath()
  ctx.arc(0, -7.8, 1.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  const flare = 0.6 + 0.4 * Math.sin(p.t * 3)
  body(ctx, [[-2.2, -5.5], [-5 * flare, -8.5], [-3.6, -3], [-2.6, -1]])
  body(ctx, [[2.2, -5.5], [5 * flare, -8.5], [3.6, -3], [2.6, -1]])
  eyes(ctx, pal, [[-0.45, -8], [0.45, -8]], 0.22)
  ctx.restore()
}

const wolf: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  const g = Math.sin(p.t * 9)
  body(ctx, [[-4, -3.2], [-3.6, -4.6], [1.6, -4.8], [3.4, -6.4], [4.8, -6], [5.2, -4.8], [4.2, -3.4], [2.4, -3], [-2, -2.8]])
  ctx.beginPath()
  ctx.rect(-3.4, -3, 0.8, 3 + g * 0.6)
  ctx.rect(-1.4, -3, 0.8, 3 - g * 0.6)
  ctx.rect(1.6, -3, 0.8, 3 - g * 0.5)
  ctx.rect(3, -3, 0.8, 3 + g * 0.5)
  ctx.fill()
  body(ctx, [[-4, -3.6], [-6.4, -5.6], [-5, -3]])
  eyes(ctx, pal, [[4.2, -5.6]], 0.24)
  ctx.restore()
}

const butcher: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  legs(ctx, p.t, -2.6, 1.4, 2.6)
  body(ctx, [[-3, -2.4], [-3.2, -7], [-1.4, -8.4], [1.4, -8.4], [3.2, -7], [3, -2.4]])
  ctx.fillStyle = withAlpha(pal.corona, 0.18)
  ctx.fillRect(-1.6, -6.4, 3.2, 4)
  ctx.fillStyle = pal.shadow
  const buzz = Math.sin(p.t * 40) * 0.15
  ctx.fillRect(3, -5.6 + buzz, 4.4, 1.2)
  ctx.beginPath()
  for (let i = 0; i < 6; i++) ctx.rect(3.2 + i * 0.75, -6.1 + buzz, 0.35, 0.5)
  ctx.fill()
  eyes(ctx, pal, [[-0.7, -7.4], [0.7, -7.4]], 0.24)
  ctx.restore()
}

const psycho: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  legs(ctx, p.t, -2.4, 1.1, 2.4)
  body(ctx, [[-2, -2.2], [-2.2, -6.6], [-1.2, -8.4], [1.2, -8.4], [2.2, -6.6], [2, -2.2]])
  const stab = Math.max(0, Math.sin(p.t * 5)) * 1.5
  body(ctx, [[2, -6], [4.6 + stab, -7.4], [5.4 + stab, -6.8], [2.4, -4.6]])
  ctx.fillStyle = withAlpha(pal.corona, 0.8)
  ctx.fillRect(4.2 + stab, -7.2, 1.4, 0.35)
  eyes(ctx, pal, [[-0.5, -7.6], [0.5, -7.6]], 0.2)
  ctx.restore()
}

const nailhead: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  legs(ctx, p.t, -2.6, 1.4, 2.6)
  body(ctx, [[-2.6, -2.4], [-2.8, -6.4], [-1.8, -8.6], [1.8, -8.6], [2.8, -6.4], [2.6, -2.4]])
  ctx.strokeStyle = pal.shadow
  ctx.lineWidth = 0.4
  for (let i = 0; i < 5; i++) {
    const a = -2.4 + i * 0.6
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 1.6, -7.6 + Math.sin(a) * 1.2)
    ctx.lineTo(Math.cos(a) * 3.6, -7.6 + Math.sin(a) * 3)
    ctx.stroke()
  }
  eyes(ctx, pal, [[-0.6, -7.2], [0.6, -7.2]], 0.26)
  ctx.restore()
}

const manfly: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  legs(ctx, p.t, -2.4, 1.2, 2.4)
  body(ctx, [[-2.2, -2.2], [-2.4, -6.4], [-1.4, -7.4], [1.4, -7.4], [2.4, -6.4], [2.2, -2.2]])
  ctx.beginPath()
  ctx.ellipse(0, -8.6, 1.8, 1.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  eyes(ctx, pal, [[-0.9, -8.8], [0.9, -8.8]], 0.6)
  ctx.fillStyle = pal.shadow
  ctx.beginPath()
  ctx.arc(-0.9, -8.8, 0.3, 0, Math.PI * 2)
  ctx.arc(0.9, -8.8, 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(-2.2, -5.8, 0.8, 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const zombie: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  const g = Math.sin(p.t * 4)
  ctx.beginPath()
  ctx.rect(-1.6, -2.6, 0.9, 2.6 + g * 0.4)
  ctx.rect(0.7, -2.6, 0.9, 2.6 - g * 0.4)
  ctx.fill()
  body(ctx, [[-2, -2.4], [-2.4, -6.2], [-1.2, -7.2], [1.2, -7.2], [2.4, -6.2], [2, -2.4]])
  ctx.beginPath()
  ctx.arc(0.3, -8.2, 1.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillRect(-2.2, -6, 5.2, 0.9)
  ctx.fillRect(2.4, -6, 0.9, 1.6)
  eyes(ctx, pal, [[0.9, -8.4]], 0.24)
  ctx.restore()
}

const eye: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  ctx.beginPath()
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = withAlpha(pal.corona, 0.4)
    ctx.lineWidth = 0.25
    ctx.beginPath()
    ctx.moveTo(Math.cos(i * 1.6) * 1.2, Math.sin(i * 1.6) * 1.2)
    ctx.lineTo(Math.cos(i * 1.6 + 0.4) * 2.3, Math.sin(i * 1.6 + 0.4) * 2.3)
    ctx.stroke()
  }
  eyes(ctx, pal, [[Math.sin(p.t * 1.3) * 0.5, 0]], 1.1)
  ctx.fillStyle = pal.shadow
  ctx.beginPath()
  ctx.arc(Math.sin(p.t * 1.3) * 0.6, 0, 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const wisp: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  const f = 0.8 + 0.2 * Math.sin(p.t * 7 + p.seed)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 3.2 * f)
  g.addColorStop(0, withAlpha(pal.corona, 0.9))
  g.addColorStop(0.4, withAlpha(pal.corona, 0.35))
  g.addColorStop(1, withAlpha(pal.corona, 0))
  ctx.fillStyle = g
  ctx.fillRect(-3.5, -3.5, 7, 7)
  ctx.fillStyle = pal.shadow
  ctx.beginPath()
  ctx.arc(-0.4, -0.2, 0.25, 0, Math.PI * 2)
  ctx.arc(0.4, -0.2, 0.25, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const skull: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  ctx.beginPath()
  ctx.arc(0, -0.4, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillRect(-1.2, 1, 2.4, 1.3)
  eyes(ctx, pal, [[-0.75, -0.6], [0.75, -0.6]], 0.5)
  ctx.fillStyle = pal.shadow
  for (let i = -1; i <= 1; i++) ctx.fillRect(i * 0.7 - 0.15, 1.3, 0.3, 0.9)
  ctx.restore()
}

const sphere: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  ctx.rotate(p.t * 9)
  ctx.beginPath()
  ctx.arc(0, 0, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = pal.shadow
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    body(ctx, [[Math.cos(a) * 1.8, Math.sin(a) * 1.8], [Math.cos(a + 0.35) * 3.1, Math.sin(a + 0.35) * 3.1], [Math.cos(a + 0.55) * 1.8, Math.sin(a + 0.55) * 1.8]])
  }
  eyes(ctx, pal, [[0, 0]], 0.6)
  ctx.restore()
}

function wings(ctx: Ctx, flap: number, span: number, sweep: number): void {
  for (const sd of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, -0.6)
    ctx.quadraticCurveTo(sd * span * 0.9 * flap, -sweep, sd * span * flap, 0.2)
    ctx.quadraticCurveTo(sd * span * 0.55 * flap, sweep * 0.6, 0, 0.8)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

const moth: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  const flap = 0.55 + 0.45 * Math.sin(p.t * 18 + p.seed)
  ctx.beginPath()
  ctx.ellipse(0, 0, 0.5, 1.5, 0, 0, Math.PI * 2)
  ctx.fill()
  wings(ctx, flap, 3.4, 2.6)
  ctx.fillStyle = withAlpha(pal.corona, 0.5)
  for (const sd of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(sd * 2 * flap, -0.4, 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

const mothron: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  const flap = 0.6 + 0.4 * Math.sin(p.t * 9 + p.seed)
  ctx.beginPath()
  ctx.ellipse(0, 0, 0.9, 2.6, 0, 0, Math.PI * 2)
  ctx.fill()
  wings(ctx, flap, 5.6, 4)
  ctx.strokeStyle = pal.shadow
  ctx.lineWidth = 0.3
  for (const sd of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sd * 0.4, -2.4)
    ctx.quadraticCurveTo(sd * 1.6, -4, sd * 2.4, -3.6)
    ctx.stroke()
  }
  eyes(ctx, pal, [[-0.4, -1.8], [0.4, -1.8]], 0.28)
  ctx.restore()
}

const bigbat: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  const flap = 0.5 + 0.5 * Math.sin(p.t * 11 + p.seed)
  ctx.beginPath()
  ctx.ellipse(0, 0, 0.9, 1.6, 0, 0, Math.PI * 2)
  ctx.fill()
  for (const sd of [-1, 1]) {
    body(ctx, [[0, -0.6], [sd * 2.6, -2.4 * flap - 0.6], [sd * 5.2, -1.2 * flap], [sd * 4, 0.6], [sd * 2.6, 0.2], [sd * 1.2, 1.2]])
    body(ctx, [[sd * 0.3, -1.4], [sd * 0.9, -2.8], [sd * 1.3, -1.2]])
  }
  eyes(ctx, pal, [[-0.4, -0.6], [0.4, -0.6]], 0.24)
  ctx.restore()
}

const raven: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  const flap = Math.sin(p.t * 12 + p.seed)
  body(ctx, [[-1.8, 0.3], [-2.6, -0.3], [0.6, -0.9], [1.8, -0.6], [2.6, -0.2], [1.6, 0.2], [0, 0.8]])
  for (const sd of [-1, 1]) body(ctx, [[sd * 0.3, -0.3], [sd * 2.2, -1.6 * flap - 0.8], [sd * 3.8, -0.4 * flap], [sd * 1.6, 0.4]])
  eyes(ctx, pal, [[1.7, -0.5]], 0.18)
  ctx.restore()
}

const fly: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  ctx.beginPath()
  ctx.ellipse(0, 0, 0.7, 1.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(pal.corona, 0.45)
  ctx.lineWidth = 0.25
  const flap = Math.sin(p.t * 40 + p.seed)
  for (const sd of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(sd * 1.1, -0.5 + flap * 0.2, 1.1, 0.5, sd * 0.5, 0, Math.PI * 2)
    ctx.stroke()
  }
  eyes(ctx, pal, [[-0.3, -0.7], [0.3, -0.7]], 0.22)
  ctx.restore()
}

const dragonfly: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  ctx.fillRect(-0.35, -0.5, 0.7, 4.2)
  ctx.beginPath()
  ctx.arc(0, -0.8, 0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(pal.corona, 0.5)
  ctx.lineWidth = 0.25
  const flap = Math.sin(p.t * 30 + p.seed) * 0.3
  for (const sd of [-1, 1]) {
    for (const yy of [0, 1.2]) {
      ctx.beginPath()
      ctx.ellipse(sd * 2.1, yy + flap * sd, 2, 0.45, sd * 0.15, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  eyes(ctx, pal, [[-0.3, -1], [0.3, -1]], 0.22)
  ctx.restore()
}

const bat: Painter = (ctx, p, pal) => {
  begin(ctx, p, pal)
  const f = Math.sin(p.t * 22 + p.seed) * 1.2
  ctx.strokeStyle = pal.shadow
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.moveTo(-2.4, -f)
  ctx.quadraticCurveTo(-1.2, 0.6, 0, 0)
  ctx.quadraticCurveTo(1.2, 0.6, 2.4, -f)
  ctx.stroke()
  ctx.restore()
}

const PAINTERS: Record<EclipseCreatureKind, Painter> = {
  reaper, brute, swampthing, deepone, vampire, wolf, butcher, psycho, nailhead, manfly, zombie,
  eye, wisp, skull, sphere,
  moth, mothron, bigbat, raven, fly, dragonfly,
  bat,
}

export function drawCreature(ctx: Ctx, kind: EclipseCreatureKind, pose: CreaturePose, pal: CreaturePalette): void {
  const painter = PAINTERS[kind]
  if (painter) painter(ctx, pose, pal)
}
