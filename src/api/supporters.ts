import type {
  SupporterCreditEntry,
  SupporterCreditsParams,
  SupporterStateResponse,
} from '@/types/api/supporters'
import type { Page } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getUserSupporter(userId: string): Promise<SupporterStateResponse> {
  return get<SupporterStateResponse>(`/users/${userId}/supporter`)
}

export function getSupporterCredits(
  params?: SupporterCreditsParams,
): Promise<Page<SupporterCreditEntry>> {
  return get<Page<SupporterCreditEntry>>(`/supporters/credits${buildQuery(params)}`)
}
