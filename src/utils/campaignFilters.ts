import type { CampaignProgressFilter, UserCampaignListParams } from '@/types/api/campaigns'
import type { SortDirection } from '@/types/display'

export interface CampaignSortOption {
  key: string
  order: SortDirection
  label: string
}

export interface CampaignFilterState {
  search: string
  sort: string
  order: SortDirection
  official: boolean
  curated: boolean
  loved: boolean
  tagIds: string[]
  progressStatus: CampaignProgressFilter[]
}

export const BROWSE_SORT_OPTIONS: readonly CampaignSortOption[] = [
  { key: 'publishedAt', order: 'desc', label: 'Newest' },
  { key: 'voteScore', order: 'desc', label: 'Top rated' },
  { key: 'lovedAt', order: 'desc', label: 'Recently loved' },
  { key: 'totalXp', order: 'desc', label: 'Most XP' },
  { key: 'totalRewardCount', order: 'desc', label: 'Most loot' },
  { key: 'name', order: 'asc', label: 'A-Z' },
]

export const USER_CAMPAIGN_SORT_OPTIONS: readonly CampaignSortOption[] = [
  { key: 'progress', order: 'desc', label: 'Progress' },
  { key: 'publishedAt', order: 'desc', label: 'Newest' },
  { key: 'totalXp', order: 'desc', label: 'Most XP' },
  { key: 'totalRewardCount', order: 'desc', label: 'Most loot' },
  { key: 'lovedAt', order: 'desc', label: 'Recently loved' },
  { key: 'name', order: 'asc', label: 'A-Z' },
]

export function createCampaignFilterState(): CampaignFilterState {
  return {
    search: '',
    sort: 'progress',
    order: 'desc',
    official: false,
    curated: false,
    loved: false,
    tagIds: [],
    progressStatus: [],
  }
}

export function toUserCampaignParams(state: CampaignFilterState): UserCampaignListParams {
  return {
    search: state.search || undefined,
    tagIds: state.tagIds.length > 0 ? state.tagIds : undefined,
    official: state.official || undefined,
    loved: state.loved || undefined,
    status: state.curated ? ['CURATED'] : undefined,
    progressStatus: state.progressStatus.length > 0 ? state.progressStatus : undefined,
    sort: `${state.sort},${state.order}`,
  }
}
