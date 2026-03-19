export function brightenRgb(rgb: string, amount: number): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return rgb
  const r = Math.min(255, Math.round(Number(match[1]) + amount))
  const g = Math.min(255, Math.round(Number(match[2]) + amount))
  const b = Math.min(255, Math.round(Number(match[3]) + amount))
  return `rgb(${r}, ${g}, ${b})`
}
