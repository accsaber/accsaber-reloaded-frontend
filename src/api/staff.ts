import type { PublicStaffUserResponse, StaffUsersPublicParams } from '@/types/api/staff'
import type { Page } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getStaffUsers(
  params?: StaffUsersPublicParams,
): Promise<Page<PublicStaffUserResponse>> {
  return get<Page<PublicStaffUserResponse>>(`/staff/users-public${buildQuery(params)}`)
}
