import type {
  DistributionEntryResponse,
  MapAvgApResponse,
  MapRetryResponse,
  MilestoneCollectorResponse,
  TimeSeriesPointResponse,
  UserImprovementsResponse,
  UserMapImprovementsResponse,
} from '@/types/api/statistics'
import type { ScoreResponse } from '@/types/api/users'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getStreakLeaderboard(params?: PaginationParams, categoryId?: string): Promise<Page<ScoreResponse>> {
  return get<Page<ScoreResponse>>(`/statistics/leaderboards/streaks${buildQuery({ ...params, categoryId })}`)
}

export function getMaxApLeaderboard(params?: PaginationParams, categoryId?: string): Promise<Page<ScoreResponse>> {
  return get<Page<ScoreResponse>>(`/statistics/leaderboards/max-ap${buildQuery({ ...params, categoryId })}`)
}

export function getHighestAvgApMaps(params?: PaginationParams, categoryId?: string, minScores?: number): Promise<Page<MapAvgApResponse>> {
  return get<Page<MapAvgApResponse>>(`/statistics/leaderboards/highest-avg-ap${buildQuery({ ...params, categoryId, minScores })}`)
}

export function getMostRetriedMaps(params?: PaginationParams, categoryId?: string): Promise<Page<MapRetryResponse>> {
  return get<Page<MapRetryResponse>>(`/statistics/leaderboards/most-retried${buildQuery({ ...params, categoryId })}`)
}

export function getMostImprovements(params?: PaginationParams, categoryId?: string): Promise<Page<UserImprovementsResponse>> {
  return get<Page<UserImprovementsResponse>>(`/statistics/leaderboards/most-improvements${buildQuery({ ...params, categoryId })}`)
}

export function getMostMapImprovements(params?: PaginationParams, categoryId?: string): Promise<Page<UserMapImprovementsResponse>> {
  return get<Page<UserMapImprovementsResponse>>(`/statistics/leaderboards/most-map-improvements${buildQuery({ ...params, categoryId })}`)
}

export function getMilestoneCollectors(params?: PaginationParams): Promise<Page<MilestoneCollectorResponse>> {
  return get<Page<MilestoneCollectorResponse>>(`/statistics/leaderboards/milestone-collectors${buildQuery(params)}`)
}

export function getNewPlayersPerDay(params?: { amount?: number; unit?: string }): Promise<TimeSeriesPointResponse[]> {
  return get<TimeSeriesPointResponse[]>(`/statistics/charts/new-players-per-day${buildQuery(params)}`)
}

export function getScoresPerDay(params?: { amount?: number; unit?: string }): Promise<TimeSeriesPointResponse[]> {
  return get<TimeSeriesPointResponse[]>(`/statistics/charts/scores-per-day${buildQuery(params)}`)
}

export function getCumulativeAccounts(params?: { amount?: number; unit?: string }): Promise<TimeSeriesPointResponse[]> {
  return get<TimeSeriesPointResponse[]>(`/statistics/charts/cumulative-accounts${buildQuery(params)}`)
}

export function getCumulativeScores(params?: { amount?: number; unit?: string }): Promise<TimeSeriesPointResponse[]> {
  return get<TimeSeriesPointResponse[]>(`/statistics/charts/cumulative-scores${buildQuery(params)}`)
}

export function getScoresPerCategory(): Promise<DistributionEntryResponse[]> {
  return get<DistributionEntryResponse[]>('/statistics/charts/scores-per-category')
}

export function getPlayersByHmd(): Promise<DistributionEntryResponse[]> {
  return get<DistributionEntryResponse[]>('/statistics/charts/players-by-hmd')
}

export function getPlayersPerCountry(): Promise<DistributionEntryResponse[]> {
  return get<DistributionEntryResponse[]>('/statistics/charts/players-per-country')
}
