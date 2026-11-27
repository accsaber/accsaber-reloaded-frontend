import type { KnitFill } from '@/types/cosmetics/border'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

export interface KnitArea {
  x0: number
  y0: number
  x1: number
  y1: number
}

const MOTIF = [
  '........',
  'x.x.x.x.',
  '.x.x.x.x',
  '........',
  '...x....',
  '..x.x...',
  '.x.x.x..',
  '..x.x...',
  '...x....',
  '........',
  'x...x...',
  '........',
  '..x...x.',
  '.x.x.x.x',
  'x...x...',
  '........',
  '........',
  '.x.x.x.x',
  'x.x.x.x.',
  '........',
]
const DEFAULT_STITCH = 2.5

function wrap(i: number, n: number): number {
  return ((i % n) + n) % n
}

function stitches(ctx: Ctx, size: number, area: KnitArea, motif: boolean): void {
  ctx.beginPath()
  for (let row = Math.floor(area.y0 / size); row * size < area.y1; row++) {
    const cells = MOTIF[wrap(row, MOTIF.length)]
    const y = row * size
    for (let col = Math.floor(area.x0 / size); col * size < area.x1; col++) {
      if ((cells[wrap(col, cells.length)] === 'x') !== motif) continue
      const x = col * size
      ctx.moveTo(x + size * 0.14, y + size * 0.1)
      ctx.lineTo(x + size * 0.5, y + size * 0.9)
      ctx.lineTo(x + size * 0.86, y + size * 0.1)
    }
  }
  ctx.stroke()
}

export function paintKnit(ctx: Ctx, fill: Pick<KnitFill, 'wool' | 'shade' | 'motif' | 'stitch'>, area: KnitArea): void {
  const size = fill.stitch ?? DEFAULT_STITCH
  ctx.fillStyle = fill.shade
  ctx.fillRect(area.x0, area.y0, area.x1 - area.x0, area.y1 - area.y0)
  ctx.lineWidth = size * 0.36
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = fill.wool
  stitches(ctx, size, area, false)
  ctx.strokeStyle = fill.motif
  stitches(ctx, size, area, true)
}
