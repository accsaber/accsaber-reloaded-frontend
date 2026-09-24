import type { RGB } from '@/utils/color'

export function createSceneLayer(ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  const layer = document.createElement('canvas')
  layer.width = ctx.canvas.width
  layer.height = ctx.canvas.height
  const lctx = layer.getContext('2d')
  if (lctx) {
    const tr = ctx.getTransform()
    lctx.setTransform(tr.a, tr.b, tr.c, tr.d, 0, 0)
  }
  return layer
}

export function paintSceneLayer(
  ctx: CanvasRenderingContext2D,
  paint: (lctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const layer = createSceneLayer(ctx)
  const lctx = layer.getContext('2d')
  if (lctx) paint(lctx)
  return layer
}

export function blitSceneLayer(
  ctx: CanvasRenderingContext2D,
  layer: HTMLCanvasElement,
  composite: GlobalCompositeOperation = 'copy',
) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = composite
  ctx.drawImage(layer, 0, 0)
  ctx.restore()
}

export function clearSceneLayer(layer: HTMLCanvasElement) {
  const ctx = layer.getContext('2d')
  if (!ctx) return
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, layer.width, layer.height)
  ctx.restore()
}

export function createRadialSprite(
  px: number,
  [r, g, b]: RGB,
  stops: [number, number][],
): HTMLCanvasElement {
  const sprite = document.createElement('canvas')
  sprite.width = px
  sprite.height = px
  const ctx = sprite.getContext('2d')
  if (ctx) {
    const center = px / 2
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center)
    for (const [offset, alpha] of stops) {
      grad.addColorStop(offset, `rgba(${r}, ${g}, ${b}, ${alpha})`)
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, px, px)
  }
  return sprite
}

export function offscreenLayer(
  w: number,
  h: number,
  scale: number,
): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * scale))
  c.height = Math.max(1, Math.ceil(h * scale))
  const ctx = c.getContext('2d')
  ctx?.setTransform(scale, 0, 0, scale, 0, 0)
  return [c, ctx]
}

export function tintLayer(mask: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = mask.width
  c.height = mask.height
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.drawImage(mask, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, c.width, c.height)
  return c
}

export function softPuff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, `rgba(255,255,255,${alpha})`)
  g.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.5})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

export function layeredWave(x: number, seed: number): number {
  return Math.sin(x * 1.7 + seed * 6.28) * 0.5 + Math.sin(x * 3.9 + seed * 12.9) * 0.3 + Math.sin(x * 8.3 + seed * 3.1) * 0.2
}

export function cloudMask(
  cw: number,
  ch: number,
  scale: number,
  hash: (n: number) => number,
  index: number,
  puffs: number,
  alpha: number,
): HTMLCanvasElement {
  const [c, ctx] = offscreenLayer(cw, ch, scale)
  if (!ctx) return c
  const sd = hash(index * 31)
  const thick = ch * 0.34
  for (let k = 0; k <= puffs; k++) {
    const u = k / puffs
    const taper = Math.pow(Math.sin(u * Math.PI), 0.45)
    const torn = 0.55 + 0.45 * layeredWave(u * 5 + index, sd + 0.3)
    const x = cw * 0.04 + u * cw * 0.92
    const y = ch * 0.5 + layeredWave(u * 2.4, sd) * thick * 0.8 + (hash(index * 71 + k) - 0.5) * thick * 0.6
    const rx = (cw / puffs) * (2.6 + hash(index * 97 + k) * 2.4)
    const ry = thick * (0.4 + hash(index * 53 + k) * 0.6) * taper
    softPuff(ctx, x, y, rx, ry, alpha * torn * taper)
  }
  return c
}

export function wrapX(x0: number, speed: number, t: number, viewW: number, spriteW: number): number {
  const span = viewW + spriteW
  return ((((x0 + t * speed) % span) + span) % span) - spriteW
}
