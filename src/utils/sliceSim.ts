export interface SliceHalfMotion {
  x: number
  y: number
  angle: number
  opacity: number
}

export interface SliceHalfBody {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  va: number
}

export interface SliceBodies {
  left: SliceHalfBody
  right: SliceHalfBody
}

export interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  ttl: number
  size: number
  color?: string
}

export const SLICE_GRAVITY = 1750
export const SPARK_GRAVITY = 900
export const HALVES_LIFE_MS = 720

export const IDLE_HALF_MOTION: SliceHalfMotion = { x: 0, y: 0, angle: 0, opacity: 0 }

export function createSliceBodies(power: number, cutFrac: number): SliceBodies {
  const smallLeft = cutFrac <= 0.5
  const asym = (0.5 - Math.min(cutFrac, 1 - cutFrac)) * 2
  const push = 70 + 130 * power
  const boost = 1 + asym * 0.9
  const vy = 90 + 150 * power
  return {
    left: {
      x: 0,
      y: 0,
      vx: -push * (smallLeft ? boost : 1) * (0.8 + Math.random() * 0.4),
      vy: vy * (0.8 + Math.random() * 0.4),
      angle: 0,
      va: -(55 + Math.random() * 110) * (smallLeft ? boost : 1),
    },
    right: {
      x: 0,
      y: 0,
      vx: push * (smallLeft ? 1 : boost) * (0.8 + Math.random() * 0.4),
      vy: vy * (0.8 + Math.random() * 0.4),
      angle: 0,
      va: (55 + Math.random() * 110) * (smallLeft ? 1 : boost),
    },
  }
}

export function applyGravity(
  body: { x: number; y: number; vx: number; vy: number },
  dt: number,
  gravity = SLICE_GRAVITY,
): void {
  body.vy += gravity * dt
  body.x += body.vx * dt
  body.y += body.vy * dt
}

export function stepSliceBodies(bodies: SliceBodies, dt: number): void {
  for (const body of [bodies.left, bodies.right]) {
    applyGravity(body, dt)
    body.angle += body.va * dt
  }
}

export function sliceOpacity(life01: number): number {
  return life01 < 0.55 ? 1 : 1 - (life01 - 0.55) / 0.45
}

function makeCutSpark(
  x: number,
  y: number,
  vxPush: number,
  vyPush: number,
  color?: string,
): Spark {
  return {
    x,
    y,
    vx: vxPush,
    vy: vyPush + (-60 + Math.random() * 220),
    age: 0,
    ttl: 260 + Math.random() * 300,
    size: 1 + Math.random() * 1.6,
    color,
  }
}

function cutSpeed(power: number): number {
  return (40 + Math.random() * 260) * (0.6 + power * 0.7)
}

export interface CutSparkOptions {
  x: number
  y: number
  spreadY: number
  shiftPx: number
  power: number
}

export function spawnCutSparks(sparks: Spark[], opts: CutSparkOptions): void {
  const count = 18 + Math.round(14 * opts.power)
  for (let i = 0; i < count; i++) {
    const yr = Math.random() - 0.5
    const dir = Math.random() < 0.5 ? -1 : 1
    sparks.push(
      makeCutSpark(
        opts.x + yr * 2 * opts.shiftPx,
        opts.y + yr * opts.spreadY,
        dir * cutSpeed(opts.power),
        0,
      ),
    )
  }
}

export interface DirectionalCutSparkOptions {
  x: number
  y: number
  dirX: number
  dirY: number
  spread: number
  normalX: number
  normalY: number
  offset: number
  power: number
  count?: number
  color?: string
}

export function spawnDirectionalCutSparks(
  sparks: Spark[],
  opts: DirectionalCutSparkOptions,
): void {
  const count = opts.count ?? 18 + Math.round(14 * opts.power)
  for (let i = 0; i < count; i++) {
    const u = (Math.random() - 0.5) * opts.spread
    const side = Math.random() < 0.5 ? -1 : 1
    const speed = cutSpeed(opts.power)
    sparks.push(
      makeCutSpark(
        opts.x + opts.dirX * u + opts.normalX * opts.offset,
        opts.y + opts.dirY * u + opts.normalY * opts.offset,
        opts.normalX * side * speed,
        opts.normalY * side * speed,
        opts.color,
      ),
    )
  }
}

export function spawnBurstSparks(
  sparks: Spark[],
  x: number,
  y: number,
  opts?: { count?: number; color?: string },
): void {
  const count = opts?.count ?? 26
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 60 + Math.random() * 260
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      age: 0,
      ttl: 400 + Math.random() * 300,
      size: 1 + Math.random() * 1.4,
      color: opts?.color,
    })
  }
}

export function stepSparks(sparks: Spark[], dt: number): Spark[] {
  const next: Spark[] = []
  for (const s of sparks) {
    s.age += dt * 1000
    if (s.age >= s.ttl) continue
    s.vy += SPARK_GRAVITY * dt
    s.x += s.vx * dt
    s.y += s.vy * dt
    next.push(s)
  }
  return next
}

export function drawSparks(
  ctx: CanvasRenderingContext2D,
  sparks: Spark[],
  fallbackColor: string,
  coreColor: string,
): void {
  for (const s of sparks) {
    const life = 1 - s.age / s.ttl
    ctx.globalAlpha = life
    ctx.strokeStyle = s.color ?? fallbackColor
    ctx.lineWidth = s.size
    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.lineTo(s.x - s.vx * 0.02, s.y - s.vy * 0.02)
    ctx.stroke()
    ctx.globalAlpha = life * 0.5
    ctx.strokeStyle = coreColor
    ctx.lineWidth = Math.max(0.5, s.size - 1)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

export function stepAndDrawSparks(
  ctx: CanvasRenderingContext2D,
  sparks: Spark[],
  dt: number,
  color: string,
  width: number,
  height: number,
): Spark[] {
  ctx.clearRect(0, 0, width, height)
  if (sparks.length === 0) return sparks
  const next = stepSparks(sparks, dt)
  drawSparks(ctx, next, color, '#ffffff')
  return next
}

export function cssVarColor(token: string): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(token).trim() || '#ffffff'
  )
}

export function bladeTiltDeg(shiftPct: number, width: number, height: number): number {
  return (-Math.atan((2 * shiftPct * width) / (100 * height)) * 180) / Math.PI
}
