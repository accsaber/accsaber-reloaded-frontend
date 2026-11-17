import type { CurveResponse } from '@/types/api/categories'
import { get } from '../client'

export { getCurve } from '../curves'

export function getCurves(): Promise<CurveResponse[]> {
  return get<CurveResponse[]>('/curves')
}
