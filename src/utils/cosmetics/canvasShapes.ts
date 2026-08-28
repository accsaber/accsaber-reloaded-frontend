export type Ctx = CanvasRenderingContext2D

export type Point = [number, number]

export type Projector = (x: number, y: number, z: number) => Point

export function makeProjector(cx: number, vy: number, focal: number): Projector {
  return (x, y, z) => [cx + (x * focal) / z, vy + (y * focal) / z]
}

export function sceneUnit(w: number, h: number): number {
  return Math.min(h / 200, w / 500)
}

export function flickerNoise(t: number, k: number): number {
  return 0.5 + 0.5 * Math.sin(t * 7.3 * k + 1.7) * Math.sin(t * 3.1 * k + 0.4)
}

export function cyc(t: number, p: number): number {
  return ((t % p) + p) % p / p
}

export function win(c: number, a: number, b: number): number {
  return c >= a && c < b ? (c - a) / (b - a) : -1
}

export function fillCircle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

export function fillPoly(ctx: Ctx, pts: Point[]) {
  if (!pts.length) return
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
  ctx.fill()
}
