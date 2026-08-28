export interface FallingLeaf {
  x: number
  y: number
  size: number
  speed: number
  phase: number
  color: string
}

export interface FallingLeafOptions {
  count: number
  colors: string[]
  unit: number
  w: number
  h: number
  seed: (n: number) => number
  minSize?: number
  maxSize?: number
  minSpeed?: number
  maxSpeed?: number
}

export function seedFallingLeaves(o: FallingLeafOptions): FallingLeaf[] {
  const minSize = o.minSize ?? 1.2
  const maxSize = o.maxSize ?? 2.6
  const minSpeed = o.minSpeed ?? 4
  const maxSpeed = o.maxSpeed ?? 9
  return Array.from({ length: o.count }, (_, i) => ({
    x: o.seed(i * 3) * o.w,
    y: o.seed(i * 5) * o.h,
    size: o.unit * (minSize + o.seed(i * 7) * (maxSize - minSize)),
    speed: o.unit * (minSpeed + o.seed(i * 11) * (maxSpeed - minSpeed)),
    phase: o.seed(i * 13) * 6.28,
    color: o.colors[i % o.colors.length] ?? '#ffffff',
  }))
}

export function drawFallingLeaves(
  ctx: CanvasRenderingContext2D,
  leaves: FallingLeaf[],
  w: number,
  h: number,
  unit: number,
  t: number,
  aspect = 0.45,
): void {
  for (const l of leaves) {
    const y = ((l.y + t * l.speed) % (h + unit * 6)) - unit * 3
    const x = ((l.x + Math.sin(t * 0.9 + l.phase) * unit * 6 + t * unit * 1.5) % (w + unit * 6)) - unit * 3
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(t * 2.2 + l.phase)
    ctx.fillStyle = l.color
    ctx.beginPath()
    ctx.ellipse(0, 0, l.size, l.size * aspect, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
