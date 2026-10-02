import { hash01 } from '@/utils/random'

export function stainPath(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, seed: number, lobes = 9): void {
  g.beginPath()
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2
    const r = R * (0.62 + hash01(seed + (i % lobes) * 5) * 0.55)
    const px = cx + Math.cos(a) * r
    const py = cy + Math.sin(a) * r
    if (i === 0) g.moveTo(px, py)
    else {
      const am = a - Math.PI / lobes
      const rm = R * (0.5 + hash01(seed + i * 3) * 0.3)
      g.quadraticCurveTo(cx + Math.cos(am) * rm, cy + Math.sin(am) * rm, px, py)
    }
  }
  g.closePath()
}

export function dripPath(g: CanvasRenderingContext2D, x: number, top: number, len: number, w: number, taper: number, bulb: number): void {
  g.moveTo(x - w / 2, top)
  g.lineTo(x - w * taper, top + len)
  g.lineTo(x + w * taper, top + len)
  g.lineTo(x + w / 2, top)
  g.closePath()
  g.moveTo(x + bulb, top + len)
  g.arc(x, top + len, bulb, 0, Math.PI * 2)
}
