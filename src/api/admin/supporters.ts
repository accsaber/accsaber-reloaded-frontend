import type {
  ClaimSupporterEventRequest,
  KofiEventResponse,
  KofiEventsParams,
  ManualSupporterGrantRequest,
  SupporterGrantResponse,
} from '@/types/api/supporters'
import type { Page } from '@/types/pagination'
import { get, post } from '../client'
import { buildQuery } from '../utils'

export function getKofiEvents(params?: KofiEventsParams): Promise<Page<KofiEventResponse>> {
  return get<Page<KofiEventResponse>>(`/admin/supporters/events${buildQuery(params)}`)
}

export function grantSupporter(
  request: ManualSupporterGrantRequest,
): Promise<SupporterGrantResponse> {
  return post<SupporterGrantResponse>('/admin/supporters/grant', request)
}

export function claimSupporterEvent(request: ClaimSupporterEventRequest): Promise<void> {
  return post<void>('/admin/supporters/claim', request)
}
