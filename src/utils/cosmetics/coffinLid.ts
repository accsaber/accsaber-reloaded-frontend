import type { Ctx, Point } from '@/utils/cosmetics/canvasShapes'

const FINGER_LENGTHS = [6.6, 8, 7.6, 6.2]

export function polygonOf(mask: string): Point[] {
  const nums = /^[\sMLZ\d.,-]+$/i.test(mask) ? (mask.match(/-?\d*\.?\d+/g) ?? []).map(Number) : []
  const pts: Point[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]])
  return pts.length >= 3 ? pts : [[0, 0], [100, 0], [100, 100], [0, 100]]
}

function edgeNormal(a: Point, b: Point): Point {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return [(b[1] - a[1]) / len, -(b[0] - a[0]) / len]
}

export function outset(pts: Point[], d: number): Point[] {
  return pts.map((p, i) => {
    const n1 = edgeNormal(pts[(i + pts.length - 1) % pts.length], p)
    const n2 = edgeNormal(p, pts[(i + 1) % pts.length])
    const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1])
    return [p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k]
  })
}

export function pathOf(pts: Point[], closed: boolean): Path2D {
  const p = new Path2D()
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)))
  if (closed) p.closePath()
  return p
}

export function drawHandprint(ctx: Ctx, x: number, y: number, alpha: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1.4, 1.4)
  ctx.rotate(-0.2)
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
  ctx.beginPath()
  ctx.moveTo(4.4, -0.5)
  ctx.quadraticCurveTo(4.8, 4, 3.2, 7.2)
  ctx.quadraticCurveTo(0, 9, -3.2, 7.2)
  ctx.quadraticCurveTo(-4.8, 4, -4.4, -0.5)
  ctx.closePath()
  FINGER_LENGTHS.forEach((len, i) => ctx.roundRect(-3.9 + i * 2.5 - 1.05, 1 - len, 2.1, len + 1, 1.05))
  ctx.save()
  ctx.translate(3.6, 3.2)
  ctx.rotate(1.05)
  ctx.roundRect(-1.05, -6.4, 2.1, 7.4, 1.05)
  ctx.restore()
  ctx.fill()
  ctx.restore()
}
