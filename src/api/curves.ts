import type { CurveResponse } from '@/types/api/categories'
import { get } from './client'

const curves = new Map<string, Promise<CurveResponse>>()

export function getCurve(id: string): Promise<CurveResponse> {
  let curve = curves.get(id)
  if (!curve) {
    curve = get<CurveResponse>(`/curves/${id}`)
    curve.catch(() => curves.delete(id))
    curves.set(id, curve)
  }
  return curve
}
