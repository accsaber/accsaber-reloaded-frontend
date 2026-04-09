export type { MilestoneTier } from './display'

export type StaffRole = 'RANKING' | 'RANKING_HEAD' | 'ADMIN' | 'DEVELOPER' | 'MODERATOR'

export type StaffUserStatus = 'REQUESTED' | 'ACCEPTED' | 'DENIED'

export type MapDifficultyStatus = 'QUEUE' | 'QUALIFIED' | 'RANKED'

export type BatchStatus = 'DRAFT' | 'RELEASE_READY' | 'RELEASED'

export type MilestoneType = 'MILESTONE' | 'ACHIEVEMENT'

export type MilestoneComparison = 'GTE' | 'LTE'

export type MilestoneStatus = 'DRAFT' | 'ACTIVE'

export type MapVoteAction = 'RANK' | 'UNRANK' | 'REWEIGHT'

export type VoteType = 'UPVOTE' | 'DOWNVOTE' | 'NEUTRAL'

export type CriteriaStatus = 'PENDING' | 'PASSED' | 'FAILED'

export type CurveType = 'POINT_LOOKUP' | 'FORMULA'

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT' | 'EXPERT_PLUS'
