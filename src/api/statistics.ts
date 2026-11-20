import type {
  CampaignCompletorResponse,
  CampaignCreatorResponse,
  CampaignFunnelResponse,
  CampaignNodeDifficultyResponse,
  CampaignStatsParams,
  DistributionEntryResponse,
  EventMissionLeaderboardResponse,
  EventParticipationResponse,
  EventSummaryResponse,
  FirstEditionHolderResponse,
  ItemScarcityResponse,
  MapAvgApResponse,
  MapRetryResponse,
  MilestoneCollectorResponse,
  MissionCalibrationResponse,
  MissionCompletorResponse,
  MissionShortfallResponse,
  MissionStatsParams,
  MissionXpResponse,
  RarestUnboxedResponse,
  StatsChartRange,
  TimeSeriesPointResponse,
  UserCollectionResponse,
  UserCrateCountResponse,
  UserFirstEditionResponse,
  UserImprovementsResponse,
  UserInventoryValueResponse,
  UserItemCountResponse,
  UserMapImprovementsResponse,
  UserTraderResponse,
} from '@/types/api/statistics'
import type { PlayerScope } from '@/types/api/relations'
import type { ScoreResponse } from '@/types/api/users'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getStreakLeaderboard(params?: PaginationParams, categoryId?: string, scope?: PlayerScope): Promise<Page<ScoreResponse>> {
  return get<Page<ScoreResponse>>(`/statistics/leaderboards/streaks${buildQuery({ ...params, categoryId, ...scope })}`)
}

export function getMaxApLeaderboard(params?: PaginationParams, categoryId?: string, scope?: PlayerScope): Promise<Page<ScoreResponse>> {
  return get<Page<ScoreResponse>>(`/statistics/leaderboards/max-ap${buildQuery({ ...params, categoryId, ...scope })}`)
}

export function getHighestAvgApMaps(params?: PaginationParams, categoryId?: string, minScores?: number, scope?: PlayerScope): Promise<Page<MapAvgApResponse>> {
  return get<Page<MapAvgApResponse>>(`/statistics/leaderboards/highest-avg-ap${buildQuery({ ...params, categoryId, minScores, ...scope })}`)
}

export function getMostRetriedMaps(params?: PaginationParams, categoryId?: string, scope?: PlayerScope): Promise<Page<MapRetryResponse>> {
  return get<Page<MapRetryResponse>>(`/statistics/leaderboards/most-retried${buildQuery({ ...params, categoryId, ...scope })}`)
}

export function getMostImprovements(params?: PaginationParams, categoryId?: string, scope?: PlayerScope): Promise<Page<UserImprovementsResponse>> {
  return get<Page<UserImprovementsResponse>>(`/statistics/leaderboards/most-improvements${buildQuery({ ...params, categoryId, ...scope })}`)
}

export function getMostMapImprovements(params?: PaginationParams, categoryId?: string, scope?: PlayerScope): Promise<Page<UserMapImprovementsResponse>> {
  return get<Page<UserMapImprovementsResponse>>(`/statistics/leaderboards/most-map-improvements${buildQuery({ ...params, categoryId, ...scope })}`)
}

export function getMilestoneCollectors(params?: PaginationParams, scope?: PlayerScope): Promise<Page<MilestoneCollectorResponse>> {
  return get<Page<MilestoneCollectorResponse>>(`/statistics/leaderboards/milestone-collectors${buildQuery({ ...params, ...scope })}`)
}

export function getMostItems(params?: PaginationParams, type?: string, modifier?: string, scope?: PlayerScope): Promise<Page<UserItemCountResponse>> {
  return get<Page<UserItemCountResponse>>(`/statistics/leaderboards/most-items${buildQuery({ ...params, type, modifier, ...scope })}`)
}

export function getMostCratesOpened(params?: PaginationParams, crateId?: string, scope?: PlayerScope): Promise<Page<UserCrateCountResponse>> {
  return get<Page<UserCrateCountResponse>>(`/statistics/leaderboards/most-crates-opened${buildQuery({ ...params, crateId, ...scope })}`)
}

export function getMostValuableInventory(params?: PaginationParams, scope?: PlayerScope): Promise<Page<UserInventoryValueResponse>> {
  return get<Page<UserInventoryValueResponse>>(`/statistics/leaderboards/most-valuable-inventory${buildQuery({ ...params, ...scope })}`)
}

export function getFirstEditions(params?: PaginationParams, scope?: PlayerScope): Promise<Page<UserFirstEditionResponse>> {
  return get<Page<UserFirstEditionResponse>>(`/statistics/leaderboards/first-editions${buildQuery({ ...params, ...scope })}`)
}

export function getMostCompleteCollection(params?: PaginationParams, scope?: PlayerScope): Promise<Page<UserCollectionResponse>> {
  return get<Page<UserCollectionResponse>>(`/statistics/leaderboards/most-complete-collection${buildQuery({ ...params, ...scope })}`)
}

export function getBiggestTraders(params?: PaginationParams, scope?: PlayerScope): Promise<Page<UserTraderResponse>> {
  return get<Page<UserTraderResponse>>(`/statistics/leaderboards/biggest-traders${buildQuery({ ...params, ...scope })}`)
}

export function getRarestUnboxed(params?: PaginationParams, scope?: PlayerScope): Promise<Page<RarestUnboxedResponse>> {
  return get<Page<RarestUnboxedResponse>>(`/statistics/leaderboards/rarest-unboxed${buildQuery({ ...params, ...scope })}`)
}

export function getFirstEditionHolders(params?: PaginationParams, scope?: PlayerScope): Promise<Page<FirstEditionHolderResponse>> {
  return get<Page<FirstEditionHolderResponse>>(`/statistics/leaderboards/first-edition-holders${buildQuery({ ...params, ...scope })}`)
}

export function getRarestItems(params?: PaginationParams): Promise<Page<ItemScarcityResponse>> {
  return get<Page<ItemScarcityResponse>>(`/statistics/leaderboards/rarest-items${buildQuery({ ...params })}`)
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

export function getMissionCalibration(params?: PaginationParams, filters?: MissionStatsParams): Promise<Page<MissionCalibrationResponse>> {
  return get<Page<MissionCalibrationResponse>>(`/statistics/missions/calibration${buildQuery({ ...params, ...filters })}`)
}

export function getMissionCalibrationByTier(templateId: string, filters?: MissionStatsParams): Promise<MissionCalibrationResponse[]> {
  return get<MissionCalibrationResponse[]>(`/statistics/missions/calibration/by-tier${buildQuery({ templateId, ...filters })}`)
}

export function getMissionXpPayouts(params?: PaginationParams, filters?: MissionStatsParams): Promise<Page<MissionXpResponse>> {
  return get<Page<MissionXpResponse>>(`/statistics/missions/xp${buildQuery({ ...params, ...filters })}`)
}

export function getMissionShortfall(templateId: string, filters?: MissionStatsParams): Promise<MissionShortfallResponse[]> {
  return get<MissionShortfallResponse[]>(`/statistics/missions/shortfall${buildQuery({ templateId, ...filters })}`)
}

export function getMissionCompletionRate(range?: StatsChartRange, filters?: MissionStatsParams): Promise<TimeSeriesPointResponse[]> {
  return get<TimeSeriesPointResponse[]>(`/statistics/missions/charts/completion-rate${buildQuery({ ...range, ...filters })}`)
}

export function getMissionCompletionsPerDay(range?: StatsChartRange, filters?: MissionStatsParams): Promise<TimeSeriesPointResponse[]> {
  return get<TimeSeriesPointResponse[]>(`/statistics/missions/charts/completions-per-day${buildQuery({ ...range, ...filters })}`)
}

export function getMissionCompletionsByType(filters?: MissionStatsParams): Promise<DistributionEntryResponse[]> {
  return get<DistributionEntryResponse[]>(`/statistics/missions/charts/by-type${buildQuery(filters)}`)
}

export function getMostMissionsCompleted(params?: PaginationParams, filters?: MissionStatsParams): Promise<Page<MissionCompletorResponse>> {
  return get<Page<MissionCompletorResponse>>(`/statistics/missions/leaderboards/most-completed${buildQuery({ ...params, ...filters })}`)
}

export function getMostMissionXp(params?: PaginationParams, scope?: PlayerScope): Promise<Page<MissionCompletorResponse>> {
  return get<Page<MissionCompletorResponse>>(`/statistics/missions/leaderboards/most-mission-xp${buildQuery({ ...params, ...scope })}`)
}

export function getCampaignFunnel(params?: PaginationParams, filters?: CampaignStatsParams): Promise<Page<CampaignFunnelResponse>> {
  return get<Page<CampaignFunnelResponse>>(`/statistics/campaigns/funnel${buildQuery({ ...params, ...filters })}`)
}

export function getCampaignHardestNodes(campaignId: string, scope?: PlayerScope): Promise<CampaignNodeDifficultyResponse[]> {
  return get<CampaignNodeDifficultyResponse[]>(`/statistics/campaigns/hardest-nodes${buildQuery({ campaignId, ...scope })}`)
}

export function getCampaignStartsPerDay(range?: StatsChartRange, filters?: CampaignStatsParams): Promise<TimeSeriesPointResponse[]> {
  return get<TimeSeriesPointResponse[]>(`/statistics/campaigns/charts/starts-per-day${buildQuery({ ...range, ...filters })}`)
}

export function getCampaignCompletionsPerDay(range?: StatsChartRange, filters?: CampaignStatsParams): Promise<TimeSeriesPointResponse[]> {
  return get<TimeSeriesPointResponse[]>(`/statistics/campaigns/charts/completions-per-day${buildQuery({ ...range, ...filters })}`)
}

export function getMostCampaignsCompleted(params?: PaginationParams, filters?: CampaignStatsParams): Promise<Page<CampaignCompletorResponse>> {
  return get<Page<CampaignCompletorResponse>>(`/statistics/campaigns/leaderboards/most-completed${buildQuery({ ...params, ...filters })}`)
}

export function getTopCampaignCreators(params?: PaginationParams, filters?: CampaignStatsParams): Promise<Page<CampaignCreatorResponse>> {
  return get<Page<CampaignCreatorResponse>>(`/statistics/campaigns/leaderboards/top-creators${buildQuery({ ...params, ...filters })}`)
}

export function getEventSummary(idOrSlug: string, week?: number, scope?: PlayerScope): Promise<EventSummaryResponse> {
  return get<EventSummaryResponse>(`/statistics/events/${encodeURIComponent(idOrSlug)}/summary${buildQuery({ week, ...scope })}`)
}

export function getEventMissionLeaderboard(idOrSlug: string, params?: PaginationParams, templateId?: string, scope?: PlayerScope): Promise<Page<EventMissionLeaderboardResponse>> {
  return get<Page<EventMissionLeaderboardResponse>>(`/statistics/events/${encodeURIComponent(idOrSlug)}/missions/leaderboard${buildQuery({ ...params, templateId, ...scope })}`)
}

export function getEventParticipation(params?: PaginationParams, eventId?: string[], scope?: PlayerScope): Promise<Page<EventParticipationResponse>> {
  return get<Page<EventParticipationResponse>>(`/statistics/events/participation${buildQuery({ ...params, eventId, ...scope })}`)
}
