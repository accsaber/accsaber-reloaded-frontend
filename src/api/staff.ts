import type { PublicStaffUserResponse } from '@/types/api/staff'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getStaffUsers(
  params?: PaginationParams,
): Promise<Page<PublicStaffUserResponse>> {
  return get<Page<PublicStaffUserResponse>>(`/staff/users-public${buildQuery(params)}`)
}
