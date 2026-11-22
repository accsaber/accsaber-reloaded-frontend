import { win } from '@/utils/cosmetics/canvasShapes'

export function splitDir(i: number, n: number): [number, number] {
  const ang = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2
  return [Math.cos(ang), Math.sin(ang)]
}

export function fissionAmt(e: number): number {
  const split = win(e, 0.6, 0.72)
  const hold = win(e, 0.72, 0.82)
  const fuse = win(e, 0.82, 0.92)
  if (split >= 0) return 1 - Math.pow(1 - split, 3)
  if (hold >= 0) return 1
  if (fuse >= 0) return 1 - Math.pow(fuse, 2)
  return 0
}
