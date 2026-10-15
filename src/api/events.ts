import type {
  EventDetailResponse,
  EventListParams,
  EventProgressResponse,
  EventResponse,
} from '@/types/api/events'
import { get, post } from './client'
import { buildQuery } from './utils'

export function getEvents(params?: EventListParams): Promise<EventResponse[]> {
  return get<EventResponse[]>(`/events${buildQuery(params)}`)
}

export async function getCurrentEvent(): Promise<EventResponse | null> {
  return (await get<EventResponse | null>('/events/current')) ?? null
}

export function getEventDetail(id: string): Promise<EventDetailResponse> {
  return get<EventDetailResponse>(`/events/${id}`)
}

export function getEventProgress(id: string): Promise<EventProgressResponse> {
  return get<EventProgressResponse>(`/events/${id}/me`)
}

export function beginEvent(id: string): Promise<EventProgressResponse> {
  return post<EventProgressResponse>(`/events/${id}/begin`)
}
