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
