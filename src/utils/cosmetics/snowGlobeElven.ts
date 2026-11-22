import { sparkle, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import {
  blob,
  deerShape,
  disc,
  drawPine,
  ease,
  groundY,
  inDome,
  line,
  makePine,
  poly,
  quadPoint,
  snowCap,
  TAU,
  type GlobeEnv,
  type GlobePoint,
  type GlobeScene,
  type Palette,
} from '@/utils/cosmetics/snowGlobeKit'
import { randBetween as rand } from '@/utils/random'

interface Puff {
  x: number
  y: number
  born: number
}

interface Pose extends GlobePoint {
  angle: number
}

const HOUSES: { x: number; s: number; roof: 'accent' | 'pine' }[] = [
  { x: 25, s: 1.25, roof: 'accent' },
  { x: 56, s: 1, roof: 'pine' },
  { x: 74, s: 1.3, roof: 'accent' },
]
const HOUSE_SNOW = HOUSES.map((h) => snowCap([-6.8, -5.6, 0, -15.4, 6.8, -5.6], 1.6, h.x))
const TREE = makePine(41, 20)
const TREE_BULBS = [[-0.1, -0.78], [0.08, -0.62], [-0.16, -0.52], [0.14, -0.4], [-0.05, -0.36], [-0.22, -0.26], [0.2, -0.2], [0.02, -0.16]]
const TREE_TOP = { x: TREE.x, y: groundY(TREE.x) - TREE.h + 2 }
const RAIL = { from: 27, to: 73 }
const CAR_GAP = 5.6
const TRAIN_REST_S = 3.5
const TUNNEL = { mouth: 2.4, hide: 4.5 }
const TUNNELS: [number, number][] = [[RAIL.from - 1, 1], [RAIL.to + 1, -1]]
const MOUTHS = { from: RAIL.from - 1 + TUNNEL.mouth, to: RAIL.to + 1 - TUNNEL.mouth }
const PUFF_LIFE_S = 1.4
const SLEIGH_PERIOD_S = 12
const SLEIGH_FLIGHT_S = 6
const TEAM = [0.06, 0.115, 0.17]

function railY(x: number): number {
  return 78.4 + 1.1 * Math.sin((Math.PI * (x - RAIL.from)) / (RAIL.to - RAIL.from))
}

function rails(ctx: Ctx, env: GlobeEnv): void {
  ctx.strokeStyle = withAlpha(env.o.ink, 0.5)
  ctx.lineWidth = 0.5
  for (let x = RAIL.from + 1; x < RAIL.to; x += 2.6) line(ctx, x, railY(x) - 0.8, x, railY(x) + 0.6)
  ctx.strokeStyle = withAlpha(env.o.ink, 0.8)
  ctx.lineWidth = 0.4
  ctx.beginPath()
  for (let x = RAIL.from; x <= RAIL.to; x += 2) ctx.lineTo(x, railY(x))
  ctx.stroke()
}

function wheels(ctx: Ctx, color: string, xs: number[]): void {
  ctx.fillStyle = color
  for (const x of xs) disc(ctx, x, -0.6, 0.75)
}

function loco(ctx: Ctx, o: Palette): void {
  ctx.fillStyle = o.accent
  ctx.fillRect(-2.6, -3, 5.2, 2.2)
  ctx.fillStyle = o.pine
  ctx.fillRect(-2.6, -5, 2.2, 2.2)
  ctx.fillStyle = o.ink
  ctx.fillRect(1.2, -4.7, 0.9, 1.8)
  ctx.fillStyle = o.light
  disc(ctx, 2.5, -2.3, 0.45)
  wheels(ctx, o.ink, [-1.7, 0, 1.7])
}

function wagon(ctx: Ctx, o: Palette, body: string): void {
  ctx.fillStyle = body
  ctx.fillRect(-2.2, -2.8, 4.4, 2)
  ctx.fillStyle = o.accent
  ctx.fillRect(-1.4, -3.9, 1.2, 1.1)
  ctx.fillRect(0.3, -3.6, 1, 0.8)
  wheels(ctx, o.ink, [-1.3, 1.3])
}

function drawCar(ctx: Ctx, env: GlobeEnv, x: number, index: number): void {
  const o = env.o
  ctx.save()
  ctx.translate(x, railY(x))
  ctx.scale(1.25, 1.25)
  if (index === 0) loco(ctx, o)
  else wagon(ctx, o, index === 1 ? o.pine : o.light)
  ctx.restore()
}

function tunnel(ctx: Ctx, env: GlobeEnv, x: number, dir: number, cover: boolean): void {
  const o = env.o
  ctx.save()
  ctx.translate(x, railY(x) + 0.6)
  ctx.scale(dir, 1)
  if (cover) {
    blob(ctx, [-7.5, 2.5, -6.8, -5, -2.4, -10.6, 1.6, -10.4, TUNNEL.mouth, -5, TUNNEL.mouth, 2.5], o.snow)
    ctx.fillRect(-2, -8, TUNNEL.mouth + 2, 10.5)
  } else {
    blob(ctx, [-7.5, 2.5, -6.8, -5, -2.4, -10.6, 3.4, -9.6, 7, -4, 7.6, 2.5], o.snow)
    ctx.fillStyle = o.ink
    ctx.beginPath()
    ctx.ellipse(TUNNEL.mouth, 0.4, 2.6, 7.6, 0, Math.PI, TAU)
    ctx.fill()
  }
  ctx.restore()
}

function cottage(ctx: Ctx, env: GlobeEnv, i: number, glow: number): void {
  const o = env.o
  const house = HOUSES[i]
  ctx.save()
  ctx.translate(house.x, groundY(house.x) + 0.6)
  ctx.scale(house.s, house.s)
  ctx.fillStyle = o.body
  ctx.fillRect(-4.5, -6, 9, 6)
  poly(ctx, [0, -15, 6.2, -5.6, -6.2, -5.6], o[house.roof])
  blob(ctx, HOUSE_SNOW[i], o.snow)
  ctx.fillStyle = o.ink
  ctx.fillRect(-1, -3.4, 2, 3.4)
  ctx.fillStyle = withAlpha(o.light, 0.4 + 0.6 * glow)
  disc(ctx, 0, -8.2, 1.2)
  ctx.fillRect(2, -4.6, 1.6, 1.6)
  ctx.restore()
}

function bulbAlpha(env: GlobeEnv, i: number, n: number, glow: number, flash: number): number {
  if (flash > 0) return Math.floor(env.clock * 10) % n === i % n ? 1 : 0.25
  return 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(env.clock * (2 + glow * 3) + i * 1.9))
}

function tree(ctx: Ctx, env: GlobeEnv, glow: number, flash: number): void {
  const o = env.o
  const gy = groundY(TREE.x)
  drawPine(ctx, TREE, env.o, env.shed)
  TREE_BULBS.forEach(([dx, dy], i) => {
    ctx.fillStyle = withAlpha(o.lights[i % o.lights.length], bulbAlpha(env, i, TREE_BULBS.length, glow, flash))
    disc(ctx, TREE.x + dx * TREE.h, gy + dy * TREE.h, 0.7)
  })
  ctx.fillStyle = o.light
  sparkle(ctx, TREE.x, gy - TREE.h - 1, 2.2)
}

function garland(ctx: Ctx, env: GlobeEnv, a: GlobePoint, b: GlobePoint, glow: number, flash: number): void {
  const o = env.o
  const sag = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 5 }
  ctx.strokeStyle = withAlpha(o.ink, 0.7)
  ctx.lineWidth = 0.3
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.quadraticCurveTo(sag.x, sag.y, b.x, b.y)
  ctx.stroke()
  for (let j = 1; j <= 5; j++) {
    const p = quadPoint(a, sag, b, j / 6)
    const id = j + Math.round(a.x)
    ctx.fillStyle = withAlpha(o.lights[id % o.lights.length], bulbAlpha(env, id, 5, glow, flash))
    disc(ctx, p.x, p.y + 0.4, 0.55)
  }
}

function roofPeak(i: number): GlobePoint {
  const h = HOUSES[i]
  return { x: h.x, y: groundY(h.x) + 0.6 - 15 * h.s }
}

function village(ctx: Ctx, env: GlobeEnv, glow: number, flash: number): void {
  HOUSES.forEach((_, i) => cottage(ctx, env, i, glow))
  tree(ctx, env, glow, flash)
  garland(ctx, env, roofPeak(0), TREE_TOP, glow, flash)
  garland(ctx, env, TREE_TOP, roofPeak(1), glow, flash)
  garland(ctx, env, roofPeak(1), roofPeak(2), glow, flash)
}

function flightPose(u: number): Pose {
  const at = (v: number): GlobePoint => ({
    x: 6 + 88 * v,
    y: 25 - 7 * Math.sin(Math.PI * v) + 3.2 * Math.sin(v * 10 + 0.6),
  })
  const a = at(u)
  const b = at(u + 0.01)
  return { ...a, angle: Math.atan2(b.y - a.y, b.x - a.x) }
}

function sled(ctx: Ctx, o: Palette, seat: Pose): void {
  ctx.save()
  ctx.translate(seat.x, seat.y)
  ctx.rotate(seat.angle)
  poly(ctx, [-3.4, -2.6, -3.4, 0.2, 1.6, 0.2, 2.8, -1.2, 0.4, -1.2, 0.2, -2.6], o.accent)
  ctx.strokeStyle = o.light
  ctx.lineWidth = 0.35
  line(ctx, -3.8, 0.9, 2.4, 0.9)
  ctx.fillStyle = o.body
  disc(ctx, -2.6, -2.9, 1.1)
  ctx.fillStyle = o.accent
  disc(ctx, -0.9, -3.2, 0.95)
  ctx.fillStyle = o.snow
  disc(ctx, -0.5, -4, 0.45)
  ctx.restore()
}

function sleighTeam(env: GlobeEnv, u: number): Pose[] {
  return TEAM.map((ahead, i) => {
    const pose = flightPose(u + ahead)
    const stride = env.clock * 2.6 + i * 1.3
    return { x: pose.x, y: pose.y + 0.6 * Math.sin(stride), angle: pose.angle + 0.1 * Math.sin(stride + 1) }
  })
}

function drawTeam(ctx: Ctx, o: Palette, seat: Pose, team: Pose[]): void {
  ctx.strokeStyle = withAlpha(o.ink, 0.8)
  ctx.lineWidth = 0.25
  ctx.beginPath()
  ctx.moveTo(seat.x, seat.y - 0.6)
  for (const pose of team) ctx.lineTo(pose.x, pose.y - 1)
  ctx.stroke()
  team.forEach((pose, i) => {
    ctx.save()
    ctx.translate(pose.x, pose.y)
    ctx.rotate(pose.angle)
    ctx.scale(0.34, 0.34)
    ctx.translate(0, 5)
    deerShape(ctx, o, 0.55, i === TEAM.length - 1 ? o.accent : undefined)
    ctx.restore()
  })
}

function sleigh(ctx: Ctx, env: GlobeEnv): void {
  const tau = (env.clock % SLEIGH_PERIOD_S) / SLEIGH_FLIGHT_S
  if (tau > 1.3) return
  const u = tau + 0.04 * Math.sin(tau * TAU * 2) - 0.12
  const seat = flightPose(u)
  ctx.fillStyle = env.o.light
  for (let k = 1; k <= 5; k++) {
    const p = flightPose(u - k * 0.03)
    sparkle(ctx, p.x - 3, p.y, (1 - k / 6) * 1.4 * (0.6 + 0.4 * Math.sin(env.clock * 9 + k)))
  }
  drawTeam(ctx, env.o, seat, sleighTeam(env, u))
  sled(ctx, env.o, seat)
}

function createTrain() {
  let puffs: Puff[] = []
  let head = MOUTHS.from - TUNNEL.hide
  let rest = rand(0, TRAIN_REST_S)
  let nextPuff = 0
  let boost = 0

  function step(env: GlobeEnv): void {
    boost = Math.max(0, boost - env.dt / 2)
    puffs = puffs.filter((p) => env.clock - p.born < PUFF_LIFE_S)
    if (rest > 0) {
      rest -= env.dt
      if (rest <= 0) head = MOUTHS.from - TUNNEL.hide
      return
    }
    head += (11 + 14 * boost) * env.dt
    if (head - CAR_GAP * 2 > MOUTHS.to + TUNNEL.hide) rest = TRAIN_REST_S
    if (env.clock < nextPuff || head < MOUTHS.from + 3 || head > MOUTHS.to - 3) return
    nextPuff = env.clock + (boost > 0 ? 0.12 : 0.35)
    puffs.push({ x: head + 2, y: railY(head) - 6, born: env.clock })
  }

  function press(at: GlobePoint): boolean {
    const onTunnel = TUNNELS.some(([x]) => Math.hypot(at.x - x, at.y - railY(x) + 3) < 8)
    if (rest > 0 && onTunnel) rest = 0.01
    else if (rest <= 0 && Math.hypot(at.x - head, at.y - (railY(head) - 3)) < 9) boost = 1
    else return false
    return true
  }

  function cars(ctx: Ctx, env: GlobeEnv): void {
    if (rest > 0) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(MOUTHS.from, 0, MOUTHS.to - MOUTHS.from, 100)
    ctx.clip()
    for (let i = 2; i >= 0; i--) drawCar(ctx, env, head - i * CAR_GAP, i)
    ctx.restore()
  }

  function draw(ctx: Ctx, env: GlobeEnv): void {
    rails(ctx, env)
    TUNNELS.forEach(([x, dir]) => tunnel(ctx, env, x, dir, false))
    cars(ctx, env)
    TUNNELS.forEach(([x, dir]) => tunnel(ctx, env, x, dir, true))
    for (const p of puffs) {
      const age = (env.clock - p.born) / PUFF_LIFE_S
      ctx.fillStyle = withAlpha(env.o.shade, 0.7 * Math.sin(age * Math.PI))
      disc(ctx, p.x, p.y - age * 5, 0.7 + age * 1.6)
    }
  }

  return { step, press, draw }
}

export function elven(): GlobeScene {
  const train = createTrain()
  let glow = 0
  let flash = 0
  return {
    step(env) {
      flash = Math.max(0, flash - env.dt / 1.5)
      glow = ease(glow, env.pointer && inDome(env.pointer) ? 1 : 0, 4, env.dt)
      train.step(env)
    },
    shake() {
      flash = 1
    },
    press(_env, at) {
      if (train.press(at)) return
      if (Math.hypot(at.x - TREE.x, at.y - (groundY(TREE.x) - TREE.h / 2)) < 11) flash = 1
    },
    back(ctx, env) {
      sleigh(ctx, env)
      village(ctx, env, glow, flash)
    },
    front(ctx, env) {
      train.draw(ctx, env)
    },
  }
}
