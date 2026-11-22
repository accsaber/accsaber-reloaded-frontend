export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

export function smoothstep01(value: number): number {
  const c = clamp01(value)
  return c * c * (3 - 2 * c)
}
