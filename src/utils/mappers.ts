import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import type { MilestoneCompletionResponse } from '@/types/api/milestones'
import { resolveMilestoneGlyph } from '@/utils/milestoneIcons'
import type { PublicStaffUserResponse } from '@/types/api/staff'
import type { PublicClanResponse } from '@/types/api/clans'
import type { UserRelationResponse } from '@/types/api/relations'
import type { SupporterTier } from '@/types/api/supporters'
import type { LeaderboardResponse, ScoreResponse, XpLeaderboardResponse } from '@/types/api/users'
import type { CategoryCode, DifficultyScoreDisplay, MapDisplay, MilestoneDisplay, PlayerDisplay, ScoreDisplay, ScoreFeedEntry, UserRefDisplay, XpPlayerDisplay } from '@/types/display'
import { pickCoverFallback, pickCoverUrl } from '@/utils/media'

export function formatDifficulty(diff: string): string {
  switch (diff) {
    case 'EASY': return 'Easy'
    case 'NORMAL': return 'Normal'
    case 'HARD': return 'Hard'
    case 'EXPERT': return 'Expert'
    case 'EXPERT_PLUS': return 'Expert+'
    default: return diff
  }
}

export type FlatUserRef = {
  userId: string
  avatarUrl?: string | null
  cdnAvatarUrl?: string | null
  country?: string | null
  supporterTier?: SupporterTier | null
  clan?: PublicClanResponse | null
} & ({ userName: string } | { name: string })

export function toUserRef(source: UserRefDisplay | FlatUserRef): UserRefDisplay {
  if ('userId' in source) {
    return {
      id: source.userId,
      name: 'userName' in source ? source.userName : source.name,
      avatarUrl: source.avatarUrl ?? null,
      cdnAvatarUrl: source.cdnAvatarUrl ?? null,
      country: source.country ?? null,
      supporterTier: source.supporterTier ?? null,
      clan: source.clan ?? null,
    }
  }
  return {
    id: source.id,
    name: source.name,
    avatarUrl: source.avatarUrl ?? null,
    cdnAvatarUrl: source.cdnAvatarUrl ?? null,
    country: source.country ?? null,
    supporterTier: source.supporterTier ?? null,
    clan: source.clan ?? null,
  }
}

export function toRelationUserRef(item: UserRelationResponse): UserRefDisplay {
  return {
    id: item.targetUserId ?? '',
    name: item.targetName,
    avatarUrl: item.targetAvatarUrl ?? null,
    cdnAvatarUrl: item.targetCdnAvatarUrl ?? null,
    country: item.targetCountry ?? null,
    clan: item.targetClan ?? null,
  }
}

export function toStaffUserDisplay(staff: PublicStaffUserResponse): UserRefDisplay {
  return {
    id: staff.userId ?? '',
    name: staff.username ?? '',
    avatarUrl: staff.avatarUrl,
    cdnAvatarUrl: staff.cdnAvatarUrl,
  }
}

export function toPlayerDisplay(entry: LeaderboardResponse): PlayerDisplay {
  return {
    userId: entry.userId,
    player: toUserRef(entry),
    rank: entry.ranking,
    countryRank: entry.countryRanking,
    rankChange: entry.rankingLastWeek != null ? entry.rankingLastWeek - entry.ranking : null,
    ap: entry.ap,
    avgAccuracy: entry.averageAcc,
    rankedPlays: entry.rankedPlays,
    playerInactive: entry.playerInactive,
  }
}

export function toXpPlayerDisplay(entry: XpLeaderboardResponse): XpPlayerDisplay {
  return {
    userId: entry.player.id,
    player: { ...entry.player, supporterTier: entry.supporterTier },
    rank: entry.ranking,
    countryRank: entry.countryRanking,
    rankChange: entry.rankingLastWeek != null ? entry.rankingLastWeek - entry.ranking : null,
    totalXp: entry.totalXp,
    level: entry.level,
    playerInactive: entry.playerInactive,
  }
}

export function toScoreDisplay(
  score: ScoreResponse,
  modifierNames: string[],
  categoryCode?: CategoryCode,
): ScoreDisplay {
  return {
    scoreId: score.id,
    mapId: score.mapId,
    mapDifficultyId: score.mapDifficultyId,
    beatsaverCode: score.beatsaverCode ?? null,
    characteristic: score.characteristic,
    rawDifficulty: score.difficulty,
    mapName: score.songName ?? 'Unknown Map',
    mapSubName: score.songSubName ?? null,
    artistName: score.songAuthor,
    difficulty: formatDifficulty(score.difficulty),
    categoryCode: categoryCode ?? 'overall',
    coverUrl: pickCoverUrl(score),
    coverFallbackUrl: pickCoverFallback(score),
    leaderboardRank: score.rank,
    score: score.score,
    scoreNoMods: score.scoreNoMods,
    accuracy: score.accuracy,
    ap: score.ap,
    weightedAp: score.weightedAp,
    complexity: score.complexity ?? null,
    modifiers: modifierNames,
    date: score.timeSet,
    misses: score.misses ?? undefined,
    badCuts: score.badCuts ?? undefined,
    maxCombo: score.maxCombo ?? undefined,
    wallHits: score.wallHits ?? undefined,
    bombHits: score.bombHits ?? undefined,
    pauses: score.pauses ?? undefined,
    streak115: score.streak115 ?? undefined,
    maxStreak115: score.maxStreak115 ?? null,
    playCount: score.playCount ?? undefined,
    lastPlayedAt: score.lastPlayedAt ?? null,
    hmd: score.hmd ?? undefined,
    xpGained: score.xpGained ?? undefined,
    rankWhenSet: score.rankWhenSet ?? undefined,
    blScoreId: score.blScoreId ?? undefined,
    ssScoreId: score.ssScoreId ?? undefined,
    mapAuthor: score.mapAuthor,
    active: score.active,
    partial: score.partial,
    supersedesReason: score.supersedesReason,
    supporterTier: score.supporterTier ?? null,
  }
}

export function toScoreFeedEntry(
  raw: ScoreResponse,
  modifierNames: string[],
  categoryCode?: CategoryCode,
  key: string = raw.id,
): ScoreFeedEntry {
  return {
    key,
    userId: raw.userId,
    player: toUserRef(raw),
    mapId: raw.mapId,
    mapDifficultyId: raw.mapDifficultyId,
    beatsaverCode: raw.beatsaverCode ?? null,
    characteristic: raw.characteristic,
    rawDifficulty: raw.difficulty,
    mapName: raw.songName ?? 'Unknown Map',
    mapSubName: raw.songSubName ?? null,
    artistName: raw.songAuthor ?? '',
    mapAuthor: raw.mapAuthor ?? '',
    coverUrl: pickCoverUrl(raw),
    coverFallbackUrl: pickCoverFallback(raw),
    difficulty: formatDifficulty(raw.difficulty),
    categoryCode: categoryCode ?? 'overall',
    rank: raw.rank,
    score: raw.score,
    accuracy: raw.accuracy,
    ap: raw.ap,
    weightedAp: raw.weightedAp,
    modifiers: modifierNames,
    misses: raw.misses ?? 0,
    badCuts: raw.badCuts ?? 0,
    wallHits: raw.wallHits ?? 0,
    bombHits: raw.bombHits ?? 0,
    streak115: raw.streak115 ?? 0,
    timeSet: raw.timeSet ?? raw.createdAt,
    blScoreId: raw.blScoreId ?? undefined,
  }
}

export function feedEntryToScoreDisplay(entry: ScoreFeedEntry): ScoreDisplay {
  return {
    scoreId: entry.key,
    mapId: entry.mapId,
    mapDifficultyId: entry.mapDifficultyId,
    beatsaverCode: entry.beatsaverCode,
    characteristic: entry.characteristic,
    rawDifficulty: entry.rawDifficulty,
    mapName: entry.mapName,
    mapSubName: entry.mapSubName,
    artistName: entry.artistName,
    difficulty: entry.difficulty,
    categoryCode: entry.categoryCode,
    coverUrl: entry.coverUrl,
    coverFallbackUrl: entry.coverFallbackUrl,
    leaderboardRank: entry.rank,
    score: entry.score,
    accuracy: entry.accuracy,
    ap: entry.ap,
    weightedAp: entry.weightedAp,
    complexity: null,
    modifiers: entry.modifiers,
    date: entry.timeSet,
    misses: entry.misses,
    badCuts: entry.badCuts,
    wallHits: entry.wallHits,
    bombHits: entry.bombHits,
    streak115: entry.streak115,
    blScoreId: entry.blScoreId,
    userName: entry.player.name,
    mapAuthor: entry.mapAuthor,
  }
}

export function toMapDisplay(
  diff: PublicMapDifficultyResponse,
  getCategoryCode: (id: string) => CategoryCode | undefined,
): MapDisplay {
  return {
    id: diff.mapId,
    difficultyId: diff.id,
    songName: diff.songName,
    songSubName: diff.songSubName,
    artistName: diff.songAuthor,
    mapperName: diff.mapAuthor,
    coverUrl: pickCoverUrl(diff),
    coverFallbackUrl: pickCoverFallback(diff),
    complexity: diff.complexity ?? 0,
    categoryCode: getCategoryCode(diff.categoryId) ?? 'overall',
    difficulty: diff.difficulty,
    difficultyLabel: formatDifficulty(diff.difficulty),
    characteristic: diff.characteristic,
    totalScores: diff.statistics?.totalScores,
    rankedAt: diff.rankedAt ?? undefined,
    beatsaverCode: diff.beatsaverCode ?? undefined,
  }
}

export function toDifficultyScoreDisplay(
  score: ScoreResponse,
  modifierNames: string[],
): DifficultyScoreDisplay {
  return {
    id: score.id,
    rank: score.rank,
    countryRank: score.countryRank,
    userId: score.userId,
    player: toUserRef(score),
    accuracy: score.accuracy,
    score: score.score,
    scoreNoMods: score.scoreNoMods,
    ap: score.ap,
    weightedAp: score.weightedAp,
    modifiers: modifierNames,
    date: score.timeSet,
    blScoreId: score.blScoreId ?? undefined,
    ssScoreId: score.ssScoreId ?? undefined,
    misses: score.misses,
    badCuts: score.badCuts,
    maxCombo: score.maxCombo,
    wallHits: score.wallHits,
    bombHits: score.bombHits,
    pauses: score.pauses,
    streak115: score.streak115,
    maxStreak115: score.maxStreak115 ?? null,
    playCount: score.playCount,
    lastPlayedAt: score.lastPlayedAt ?? null,
    hmd: score.hmd,
    xpGained: score.xpGained,
    rankWhenSet: score.rankWhenSet,
  }
}

export function toMilestoneDisplay(m: MilestoneCompletionResponse, categoryCode?: CategoryCode): MilestoneDisplay {
  return {
    id: m.milestoneId,
    setId: m.setId,
    title: m.title,
    description: m.description,
    type: m.type,
    tier: m.tier,
    glyph: resolveMilestoneGlyph(m.iconGroup, m.querySpec),
    xp: m.xp,
    targetValue: m.targetValue,
    userProgress: m.userProgress,
    normalizedProgress: m.userNormalizedProgress ?? null,
    completionPercent: m.completionPercentage,
    isCompleted: m.userCompleted,
    completedAt: m.userCompletedAt ?? null,
    categoryCode,
    positionX: m.positionX ?? 0,
    positionY: m.positionY ?? 0,
    rewards: m.rewards ?? [],
  }
}
