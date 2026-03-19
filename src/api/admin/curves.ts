import type { CurveResponse } from '@/types/api/categories'
import type { CreateCurveRequest, UpdateCurveRequest } from '@/types/api/admin'
import { get, post, patch } from '../client'

export function getCurves(): Promise<CurveResponse[]> {
  return get<CurveResponse[]>('/curves')
}

export function getCurve(id: string): Promise<CurveResponse> {
  return get<CurveResponse>(`/curves/${id}`)
}

export function createCurve(req: CreateCurveRequest): Promise<CurveResponse> {
  return post<CurveResponse>('/admin/curves', req)
}

export function updateCurve(id: string, req: UpdateCurveRequest): Promise<CurveResponse> {
  return patch<CurveResponse>(`/admin/curves/${id}`, req)
}
