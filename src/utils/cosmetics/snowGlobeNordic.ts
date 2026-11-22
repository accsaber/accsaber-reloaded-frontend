import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import {
  closeness,
  deerShape,
  disc,
  drawCabin,
  drawPine,
  drawSmoke,
  ease,
  groundY,
  keepInDome,
  line,
  makePine,
  poly,
  type GlobeEnv,
  type GlobePoint,
  type GlobeScene,
} from '@/utils/cosmetics/snowGlobeKit'
import { clamp, clamp01, smoothstep01 } from '@/utils/math'
import { randBetween as rand } from '@/utils/random'

const CABIN = 32
const DEER = 54
const MAN = 71
const MAN_SCALE = 1.5
const HAT_HOME = { x: MAN, y: groundY(MAN) + 1 - 16.1 * MAN_SCALE }
const HAT_DOWN_S = 1.6
const HAT_BACK_S = 0.5
interface Hat {
  state: 'on' | 'fly' | 'down' | 'back'
  x: number
  y: number
  vx: number
  vy: number
  a: number
  spin: number
  until: number
  fx: number
  fy: number
  fa: number
}

function cabin(ctx: Ctx, env: GlobeEnv, lit: number, bend: number): void {
  const o = env.o
  ctx.save()
  ctx.translate(CABIN, groundY(CABIN) + 0.5)
  ctx.scale(1.4, 1.4)
  drawCabin(ctx, o, lit * (0.92 + 0.08 * Math.sin(env.clock * 9)))
  drawSmoke(ctx, o.shade, env.clock, 3.6, -15, bend)
  ctx.restore()
}

function deer(ctx: Ctx, env: GlobeEnv, alert: number): void {
  ctx.save()
  ctx.translate(DEER, groundY(DEER) + 0.6)
  ctx.scale(1.2, 1.2)
  deerShape(ctx, env.o, (1 - smoothstep01(alert)) * (1.75 + 0.08 * Math.sin(env.clock * 3)))
  ctx.restore()
}

function snowmanFace(ctx: Ctx, env: GlobeEnv, look: number): void {
  const o = env.o
  const side = look < 0 ? -1 : 1
  ctx.fillStyle = o.accent
  ctx.fillRect(-2.6, -12.6, 5.2, 1.3)
  ctx.fillRect(1.2, -12.6, 1.2, 3.4)
  ctx.fillStyle = o.ink
  ctx.fillRect(look * 0.4 - 1.1, -15.2, 0.6, 0.6)
  ctx.fillRect(look * 0.4 + 0.5, -15.2, 0.6, 0.6)
  poly(ctx, [look * 0.4, -14.4, look * 0.4 + side * 2.8, -13.9, look * 0.4, -13.5], o.light)
}

function snowman(ctx: Ctx, env: GlobeEnv, look: number, wave: number): void {
  const o = env.o
  ctx.save()
  ctx.translate(MAN, groundY(MAN) + 1)
  ctx.scale(MAN_SCALE, MAN_SCALE)
  ctx.strokeStyle = o.ink
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.6
  line(ctx, -2.8, -10, -7, -11.5 - wave * 2.6)
  line(ctx, 2.8, -10, 7, -11.5 - wave * 2.6)
  ctx.fillStyle = o.snow
  ctx.strokeStyle = o.shade
  ctx.lineWidth = 0.5
  for (const [y, r] of [[-3.6, 4.2], [-9.6, 3.1], [-14.3, 2.3]]) {
    disc(ctx, 0, y, r)
    ctx.stroke()
  }
  snowmanFace(ctx, env, look)
  ctx.restore()
}

function flyHat(hat: Hat, env: GlobeEnv): void {
  hat.vy += 60 * env.dt
  hat.x += hat.vx * env.dt
  hat.y += hat.vy * env.dt
  hat.a += hat.spin * env.dt
  keepInDome(hat, 5)
  if (hat.vy <= 0 || hat.y < env.surfaceY(hat.x) - 0.4) return
  hat.state = 'down'
  hat.until = env.clock + HAT_DOWN_S
  hat.a = hat.spin > 0 ? 0.5 : -0.5
}

function returnHat(hat: Hat, env: GlobeEnv): void {
  const u = clamp01(1 - (hat.until - env.clock) / HAT_BACK_S)
  const e = smoothstep01(u)
  hat.x = hat.fx + (HAT_HOME.x - hat.fx) * e
  hat.y = hat.fy + (HAT_HOME.y - hat.fy) * e - Math.sin(u * Math.PI) * 8
  hat.a = hat.fa * (1 - e)
  if (u >= 1) hat.state = 'on'
}

function stepHat(hat: Hat, env: GlobeEnv): void {
  if (hat.state === 'fly') flyHat(hat, env)
  else if (hat.state === 'back') returnHat(hat, env)
  else if (hat.state === 'down' && env.clock >= hat.until) {
    hat.state = 'back'
    hat.until = env.clock + HAT_BACK_S
    hat.fx = hat.x
    hat.fy = hat.y
    hat.fa = hat.a
  }
}

function popHat(hat: Hat, at: GlobePoint): void {
  if (hat.state !== 'on' || Math.hypot(at.x - MAN, at.y - (groundY(MAN) - 14)) > 12) return
  hat.state = 'fly'
  hat.x = HAT_HOME.x
  hat.y = HAT_HOME.y
  hat.vx = rand(-18, 18)
  hat.vy = -rand(34, 46)
  hat.spin = rand(-9, 9)
}

function drawHat(ctx: Ctx, env: GlobeEnv, hat: Hat): void {
  const on = hat.state === 'on'
  ctx.save()
  ctx.translate(on ? HAT_HOME.x : hat.x, on ? HAT_HOME.y : hat.y)
  ctx.rotate(on ? 0 : hat.a)
  ctx.scale(MAN_SCALE, MAN_SCALE)
  ctx.fillStyle = env.o.ink
  ctx.fillRect(-2.9, 0.2, 5.8, 0.8)
  ctx.fillRect(-1.8, -2.8, 3.6, 3)
  ctx.fillStyle = env.o.accent
  ctx.fillRect(-1.8, -0.7, 3.6, 0.7)
  ctx.restore()
}

export function nordic(): GlobeScene {
  const pines = [makePine(18, 17), makePine(46, 13), makePine(84, 15)]
  const hat: Hat = { state: 'on', x: 0, y: 0, vx: 0, vy: 0, a: 0, spin: 0, until: 0, fx: 0, fy: 0, fa: 0 }
  let lit = 0
  let bend = 0
  let alert = 0
  let wave = 0
  let look = 0
  return {
    step(env) {
      const deerNear = closeness(env, DEER, groundY(DEER) - 6, 28) > 0
      lit = ease(lit, closeness(env, CABIN, groundY(CABIN) - 8, 30) > 0 ? 1 : 0, 6, env.dt)
      bend = ease(bend, clamp(env.swirl, -1, 1), 1.5, env.dt)
      alert = clamp01(alert + (deerNear ? env.dt / 0.7 : -env.dt / 1.4))
      wave = ease(wave, closeness(env, MAN, groundY(MAN) - 12, 26) > 0 ? 1 : 0, 6, env.dt)
      if (env.pointer) look = ease(look, clamp((env.pointer.x - MAN) / 12, -1, 1), 5, env.dt)
      stepHat(hat, env)
    },
    shake() {},
    press(_env, at) {
      popHat(hat, at)
    },
    back(ctx, env) {
      drawPine(ctx, pines[0], env.o, env.shed)
      cabin(ctx, env, lit, bend)
      drawPine(ctx, pines[1], env.o, env.shed)
      deer(ctx, env, alert)
      drawPine(ctx, pines[2], env.o, env.shed)
      snowman(ctx, env, look, wave)
      drawHat(ctx, env, hat)
    },
  }
}
