import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import {
  blob,
  closeness,
  disc,
  ease,
  groundY,
  inDome,
  line,
  poly,
  quadPoint,
  snowCap,
  TAU,
  type GlobeEnv,
  type GlobePoint,
  type GlobeScene,
} from '@/utils/cosmetics/snowGlobeKit'
import { clamp, smoothstep01 } from '@/utils/math'
import { hash01, randBetween as rand } from '@/utils/random'

interface Drop {
  x: number
  y: number
  vx: number
  vy: number
}

const BUILDINGS: [number, number, number][] = [
  [7.5, 8, 20], [15, 7, 30], [21.5, 8, 22], [29, 6, 13], [65, 6, 12], [70.5, 8, 23], [78, 7, 32], [84.5, 8, 19],
]
const WINDOW_GAP = { x: 2.2, y: 3.1 }
const BUILDING_LIT_S = 7
const LAMPS = [38, 62]
const FOUNTAIN = { x: 50, scale: 1.35, lift: 2.5, rim: 3.3 }
const RIM_Y = groundY(FOUNTAIN.x) - FOUNTAIN.lift - FOUNTAIN.rim * FOUNTAIN.scale
const JET_TOP = -9.8
const DROP_MAX = 80
const PERCHES = [-7, -3.2, 3.6, 7.4]
const PIGEON_AWAY_S = 4.2

function buildingTop(x: number, w: number, h: number): number {
  return groundY(x + w / 2) + 1 - h
}

const ROOF_SNOW = BUILDINGS.map(([x, w, h], b) => {
  const top = buildingTop(x, w, h)
  return snowCap([x - 0.5, top, x + w + 0.5, top], 1.3, b * 31 + 5)
})

function buildingAt(at: GlobePoint): number {
  return BUILDINGS.findIndex(([x, w, h]) => at.x >= x && at.x <= x + w && at.y >= buildingTop(x, w, h))
}

function windows(ctx: Ctx, env: GlobeEnv, share: number, raised: number[], lit: boolean): void {
  ctx.fillStyle = lit ? env.o.light : withAlpha(env.o.shade, 0.16)
  ctx.beginPath()
  BUILDINGS.forEach(([x, w, h], b) => {
    const cols = Math.floor((w - 1.6) / WINDOW_GAP.x)
    const rows = Math.floor((h - 3) / WINDOW_GAP.y)
    const pad = (w - (cols * WINDOW_GAP.x - 1)) / 2
    const wave = (env.clock - raised[b]) * 10
    for (let i = 0; i < cols * rows; i++) {
      const row = Math.floor(i / cols)
      const id = b * 97 + i
      const epoch = Math.floor(env.clock / (5 + hash01(id) * 9) + hash01(id + 0.5))
      const on = wave < BUILDING_LIT_S * 10 ? rows - 1 - row < wave : hash01(id * 3.1 + epoch * 7.7) < share
      if (on === lit) ctx.rect(x + pad + (i % cols) * WINDOW_GAP.x, buildingTop(x, w, h) + 2.2 + row * WINDOW_GAP.y, 1.2, 1.7)
    }
  })
  ctx.fill()
}

function skyline(ctx: Ctx, env: GlobeEnv, share: number, raised: number[]): void {
  ctx.fillStyle = env.o.ink
  for (const [x, w, h] of BUILDINGS) ctx.fillRect(x, buildingTop(x, w, h), w, h + 2)
  windows(ctx, env, share, raised, false)
  windows(ctx, env, share, raised, true)
  for (const cap of ROOF_SNOW) blob(ctx, cap, env.o.snow)
}

function lamp(ctx: Ctx, env: GlobeEnv, x: number, lit: number): void {
  const o = env.o
  const gy = groundY(x)
  poly(ctx, [x - 1, gy - 13.1, x + 1, gy - 13.1, x + 5, gy + 1, x - 5, gy + 1], withAlpha(o.light, 0.08 + 0.2 * lit))
  ctx.fillStyle = o.body
  ctx.fillRect(x - 0.3, gy - 13.7, 0.6, 14.7)
  ctx.fillRect(x - 1.4, gy - 14.4, 2.8, 0.7)
  ctx.fillStyle = withAlpha(o.light, 0.45 + 0.55 * lit)
  ctx.fillRect(x - 1, gy - 13.7, 2, 0.6)
}

function jetReach(jet: number, burst: number): number {
  return 4 + 4 * jet + 7 * Math.sin(Math.PI * Math.sqrt(1 - burst))
}

function basin(ctx: Ctx, env: GlobeEnv): void {
  const o = env.o
  ctx.fillStyle = o.body
  ctx.fillRect(-9, -2.6, 18, 4)
  ctx.fillRect(-9.6, -FOUNTAIN.rim, 19.2, 0.9)
  ctx.fillRect(-1, -9, 2, 6)
  poly(ctx, [-4, -9.6, 4, -9.6, 2.4, -8.2, -2.4, -8.2], o.body)
  ctx.fillStyle = o.water
  ctx.beginPath()
  ctx.ellipse(0, -FOUNTAIN.rim, 8.6, 0.9, 0, 0, TAU)
  ctx.fill()
}

function jets(ctx: Ctx, env: GlobeEnv, reach: number, bend: number): void {
  const top = { x: 0, y: JET_TOP }
  ctx.strokeStyle = withAlpha(env.o.water, 0.8)
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.7
  line(ctx, 0, top.y, bend * 2, top.y - reach)
  ctx.lineWidth = 0.45
  for (const k of [-2, -1, 1, 2]) {
    const peak = { x: k * 2.2 + bend * 2, y: top.y - reach * 0.9 }
    const end = { x: k * 3.6 + bend, y: -FOUNTAIN.rim }
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.quadraticCurveTo(peak.x, peak.y, end.x, end.y)
    ctx.stroke()
    for (let j = 0; j < 2; j++) {
      const p = quadPoint(top, peak, end, (env.clock * 0.9 + j / 2 + k * 0.13) % 1)
      disc(ctx, p.x, p.y, 0.45)
    }
  }
}

function fountain(ctx: Ctx, env: GlobeEnv, jet: number, burst: number, bend: number, drops: Drop[]): void {
  ctx.save()
  ctx.translate(FOUNTAIN.x, groundY(FOUNTAIN.x) - FOUNTAIN.lift)
  ctx.scale(FOUNTAIN.scale, FOUNTAIN.scale)
  basin(ctx, env)
  jets(ctx, env, jetReach(jet, burst), bend)
  ctx.fillStyle = env.o.water
  for (const d of drops) disc(ctx, d.x, d.y, 0.5)
  ctx.restore()
}

function stepDrops(drops: Drop[], dt: number): Drop[] {
  for (const d of drops) {
    d.vy += 26 * dt
    d.x += d.vx * dt
    d.y += d.vy * dt
  }
  return drops.filter((d) => d.y < -FOUNTAIN.rim || d.vy < 0)
}

function splash(drops: Drop[], jet: number): void {
  const y = JET_TOP - jetReach(jet, 1) * 0.8
  for (let i = 0; i < 14 && drops.length < DROP_MAX; i++) drops.push({ x: 0, y, vx: rand(-8, 8), vy: -rand(4, 15) })
}

function pigeonAt(i: number, t: number): GlobePoint & { flying: boolean } {
  const perch = { x: FOUNTAIN.x + PERCHES[i] * FOUNTAIN.scale, y: RIM_Y - 0.8 }
  if (t <= 0 || t >= PIGEON_AWAY_S) return { ...perch, flying: false }
  const sky = { x: FOUNTAIN.x + (i - 1.5) * 9, y: 38 + (i % 2) * 6 }
  const circle = { x: sky.x + Math.cos(t * 2.4 + i) * 3, y: sky.y + Math.sin(t * 2.4 + i) * 1.6 }
  const e = t < 1.2 ? smoothstep01(t / 1.2) : t > 3 ? smoothstep01((PIGEON_AWAY_S - t) / 1.2) : 1
  return { x: perch.x + (circle.x - perch.x) * e, y: perch.y + (circle.y - perch.y) * e, flying: true }
}

function pigeons(ctx: Ctx, env: GlobeEnv, fled: number): void {
  ctx.fillStyle = env.o.ink
  ctx.strokeStyle = env.o.ink
  ctx.lineWidth = 0.5
  ctx.lineCap = 'round'
  PERCHES.forEach((_, i) => {
    const bird = pigeonAt(i, env.clock - fled - i * 0.08)
    if (!bird.flying) {
      ctx.beginPath()
      ctx.ellipse(bird.x, bird.y, 1.2, 0.8, 0, 0, TAU)
      ctx.fill()
      disc(ctx, bird.x + (i % 2 ? 0.9 : -0.9), bird.y - 0.8, 0.5)
      return
    }
    const flap = Math.sin(env.clock * 22 + i) * 1.3
    line(ctx, bird.x - 1.7, bird.y - flap, bird.x, bird.y)
    line(ctx, bird.x, bird.y, bird.x + 1.7, bird.y - flap)
  })
}

export function city(): GlobeScene {
  const lit = LAMPS.map(() => 0)
  const raised = BUILDINGS.map(() => -100)
  let glow = 0
  let jet = 0
  let burst = 0
  let blackout = 0
  let bend = 0
  let fled = -100
  let drops: Drop[] = []

  function scatter(env: GlobeEnv): void {
    if (env.clock - fled > PIGEON_AWAY_S + 1.5) fled = env.clock
  }

  function stepWater(env: GlobeEnv): void {
    jet = ease(jet, closeness(env, FOUNTAIN.x, RIM_Y - 4, 26) > 0 ? 1 : 0, 4, env.dt)
    bend = ease(bend, clamp(env.swirl, -1, 1), 2, env.dt)
    burst = Math.max(0, burst - env.dt / 2.6)
    drops = stepDrops(drops, env.dt)
  }

  return {
    step(env) {
      glow = ease(glow, env.pointer && inDome(env.pointer) ? 1 : 0, 4, env.dt)
      blackout = Math.max(0, blackout - env.dt)
      stepWater(env)
      LAMPS.forEach((x, i) => {
        lit[i] = ease(lit[i], closeness(env, x, groundY(x) - 8, 18) > 0 ? 1 : 0, 6, env.dt)
      })
      if (closeness(env, FOUNTAIN.x, RIM_Y, 10) > 0) scatter(env)
    },
    shake(env) {
      blackout = 1.4
      raised.fill(-100)
      scatter(env)
    },
    press(env, at) {
      const hit = buildingAt(at)
      if (hit >= 0) raised[hit] = env.clock
      if (Math.hypot(at.x - FOUNTAIN.x, at.y - (RIM_Y - 4)) > 14) return
      burst = 1
      splash(drops, jet)
      scatter(env)
    },
    back(ctx, env) {
      skyline(ctx, env, blackout > 0 ? 0 : 0.3 + 0.45 * glow, raised)
      LAMPS.forEach((x, i) => lamp(ctx, env, x, blackout > 0 ? 0 : lit[i]))
    },
    front(ctx, env) {
      fountain(ctx, env, jet, burst, bend, drops)
      pigeons(ctx, env, fled)
    },
  }
}
