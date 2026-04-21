export interface BeatSaverMapResponse {
  id: string
  metadata: {
    songName: string
    songSubName: string
    songAuthorName: string
    levelAuthorName: string
    bpm: number
    duration: number
  }
  versions: {
    hash: string
    coverURL: string
    diffs: {
      difficulty: string
      characteristic: string
      njs: number
      notes: number
    }[]
  }[]
}

const BEATSAVER_URL_PATTERN = /(?:beatsaver\.com\/maps\/|^)([a-f0-9]+)$/i

export function parseBeatSaverCode(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const match = trimmed.match(BEATSAVER_URL_PATTERN)
  if (match) return match[1]

  if (/^[a-f0-9]+$/i.test(trimmed)) return trimmed

  return null
}

interface BeatLeaderLeaderboardEntry {
  id: string
  difficulty: {
    value: number
    mode: number
    difficultyName: string
    modeName: string
  }
}

const BL_DIFF_VALUE_TO_NAME: Record<number, string> = {
  1: 'Easy',
  3: 'Normal',
  5: 'Hard',
  7: 'Expert',
  9: 'ExpertPlus',
}


export interface BeatLeaderScore {
  id: number
  baseScore: number
  modifiedScore: number
  accuracy: number
  rank: number
  modifiers: string
  player: {
    id: string
    name: string
    avatar: string
    country: string
  }
}

export interface BeatLeaderLeaderboardPayload {
  scores: BeatLeaderScore[]
  maxScore: number
}

interface BeatLeaderLeaderboardResponse {
  scores?: { data?: BeatLeaderScore[] } | BeatLeaderScore[]
  difficulty?: { maxScore?: number; maxScoreGraph?: unknown }
  song?: { difficulties?: Array<{ maxScore?: number }> }
}

export async function fetchBeatLeaderScores(
  leaderboardId: string,
  count = 100,
): Promise<BeatLeaderLeaderboardPayload> {
  const url = `/proxy/beatleader/leaderboard/${encodeURIComponent(leaderboardId)}?page=1&count=${count}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`BeatLeader request failed: ${res.status}`)
  const data = (await res.json()) as BeatLeaderLeaderboardResponse
  const rawScores = Array.isArray(data.scores)
    ? data.scores
    : (data.scores?.data ?? [])
  const maxScore = data.difficulty?.maxScore
    ?? data.song?.difficulties?.[0]?.maxScore
    ?? 0
  return { scores: rawScores, maxScore }
}

export async function fetchBeatLeaderLeaderboards(hash: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const res = await fetch(`/proxy/beatleader/leaderboards/hash/${hash}`)
    if (!res.ok) return map
    const data = await res.json()
    const leaderboards: BeatLeaderLeaderboardEntry[] = data.leaderboards ?? []
    for (const entry of leaderboards) {
      const diffName = BL_DIFF_VALUE_TO_NAME[entry.difficulty.value] ?? ''
      const characteristic = entry.difficulty.modeName
      const key = `${diffName}-${characteristic}`
      map.set(key, entry.id)
    }
  } catch {
  }
  return map
}

const DIFFICULTY_TO_ENUM: Record<string, string> = {
  Easy: 'EASY',
  Normal: 'NORMAL',
  Hard: 'HARD',
  Expert: 'EXPERT',
  ExpertPlus: 'EXPERT_PLUS',
}

export function difficultyToEnum(bsDifficulty: string): string {
  return DIFFICULTY_TO_ENUM[bsDifficulty] ?? bsDifficulty.toUpperCase()
}

export function formatBsDifficulty(bsDifficulty: string): string {
  if (bsDifficulty === 'ExpertPlus') return 'Expert+'
  return bsDifficulty
}

export async function fetchBeatSaverMap(code: string): Promise<BeatSaverMapResponse> {
  const res = await fetch(`/proxy/beatsaver/maps/id/${code}`)
  if (!res.ok) {
    throw new Error(`BeatSaver API returned ${res.status}`)
  }
  return res.json()
}

export interface ScoreSaberDifficulty {
  leaderboardId: number
  difficulty: number
  gameMode: string
  difficultyRaw: string
}

const SS_DIFF_VALUE_TO_NAME: Record<number, string> = {
  1: 'Easy',
  3: 'Normal',
  5: 'Hard',
  7: 'Expert',
  9: 'ExpertPlus',
}

export interface ScoreSaberScoreEntry {
  score: {
    id: number
    baseScore: number
    modifiedScore: number
    modifiers: string
    rank: number
  }
  leaderboardPlayerInfo: {
    id: string
    name: string
    profilePicture: string
    country: string
  } | null
}

export interface ScoreSaberLeaderboardScoresResponse {
  scores?: ScoreSaberScoreEntry[]
  metadata?: { maxScore?: number }
  leaderboard?: { maxScore?: number }
}

export interface ScoreSaberScoresPayload {
  scores: ScoreSaberScoreEntry[]
  maxScore: number
}

export async function fetchScoreSaberScores(
  leaderboardId: string,
  count = 100,
): Promise<ScoreSaberScoresPayload> {
  const all: ScoreSaberScoreEntry[] = []
  let maxScore = 0
  const pageSize = 12
  const maxPages = Math.ceil(count / pageSize)
  for (let page = 1; page <= maxPages; page++) {
    const url = `/proxy/scoresaber/api/leaderboard/by-id/${encodeURIComponent(leaderboardId)}/scores?page=${page}&withMetadata=true`
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`ScoreSaber request failed: ${res.status}`)
    const data = (await res.json()) as ScoreSaberLeaderboardScoresResponse
    const batch = data.scores ?? []
    if (!maxScore) {
      maxScore = data.metadata?.maxScore ?? data.leaderboard?.maxScore ?? 0
    }
    for (const s of batch) {
      if (s.leaderboardPlayerInfo) all.push(s)
    }
    if (batch.length === 0 || all.length >= count) break
  }
  return { scores: all.slice(0, count), maxScore }
}

export async function fetchScoreSaberLeaderboards(hash: string): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const res = await fetch(`/proxy/scoresaber/api/leaderboard/get-difficulties/${hash}`)
    if (!res.ok) return map
    const data: ScoreSaberDifficulty[] = await res.json()
    for (const entry of data) {
      const diffName = SS_DIFF_VALUE_TO_NAME[entry.difficulty] ?? ''
      const characteristic = entry.gameMode.replace('Solo', '')
      const key = `${diffName}-${characteristic}`
      map.set(key, entry.leaderboardId)
    }
  } catch {
  }
  return map
}
