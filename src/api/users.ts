import type { CampaignProgressResponse } from '@/types/api/campaigns'
import type { DifficultyListParams, PublicMapDifficultyResponse } from '@/types/api/maps'
import type {
  ApToNextResponse,
  HistoricScoresParams,
  HistoricStatisticsParams,
  LevelResponse,
  RankingHistoryResponse,
  ScoreResponse,
  SkillCategory,
  SkillResponse,
  StatsDiffResponse,
  UserAllStatisticsResponse,
  UserCategoryStatisticsResponse,
  UserMilestoneProgressResponse,
  UserResponse,
  UserScoresParams,
} from '@/types/api/users'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getUser(userId: string): Promise<UserResponse> {
  return get<UserResponse>(`/users/${userId}`)
}

export function getUserScores(
  userId: string,
  params?: UserScoresParams,
): Promise<Page<ScoreResponse>> {
  return get<Page<ScoreResponse>>(`/users/${userId}/scores${buildQuery(params)}`)
}

export function getUserLevel(userId: string): Promise<LevelResponse> {
  return get<LevelResponse>(`/users/${userId}/level`)
}

export function getUserMilestones(
  userId: string,
  params?: PaginationParams,
): Promise<Page<UserMilestoneProgressResponse>> {
  return get<Page<UserMilestoneProgressResponse>>(
    `/users/${userId}/milestones${buildQuery(params)}`,
  )
}

export function getUserCampaignProgress(
  userId: string,
  campaignId: string,
): Promise<CampaignProgressResponse> {
  return get<CampaignProgressResponse>(`/users/${userId}/campaigns/${campaignId}/progress`)
}

export function getUserOverallStatistics(
  userId: string,
): Promise<UserCategoryStatisticsResponse> {
  return get<UserCategoryStatisticsResponse>(`/users/${userId}/statistics`)
}

export function getUserAllStatistics(
  userId: string,
): Promise<UserAllStatisticsResponse> {
  return get<UserAllStatisticsResponse>(`/users/${userId}/statistics/all`)
}

export function getUserHistoricStatistics(
  userId: string,
  params: HistoricStatisticsParams,
): Promise<UserCategoryStatisticsResponse[]> {
  return get<UserCategoryStatisticsResponse[]>(
    `/users/${userId}/statistics/historic${buildQuery(params)}`,
  )
}

export function getUserRankingHistory(
  userId: string,
  params: HistoricStatisticsParams,
): Promise<RankingHistoryResponse[]> {
  return get<RankingHistoryResponse[]>(
    `/users/${userId}/ranking-history${buildQuery(params)}`,
  )
}

export function getUserStatsDiff(
  userId: string,
  category?: string,
): Promise<StatsDiffResponse | null> {
  return get<StatsDiffResponse | undefined>(
    `/users/${userId}/stats-diff${buildQuery({ category })}`,
  )
    .then((res) => res ?? null)
    .catch(() => null)
}

export function getUserCompletedMilestones(
  userId: string,
): Promise<UserMilestoneProgressResponse[]> {
  return get<UserMilestoneProgressResponse[]>(`/users/${userId}/milestones/completed`)
}

export function getUserMissingMaps(
  userId: string,
  params?: DifficultyListParams,
): Promise<Page<PublicMapDifficultyResponse>> {
  return get<Page<PublicMapDifficultyResponse>>(`/users/${userId}/missing-maps${buildQuery(params)}`)
}

export function getUserScoresHistoric(
  userId: string,
  params: HistoricScoresParams,
): Promise<ScoreResponse[]> {
  return get<ScoreResponse[]>(`/users/${userId}/scores/historic${buildQuery(params)}`)
}

export function getUserSkill(userId: string): Promise<SkillResponse> {
  return get<SkillResponse>(`/users/${userId}/skill`)
}

export function getUserSkillCategory(
  userId: string,
  category: string,
): Promise<SkillCategory> {
  return get<SkillCategory>(`/users/${userId}/skill${buildQuery({ category })}`)
}

export function getUserApToNext(
  userId: string,
  category: string,
): Promise<ApToNextResponse> {
  return get<ApToNextResponse>(`/users/${userId}/categories/${category}/ap-to-next`)
}
