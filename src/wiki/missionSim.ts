import { normalizedAp } from '@/wiki/apCurve'

const CURVE_SCALE = 61
const CURVE_SHIFT = -18

export type MissionBand = 'easy' | 'medium' | 'hard' | 'extreme'

export const BANDS: MissionBand[] = ['easy', 'medium', 'hard', 'extreme']

export type ForgeMissionType =
  | 'ACC_ON_MAP'
  | 'AP_ON_MAP'
  | 'PB_SPECIFIC_MAP'
  | 'PB_ABOVE_THRESHOLD'
  | 'SNIPE_PLAYER_ON_MAP'
  | 'STREAK_ON_MAP'
  | 'STREAK_N_IN_CATEGORY'
  | 'COMEBACK_PB'
  | 'PLAY_N_MAPS'
  | 'XP_IN_WINDOW'
  | 'SCORES_N'

export interface MissionTemplate {
  code: string
  name: string
  type: ForgeMissionType
  pool: 'daily' | 'weekly'
  weight: number
  guaranteedDoable: boolean
  xpMultiplier: number
  bandEasy: number
  bandMedium: number
  bandHard: number
  targetCountMin: number | null
  targetCountMax: number | null
}

export const TEMPLATES: MissionTemplate[] = [
  { code: 'daily_play_n', name: 'Daily Player', type: 'PLAY_N_MAPS', pool: 'daily', weight: 40, guaranteedDoable: true, xpMultiplier: 1.0, bandEasy: 0.92, bandMedium: 1.0, bandHard: 1.08, targetCountMin: 2, targetCountMax: 7 },
  { code: 'daily_play_n_any', name: 'Daily Mileage', type: 'PLAY_N_MAPS', pool: 'daily', weight: 40, guaranteedDoable: true, xpMultiplier: 1.0, bandEasy: 0.92, bandMedium: 1.0, bandHard: 1.08, targetCountMin: 2, targetCountMax: 7 },
  { code: 'daily_set_scores', name: 'Daily Run', type: 'SCORES_N', pool: 'daily', weight: 100, guaranteedDoable: true, xpMultiplier: 1.0, bandEasy: 0.92, bandMedium: 1.0, bandHard: 1.08, targetCountMin: 1, targetCountMax: 4 },
  { code: 'daily_xp_window', name: 'Daily XP Goal', type: 'XP_IN_WINDOW', pool: 'daily', weight: 80, guaranteedDoable: true, xpMultiplier: 1.0, bandEasy: 0.5, bandMedium: 0.75, bandHard: 1.1, targetCountMin: null, targetCountMax: null },
  { code: 'daily_acc_on_map', name: 'Sharpen Your Acc', type: 'ACC_ON_MAP', pool: 'daily', weight: 100, guaranteedDoable: false, xpMultiplier: 1.1, bandEasy: 0.92, bandMedium: 1.0, bandHard: 1.08, targetCountMin: null, targetCountMax: null },
  { code: 'daily_ap_on_map', name: 'Earn the AP', type: 'AP_ON_MAP', pool: 'daily', weight: 100, guaranteedDoable: false, xpMultiplier: 1.1, bandEasy: 0.92, bandMedium: 1.0, bandHard: 1.08, targetCountMin: null, targetCountMax: null },
  { code: 'daily_pb_specific', name: 'Beat Your Best', type: 'PB_SPECIFIC_MAP', pool: 'daily', weight: 80, guaranteedDoable: false, xpMultiplier: 1.15, bandEasy: 0.95, bandMedium: 1.02, bandHard: 1.1, targetCountMin: null, targetCountMax: null },
  { code: 'daily_pb_above', name: 'Push the Top', type: 'PB_ABOVE_THRESHOLD', pool: 'daily', weight: 60, guaranteedDoable: false, xpMultiplier: 1.2, bandEasy: 0.9, bandMedium: 1.0, bandHard: 1.15, targetCountMin: 1, targetCountMax: 2 },
  { code: 'daily_snipe', name: 'Take Their Score', type: 'SNIPE_PLAYER_ON_MAP', pool: 'daily', weight: 70, guaranteedDoable: false, xpMultiplier: 1.2, bandEasy: 0.9, bandMedium: 1.05, bandHard: 1.2, targetCountMin: null, targetCountMax: null },
  { code: 'daily_streak_on_map', name: 'Streak Chaser', type: 'STREAK_ON_MAP', pool: 'daily', weight: 70, guaranteedDoable: false, xpMultiplier: 1.15, bandEasy: 0.92, bandMedium: 1.0, bandHard: 1.08, targetCountMin: null, targetCountMax: null },
  { code: 'daily_comeback', name: 'Comeback', type: 'COMEBACK_PB', pool: 'daily', weight: 70, guaranteedDoable: false, xpMultiplier: 1.15, bandEasy: 0.95, bandMedium: 1.02, bandHard: 1.1, targetCountMin: null, targetCountMax: null },
  { code: 'weekly_play_n', name: 'Weekly Grinder', type: 'PLAY_N_MAPS', pool: 'weekly', weight: 40, guaranteedDoable: false, xpMultiplier: 1.0, bandEasy: 0.92, bandMedium: 1.0, bandHard: 1.1, targetCountMin: 6, targetCountMax: 20 },
  { code: 'weekly_ap_on_map', name: 'Weekly Spotlight', type: 'AP_ON_MAP', pool: 'weekly', weight: 100, guaranteedDoable: false, xpMultiplier: 1.15, bandEasy: 0.92, bandMedium: 1.05, bandHard: 1.15, targetCountMin: null, targetCountMax: null },
  { code: 'weekly_pb_above', name: 'Stretch Your Top', type: 'PB_ABOVE_THRESHOLD', pool: 'weekly', weight: 80, guaranteedDoable: false, xpMultiplier: 1.2, bandEasy: 0.95, bandMedium: 1.05, bandHard: 1.2, targetCountMin: 2, targetCountMax: 4 },
  { code: 'weekly_snipe', name: 'Weekly Snipe', type: 'SNIPE_PLAYER_ON_MAP', pool: 'weekly', weight: 80, guaranteedDoable: false, xpMultiplier: 1.25, bandEasy: 0.95, bandMedium: 1.1, bandHard: 1.25, targetCountMin: null, targetCountMax: null },
  { code: 'weekly_streak_n_in_category', name: 'Streak Runner', type: 'STREAK_N_IN_CATEGORY', pool: 'weekly', weight: 90, guaranteedDoable: false, xpMultiplier: 1.15, bandEasy: 0.92, bandMedium: 1.0, bandHard: 1.08, targetCountMin: 2, targetCountMax: 3 },
]

const DAILY_XP_CURVE: readonly (readonly [number, number])[] = [
  [0, 20], [20, 50], [40, 95], [50, 120], [60, 150], [70, 175], [80, 205], [90, 235], [100, 265],
]

const WEEKLY_XP_CURVE: readonly (readonly [number, number])[] = [
  [0, 85], [20, 175], [40, 320], [50, 420], [60, 520], [70, 610], [80, 690], [90, 755], [100, 790],
]

function interpolate(points: readonly (readonly [number, number])[], x: number): number {
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]
    if (x <= x1) {
      const [x0, y0] = points[i - 1]
      return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
    }
  }
  return points[points.length - 1][1]
}

export function accuracyForNormalized(normalized: number): number {
  if (normalized <= 0) return 0
  if (normalized >= 1) return 1
  let lo = 0
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (normalizedAp(mid) < normalized) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function rawApFor(accuracy: number, complexity: number): number {
  return normalizedAp(accuracy) * (complexity - CURVE_SHIFT) * CURVE_SCALE
}

export function normalizedFor(rawAp: number, complexity: number): number {
  const denom = (complexity - CURVE_SHIFT) * CURVE_SCALE
  return denom <= 0 ? 0 : rawAp / denom
}

export const NORM_AP_MIN = 0.3
export const NORM_AP_MAX = 0.95
const REALISTIC_ACC_CAP = 0.995
const ACC_CEILING = 0.9995
const EXTREME_BOOST = 1.35

export function bandMultiplier(template: MissionTemplate, band: MissionBand): number {
  switch (band) {
    case 'easy': return template.bandEasy
    case 'medium': return template.bandMedium
    case 'hard': return template.bandHard
    case 'extreme': return template.bandHard * EXTREME_BOOST
  }
}

export interface ComplexityRange {
  min: number
  max: number
}

export function complexityRange(threshold: number, multiplier: number): ComplexityRange | null {
  const target = threshold * multiplier
  if (target <= 0) return null
  return {
    min: target / (NORM_AP_MAX * CURVE_SCALE) + CURVE_SHIFT,
    max: target / (NORM_AP_MIN * CURVE_SCALE) + CURVE_SHIFT,
  }
}

export function maxRealisticRawAp(complexity: number): number {
  return normalizedAp(REALISTIC_ACC_CAP) * (complexity - CURVE_SHIFT) * CURVE_SCALE
}

export function targetAccuracy(targetRawAp: number, complexity: number, peakRawAp: number | null): number {
  const normalized = normalizedFor(targetRawAp, complexity)
  const acc = accuracyForNormalized(normalized)
  const clamp = peakAccuracyClamp(peakRawAp, complexity)
  return Math.min(acc, clamp, ACC_CEILING)
}

function peakAccuracyClamp(peakRawAp: number | null, complexity: number): number {
  if (!peakRawAp || peakRawAp <= 0) return ACC_CEILING
  const normalized = Math.min(normalizedFor(peakRawAp, complexity), 1)
  return Math.min(accuracyForNormalized(normalized) + 0.005, ACC_CEILING)
}

const LIFT_STEP: Record<MissionBand, number> = { easy: 0.015, medium: 0.03, hard: 0.055, extreme: 0.09 }
const LIFT_HEADROOM: Record<MissionBand, number> = { easy: 0.15, medium: 0.3, hard: 0.5, extreme: 0.75 }

export function bandLiftedFloorAp(existingAp: number, complexity: number, band: MissionBand): number {
  const existingNormalized = normalizedFor(existingAp, complexity)
  if (existingNormalized <= 0) return existingAp + 1
  const headroom = Math.max(0, 1 - existingNormalized)
  const step = Math.min(LIFT_STEP[band], headroom * LIFT_HEADROOM[band])
  return (existingNormalized + step) * (complexity - CURVE_SHIFT) * CURVE_SCALE
}

export const SKILL_FLOOR_FRACTION: Record<MissionBand, number> = {
  easy: 0.935, medium: 0.95, hard: 0.965, extreme: 0.975,
}

export const TOP_AP_CAP_FACTOR: Record<MissionBand, number> = {
  easy: 0.96, medium: 0.97, hard: 0.98, extreme: 1.005,
}

export const MAP_WR_FLOOR: Record<MissionBand, number> = {
  easy: 0.8, medium: 0.86, hard: 0.9, extreme: 0.94,
}

export function applySkillAwareTopApNerf(baseCap: number, skillLevel: number): number {
  if (baseCap <= 0 || skillLevel >= 70) return baseCap
  const t = (70 - Math.max(0, skillLevel)) / 70
  const smoothstep = t * t * (3 - 2 * t)
  return baseCap * (1 - smoothstep * 0.07)
}

export function capAtTopAp(target: number, band: MissionBand, topAp: number, skillLevel: number): number {
  if (topAp <= 0) return target
  const baseCap = topAp * TOP_AP_CAP_FACTOR[band]
  const cap = band === 'extreme' ? baseCap : applySkillAwareTopApNerf(baseCap, skillLevel)
  return Math.min(target, cap)
}

export function realisticCeilingFraction(band: MissionBand, skillLevel: number): number {
  const skill = Math.min(100, Math.max(0, skillLevel))
  const adj = Math.max(0, (skill - 50) / 50)
  switch (band) {
    case 'easy': return 0.75 + adj * 0.1
    case 'medium': return 0.82 + adj * 0.1
    case 'hard': return 0.88 + adj * 0.08
    case 'extreme': return 0.94 + adj * 0.08
  }
}

export function capAtMapCeiling(
  target: number,
  complexity: number,
  band: MissionBand,
  skillLevel: number,
  mapWr: number,
): number {
  const fraction = realisticCeilingFraction(band, skillLevel)
  if (mapWr > 0) return Math.min(target, mapWr * fraction)
  const fallback = maxRealisticRawAp(complexity)
  return fallback > 0 ? Math.min(target, fallback * fraction) : target
}

const WR_DENSITY_THRESHOLD = 0.85
const WR_DENSITY_SLOPE = 0.4
const CLIMB_GAP_THRESHOLD = 0.03
const CLIMB_GAP_SLOPE = 0.7
const DAMPEN_FLOOR = 0.9

export function densityDampener(
  target: number,
  band: MissionBand,
  mapWr: number,
  userCurrentAp: number | null,
): number {
  if (target <= 0 || (band !== 'hard' && band !== 'extreme') || mapWr <= 0) return target
  const targetRatio = target / mapWr
  if (targetRatio <= WR_DENSITY_THRESHOLD) return target
  let dampen: number
  if (userCurrentAp && userCurrentAp > 0) {
    const climbGap = targetRatio - userCurrentAp / mapWr
    if (climbGap <= CLIMB_GAP_THRESHOLD) return target
    dampen = 1 - (climbGap - CLIMB_GAP_THRESHOLD) * CLIMB_GAP_SLOPE
  } else {
    dampen = 1 - (targetRatio - WR_DENSITY_THRESHOLD) * WR_DENSITY_SLOPE
  }
  return target * Math.max(DAMPEN_FLOOR, dampen)
}

export const MAP_BLEND_WEIGHT = 0.7
export const SKILL_BLEND_WEIGHT = 0.3

export function blendSkillAndMap(skillAnchored: number, mapTarget: number | null): number {
  if (mapTarget === null) return skillAnchored
  return mapTarget * MAP_BLEND_WEIGHT + skillAnchored * SKILL_BLEND_WEIGHT
}

export interface LeaderboardEntry {
  ap: number
  skillLevel: number | null
  name: string
  userId: string
  accuracy: number
  streak115: number
}

export function naturalRankFor(
  leaderboardDesc: LeaderboardEntry[],
  userSkill: number,
  userExistingAp: number | null,
): number {
  if (userExistingAp && userExistingAp > 0) {
    for (let i = 0; i < leaderboardDesc.length; i++) {
      if (leaderboardDesc[i].ap <= userExistingAp) return i
    }
    return leaderboardDesc.length
  }
  for (let i = 0; i < leaderboardDesc.length; i++) {
    const skill = leaderboardDesc[i].skillLevel
    if (skill !== null && skill <= userSkill) return i
  }
  return leaderboardDesc.length
}

export function rankShiftFor(band: MissionBand, naturalIdx: number): number {
  switch (band) {
    case 'easy': return Math.max(1, Math.round(naturalIdx * 0.1))
    case 'medium': return 0
    case 'hard': return -Math.max(2, Math.round(naturalIdx * 0.3))
    case 'extreme': return -Math.max(3, Math.round(naturalIdx * 0.5))
  }
}

export function mapAwareTarget(
  leaderboardDesc: LeaderboardEntry[],
  userSkill: number,
  userExistingAp: number | null,
  band: MissionBand,
): { target: number; naturalIdx: number; targetIdx: number } | null {
  if (!leaderboardDesc.length) return null
  const naturalIdx = naturalRankFor(leaderboardDesc, userSkill, userExistingAp)
  const targetIdx = Math.max(
    0,
    Math.min(leaderboardDesc.length - 1, naturalIdx + rankShiftFor(band, naturalIdx)),
  )
  return { target: leaderboardDesc[targetIdx].ap, naturalIdx, targetIdx }
}

export function minMeaningfulTarget(band: MissionBand, topAp: number, skillAnchored: number): number {
  const highBand = band === 'hard' || band === 'extreme'
  if (highBand && topAp > 0) return topAp * 0.7
  return skillAnchored * 0.8
}

export function bandFromWeightedRatio(weighted: number, maxWeighted: number): MissionBand {
  if (maxWeighted <= 0) return 'medium'
  const ratio = weighted / maxWeighted
  if (ratio >= 0.8) return 'extreme'
  if (ratio >= 0.4) return 'hard'
  if (ratio >= 0.1) return 'medium'
  return 'easy'
}

export function blendBands(assigned: MissionBand, derived: MissionBand): MissionBand {
  const idx = Math.round(0.6 * BANDS.indexOf(assigned) + 0.4 * BANDS.indexOf(derived))
  return BANDS[Math.min(BANDS.length - 1, Math.max(0, idx))]
}

export const SNIPE_BAND_FRACTION: Record<MissionBand, number> = {
  easy: 0.93, medium: 0.95, hard: 0.97, extreme: 0.985,
}

export const SNIPE_SLACK: Record<MissionBand, number> = {
  easy: 1.0, medium: 1.01, hard: 1.03, extreme: 1.04,
}

export const SNIPE_FLOOR_FRACTION: Record<MissionBand, number> = {
  easy: 0.95, medium: 0.97, hard: 0.99, extreme: 1.01,
}

export const SNIPE_MAX_SKILL_DISTANCE: Record<MissionBand, number> = {
  easy: 5, medium: 8, hard: 12, extreme: 18,
}

const SNIPE_BOOST_DIVISOR = 500
const SNIPE_BOOST_CAP = 0.5

export function snipeBoost(snipeDistance: number | null): number {
  if (snipeDistance === null) return 1
  return 1 + Math.min(snipeDistance / SNIPE_BOOST_DIVISOR, SNIPE_BOOST_CAP)
}

export function computeXpReward(
  template: MissionTemplate,
  skillLevel: number,
  band: MissionBand,
  snipeDistance: number | null,
): number {
  const curve = template.pool === 'weekly' ? WEEKLY_XP_CURVE : DAILY_XP_CURVE
  const base = interpolate(curve, skillLevel)
  return Math.round(base * template.xpMultiplier * bandMultiplier(template, band) * snipeBoost(snipeDistance))
}

export function xpCurveBase(pool: 'daily' | 'weekly', skillLevel: number): number {
  return interpolate(pool === 'weekly' ? WEEKLY_XP_CURVE : DAILY_XP_CURVE, skillLevel)
}

export const BAND_WEIGHTS: Record<MissionBand, number> = {
  easy: 30, medium: 40, hard: 25, extreme: 5,
}

export const COUNT_CENTER_FRACTION: Record<MissionBand, number> = {
  easy: 0.17, medium: 0.5, hard: 0.83, extreme: 1.0,
}

export function countCenter(template: MissionTemplate, band: MissionBand): number {
  const min = template.targetCountMin ?? 1
  const max = template.targetCountMax ?? Math.max(min + 1, 10)
  const spread = Math.max(1, max - min)
  return min + Math.round(spread * COUNT_CENTER_FRACTION[band])
}

export function countJitterRange(template: MissionTemplate): number {
  const min = template.targetCountMin ?? 1
  const max = template.targetCountMax ?? Math.max(min + 1, 10)
  return Math.max(1, Math.floor(Math.max(1, max - min) / 6))
}

export const PB_ABOVE_PERCENTILE: Record<MissionBand, number> = {
  easy: 0.7, medium: 0.45, hard: 0.22, extreme: 0.1,
}

export const PB_ABOVE_SHIFT: Record<MissionBand, number> = {
  easy: 0.98, medium: 1.0, hard: 1.015, extreme: 1.02,
}

export const STREAK_TARGET_FRACTION: Record<MissionBand, number> = {
  easy: 0.5, medium: 0.7, hard: 0.9, extreme: 1.0,
}

export function streakTargetFor(band: MissionBand, reference: number, topTier: boolean): number {
  switch (band) {
    case 'easy': return Math.round(reference * 0.5)
    case 'medium': return Math.round(reference * 0.7)
    case 'hard': return topTier ? reference : Math.round(reference * 0.9)
    case 'extreme': return topTier ? reference + 1 : reference
  }
}

export const STREAK_COMPLEXITY_MIN = 1
export const STREAK_COMPLEXITY_MAX = 15
export const STREAK_COMPLEXITY_BAND_SIZE = 3

export function streakComplexityBand(complexity: number): [number, number] {
  const clamped = Math.max(STREAK_COMPLEXITY_MIN, Math.min(STREAK_COMPLEXITY_MAX, complexity))
  const count = Math.ceil((STREAK_COMPLEXITY_MAX - STREAK_COMPLEXITY_MIN) / STREAK_COMPLEXITY_BAND_SIZE)
  const index = Math.max(
    0,
    Math.min(count - 1, Math.floor((clamped - STREAK_COMPLEXITY_MIN) / STREAK_COMPLEXITY_BAND_SIZE)),
  )
  const lo = STREAK_COMPLEXITY_MIN + STREAK_COMPLEXITY_BAND_SIZE * index
  return [lo, lo + STREAK_COMPLEXITY_BAND_SIZE]
}

export function mapStreakReference(topStreaks: number[], fallback: number): number {
  if (!topStreaks.length) return fallback
  const max = topStreaks[0]
  const avg = topStreaks.reduce((sum, v) => sum + v, 0) / topStreaks.length
  return Math.max(2, Math.round(0.6 * avg + 0.4 * max))
}

const SKILL_GAP_FLOOR = 10
const SKILL_GAP_HIGH = 25
const SKILL_GAP_MAX = 40
const LIFT_SHALLOW = 0.4
const LIFT_MID = 0.65
const LIFT_DEEP = 0.85

export function liftFractionFor(skillGap: number): number {
  if (skillGap >= SKILL_GAP_MAX) return LIFT_DEEP
  if (skillGap >= SKILL_GAP_HIGH) return LIFT_MID
  return LIFT_SHALLOW
}

export interface CategorySkill {
  categoryCode: string
  categoryName: string
  skillLevel: number
  rawApForOneGain: number
  topAp: number
  rankedPlays: number
}

export interface LiftResult {
  threshold: number
  lifted: boolean
  fromCategory: string | null
  skillGap: number
  fraction: number
}

export function liftedThreshold(target: CategorySkill, others: CategorySkill[]): LiftResult {
  const flat: LiftResult = {
    threshold: target.rawApForOneGain,
    lifted: false,
    fromCategory: null,
    skillGap: 0,
    fraction: 0,
  }
  const best = others
    .filter((s) => s.categoryCode !== target.categoryCode && s.rawApForOneGain > 0)
    .sort((a, b) => b.skillLevel - a.skillLevel)[0]
  if (!best) return flat
  const skillGap = best.skillLevel - target.skillLevel
  if (skillGap < SKILL_GAP_FLOOR) return flat
  if (best.rawApForOneGain <= target.rawApForOneGain) return flat
  let fraction = liftFractionFor(skillGap)
  if (best.rankedPlays > 0) {
    const playRatio = target.rankedPlays / best.rankedPlays
    if (playRatio >= 1) fraction = 0
    else fraction *= Math.max(0.3, 1 - playRatio * 0.7)
  }
  if (fraction <= 0) return flat
  return {
    threshold: target.rawApForOneGain + (best.rawApForOneGain - target.rawApForOneGain) * fraction,
    lifted: true,
    fromCategory: best.categoryName,
    skillGap,
    fraction,
  }
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function weightedPick<T extends { weight: number }>(
  items: T[],
  roll: number,
): { item: T; total: number; landed: number } | null {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  if (total <= 0) return null
  const landed = roll * total
  let acc = 0
  for (const item of items) {
    acc += item.weight
    if (landed < acc) return { item, total, landed }
  }
  return { item: items[items.length - 1], total, landed }
}

export function bandFromRoll(roll: number): MissionBand {
  const value = roll * 100
  if (value < 30) return 'easy'
  if (value < 70) return 'medium'
  if (value < 95) return 'hard'
  return 'extreme'
}
