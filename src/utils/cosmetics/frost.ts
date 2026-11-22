import { hash01 } from '@/utils/random'

export function frostFern(path: Path2D, x: number, y: number, angle: number, len: number, depth: number, g: number, seed: number): void {
  if (depth === 0 || len < 1) return
  path.moveTo(x, y)
  path.lineTo(x + Math.cos(angle) * len * g, y + Math.sin(angle) * len * g)
  for (let k = 1; k <= 3; k++) {
    const u = k / 4
    if (u > g) break
    const bx = x + Math.cos(angle) * len * u
    const by = y + Math.sin(angle) * len * u
    const spread = 0.9 + 0.2 * hash01(seed + k)
    const sub = len * 0.4 * (1 - u * 0.5)
    frostFern(path, bx, by, angle - spread, sub, depth - 1, g, seed * 3 + k)
    frostFern(path, bx, by, angle + spread, sub, depth - 1, g, seed * 3 + k)
  }
}
