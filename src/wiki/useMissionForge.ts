import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import type { MissionResponse } from '@/types/api/missions'
import type { ScoreResponse } from '@/types/api/users'
import {
  accuracyForNormalized,
  bandFromRoll,
  bandFromWeightedRatio,
  bandLiftedFloorAp,
  bandMultiplier,
  BAND_WEIGHTS,
  blendBands,
  blendSkillAndMap,
  capAtMapCeiling,
  capAtTopAp,
  complexityRange,
  computeXpReward,
  countCenter,
  countJitterRange,
  densityDampener,
  liftedThreshold,
  mapAwareTarget,
  mapStreakReference,
  MAP_WR_FLOOR,
  minMeaningfulTarget,
  mulberry32,
  NORM_AP_MAX,
  NORM_AP_MIN,
  PB_ABOVE_PERCENTILE,
  PB_ABOVE_SHIFT,
  realisticCeilingFraction,
  SKILL_FLOOR_FRACTION,
  SNIPE_BAND_FRACTION,
  SNIPE_FLOOR_FRACTION,
  SNIPE_MAX_SKILL_DISTANCE,
  SNIPE_SLACK,
  streakComplexityBand,
  streakTargetFor,
  targetAccuracy,
  TEMPLATES,
  TOP_AP_CAP_FACTOR,
  weightedPick,
  type CategorySkill,
  type ForgeMissionType,
  type LeaderboardEntry,
  type MissionBand,
  type MissionTemplate,
} from '@/wiki/missionSim'
import { ref, shallowRef } from 'vue'

export interface ForgeProfile {
  name: string
  real: boolean
  userId: string | null
  totalXp: number
  categories: (CategorySkill & { categoryId: string })[]
}

export interface ChainStep {
  label: string
  detail: string
  value: number
  changed: boolean
}

export type ForgeStageData =
  | { kind: 'template'; templates: (MissionTemplate & { chosen: boolean })[]; total: number; chosenOdds: number; pool: 'daily' | 'weekly' }
  | { kind: 'category'; options: { code: string; name: string; plays: number; chosen: boolean }[] }
  | { kind: 'band'; band: MissionBand; forced: string | null; weights: typeof BAND_WEIGHTS; roll: number }
  | { kind: 'anchor'; base: number; lifted: number; fromCategory: string | null; skillGap: number; fraction: number; multiplier: number; anchored: number }
  | { kind: 'window'; min: number; max: number; target: number; empty: boolean; poolMin: number; poolMax: number; qualified: number; total: number }
  | { kind: 'pool'; total: number; sample: PublicMapDifficultyResponse[]; picked: PublicMapDifficultyResponse | null; complexity: number; wr: number; rejected: number }
  | { kind: 'existing'; score: ScoreResponse | null; assigned: MissionBand; derived: MissionBand | null; blended: MissionBand; caption: string }
  | { kind: 'chain'; steps: ChainStep[]; final: number; accuracy: number | null }
  | { kind: 'board'; entries: (LeaderboardEntry & { rank: number; viable: boolean; picked: boolean; reason: string | null })[]; target: number; floor: number; cap: number; maxSkillDistance: number; userSkill: number }
  | { kind: 'streak'; sample: number[]; reference: number; ability: number; target: number; fromBand: boolean; complexityBand: [number, number] | null; pickIndex: number }
  | { kind: 'percentile'; scores: number[]; index: number; anchor: number; shift: number; threshold: number; qualifying: number }
  | { kind: 'count'; min: number; max: number; center: number; jitter: number; count: number }
  | { kind: 'xpwindow'; rolling: number; multiplier: number; target: number }
  | { kind: 'reward'; base: number; xpMultiplier: number; bandMultiplier: number; boost: number; boostLabel: string | null; total: number }
  | { kind: 'result'; mission: MissionResponse }

export interface ForgeStage {
  key: string
  title: string
  receipt: string
  note: string
  data: ForgeStageData
}

const MAP_TYPES: ForgeMissionType[] = [
  'ACC_ON_MAP',
  'AP_ON_MAP',
  'PB_SPECIFIC_MAP',
  'SNIPE_PLAYER_ON_MAP',
  'STREAK_ON_MAP',
]

const POOL_FETCH_SIZE = 200
const LEADERBOARD_SIZE = 100

function fmtAp(value: number): string {
  return `${Math.round(value).toLocaleString()} AP`
}

function fmtComplexity(value: number): string {
  return value.toFixed(2)
}

export function useMissionForge(profileRef: () => ForgeProfile | null) {
  const stages = shallowRef<ForgeStage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const failure = ref<string | null>(null)

  const poolCache = new Map<string, PublicMapDifficultyResponse[]>()
  const scoreCache = new Map<string, ScoreResponse[]>()
  const leaderboardCache = new Map<string, LeaderboardEntry[]>()

  async function fetchPool(categoryId: string): Promise<PublicMapDifficultyResponse[]> {
    const cached = poolCache.get(categoryId)
    if (cached) return cached
    const { getDifficulties } = await import('@/api/maps')
    const page = await getDifficulties({
      categoryId,
      status: 'RANKED',
      page: 0,
      size: POOL_FETCH_SIZE,
    })
    poolCache.set(categoryId, page.content)
    return page.content
  }

  function complexitySpread(pool: PublicMapDifficultyResponse[]): { min: number; max: number } {
    const values = pool.map((d) => d.complexity ?? 0).filter((c) => c > 0)
    if (!values.length) return { min: 0, max: 0 }
    return { min: Math.min(...values), max: Math.max(...values) }
  }

  async function fetchLeaderboard(difficultyId: string): Promise<LeaderboardEntry[]> {
    const cached = leaderboardCache.get(difficultyId)
    if (cached) return cached
    const { getDifficultyScores } = await import('@/api/maps')
    const page = await getDifficultyScores(difficultyId, { page: 0, size: LEADERBOARD_SIZE, sort: 'ap,desc' })
    const entries = page.content
      .filter((s) => s.ap > 0)
      .map((s) => ({
        ap: s.ap,
        skillLevel: s.skillLevel ?? null,
        name: s.userName,
        userId: s.userId,
        accuracy: s.accuracy,
        streak115: s.streak115,
      }))
      .sort((a, b) => b.ap - a.ap)
    leaderboardCache.set(difficultyId, entries)
    return entries
  }

  async function fetchScores(userId: string, categoryId: string): Promise<ScoreResponse[]> {
    const key = `${userId}:${categoryId}`
    const cached = scoreCache.get(key)
    if (cached) return cached
    const { getUserScores } = await import('@/api/users')
    const page = await getUserScores(userId, {
      categoryId,
      page: 0,
      size: 200,
      sort: 'ap,desc',
    })
    scoreCache.set(key, page.content)
    return page.content
  }

  function templateStage(
    type: ForgeMissionType,
    pool: 'daily' | 'weekly',
    template: MissionTemplate,
  ): ForgeStage {
    const inPool = TEMPLATES.filter((t) => t.pool === pool)
    const total = inPool.reduce((sum, t) => sum + t.weight, 0)
    const matching = inPool.filter((t) => t.type === type)
    const odds = matching.reduce((sum, t) => sum + t.weight, 0) / total
    return {
      key: 'template',
      title: 'Roll a template',
      receipt: `${template.name} (${pool})`,
      note: `Every slot starts with a weighted roll across the ${pool} pool. Heavier templates come up more often. This one carries a weight of ${template.weight} out of ${total}, so on any given roll you have about a ${Math.round(odds * 100)}% chance of landing on this kind of mission.`,
      data: {
        kind: 'template',
        pool,
        total,
        chosenOdds: odds,
        templates: inPool.map((t) => ({ ...t, chosen: t.code === template.code })),
      },
    }
  }

  function categoryStage(
    profile: ForgeProfile,
    chosen: (CategorySkill & { categoryId: string }) | null,
  ): ForgeStage {
    return {
      key: 'category',
      title: 'Pick a category',
      receipt: chosen ? chosen.categoryName : 'No category',
      note: chosen
        ? `Only the categories you have actually played can be picked, and a daily slot avoids repeating a category the other slot already used. ${profile.name} has ${profile.categories.length} in play, and this roll landed on ${chosen.categoryName}.`
        : 'This mission type is not tied to a category, so nothing is picked here. It counts whatever you play.',
      data: {
        kind: 'category',
        options: profile.categories.map((c) => ({
          code: c.categoryCode,
          name: c.categoryName,
          plays: c.rankedPlays,
          chosen: chosen ? c.categoryCode === chosen.categoryCode : false,
        })),
      },
    }
  }

  function bandStage(band: MissionBand, roll: number, forced: string | null): ForgeStage {
    return {
      key: 'band',
      title: 'Roll a band',
      receipt: band,
      note: forced
        ? `${forced} This slot is locked to ${band}.`
        : `The band decides how hard the mission is allowed to get. A daily roll is weighted 30 / 40 / 25 / 5 across easy, medium, hard and extreme, so extreme shows up on roughly one slot in twenty. This roll landed on ${band}.`,
      data: { kind: 'band', band, forced, weights: BAND_WEIGHTS, roll },
    }
  }

  function anchorStage(
    skill: CategorySkill,
    lift: ReturnType<typeof liftedThreshold>,
    multiplier: number,
  ): ForgeStage {
    const anchored = lift.threshold * multiplier
    return {
      key: 'anchor',
      title: 'Find your starting point',
      receipt: fmtAp(anchored),
      note: lift.lifted
        ? `Everything starts from the AP you would need for one point of total AP in this category, which is ${fmtAp(skill.rawApForOneGain)}. You are noticeably stronger in ${lift.fromCategory}, so that number gets pulled up to ${fmtAp(lift.threshold)} to stop an under-played category from handing you free missions. The band multiplier of ${multiplier.toFixed(2)}x then sets the starting point at ${fmtAp(anchored)}.`
        : `Everything starts from the AP you would need to raise your total AP in this category by one, which for ${skill.categoryName} is ${fmtAp(skill.rawApForOneGain)}. The band multiplier of ${multiplier.toFixed(2)}x turns that into a starting point of ${fmtAp(anchored)}. This is what the system wants from you before it has looked at any map.`,
      data: {
        kind: 'anchor',
        base: skill.rawApForOneGain,
        lifted: lift.threshold,
        fromCategory: lift.fromCategory,
        skillGap: lift.skillGap,
        fraction: lift.fraction,
        multiplier,
        anchored,
      },
    }
  }

  function windowStage(input: {
    range: { min: number; max: number }
    target: number
    categoryName: string
    spread: { min: number; max: number }
    qualified: number
    total: number
  }): ForgeStage {
    const { range, target, categoryName, spread, qualified, total } = input
    const accLo = `${(accuracyForNormalized(NORM_AP_MIN) * 100).toFixed(1)}%`
    const accHi = `${(accuracyForNormalized(NORM_AP_MAX) * 100).toFixed(1)}%`
    const empty = qualified === 0
    const priced = `A map only qualifies if hitting the starting point on it would cost between roughly ${accLo} and ${accHi} accuracy, anywhere from a proper run up to the edge of what is humanly possible.`
    return {
      key: 'window',
      title: 'Mark the complexity range',
      receipt: empty ? 'No maps qualify' : `${qualified} of ${total} maps`,
      note: empty
        ? range.max < spread.min
          ? `${priced} Every ranked map in ${categoryName} would hand you your starting point of ${fmtAp(target)} below ${accLo}, which counts as free, so nothing qualifies and this mission cannot be built. On a young account that is the usual reason a map mission quietly sits the day out, and it opens up on its own as you set scores.`
          : `${priced} Your starting point of ${fmtAp(target)} would need more than ${accHi} on every ranked map in ${categoryName}, which is past what anyone holds, so nothing qualifies and this mission cannot be built.`
        : `${priced} ${qualified} of the ${total} ranked maps in ${categoryName} price ${fmtAp(target)} inside that window, running from complexity ${fmtComplexity(Math.max(spread.min, range.min))} to ${fmtComplexity(Math.min(spread.max, range.max))}. On the rest it would either be out of reach or come close to free.`,
      data: {
        kind: 'window',
        min: range.min,
        max: range.max,
        target,
        empty,
        poolMin: spread.min,
        poolMax: spread.max,
        qualified,
        total,
      },
    }
  }

  function poolStage(
    qualified: number,
    coversAll: boolean,
    sample: PublicMapDifficultyResponse[],
    picked: PublicMapDifficultyResponse | null,
    wr: number,
    rejected: number,
  ): ForgeStage {
    const opening = coversAll
      ? `Every one of the ${qualified} ranked maps in this category prices your starting point sensibly, so all of them are in play.`
      : `These are the ${qualified} ranked maps sitting inside that range.`
    return {
      key: 'pool',
      title: 'Sample a map',
      receipt: picked ? `${picked.songName} (${picked.difficulty})` : 'No map found',
      note: picked
        ? `${opening} They are pulled live. One gets picked at random, and any map whose world record sits too far below your own best play gets thrown back, because a map nobody has scored well on cannot produce a meaningful target.${rejected > 0 ? ` ${rejected} were rejected that way before this one stuck.` : ''}`
        : 'Nothing in the ranked pool fits this range, so the slot moves on and tries a different template.',
      data: {
        kind: 'pool',
        total: qualified,
        sample,
        picked,
        complexity: picked?.complexity ?? 0,
        wr,
        rejected,
      },
    }
  }

  function rewardStage(
    template: MissionTemplate,
    skillLevel: number,
    band: MissionBand,
    base: number,
    boost: number,
    boostLabel: string | null,
    total: number,
  ): ForgeStage {
    return {
      key: 'reward',
      title: 'Price the reward',
      receipt: `${total.toLocaleString()} XP`,
      note: `XP comes off a curve keyed to your skill level in this category, so stronger players are paid more for the same shape of mission. Your skill of ${Math.round(skillLevel)} pays a base of ${Math.round(base)}, the template multiplies by ${template.xpMultiplier.toFixed(2)}x, and the band multiplies by ${bandMultiplier(template, band).toFixed(2)}x.${boostLabel ? ` ${boostLabel}` : ''}`,
      data: {
        kind: 'reward',
        base,
        xpMultiplier: template.xpMultiplier,
        bandMultiplier: bandMultiplier(template, band),
        boost,
        boostLabel,
        total,
      },
    }
  }

  function resultStage(input: {
    template: MissionTemplate
    type: ForgeMissionType
    description: string
    band: MissionBand
    xp: number
    categoryCode?: string | null
    targetPlayerName?: string | null
    targetMapSongName?: string | null
    targetAcc?: number
    targetAp?: number
    targetCount?: number
    targetXp?: number
    targetStreak?: number
    targetThresholdAp?: number
  }): ForgeStage {
    const mission: MissionResponse = {
      id: 'wiki-forge',
      name: input.template.name,
      description: input.description,
      type: input.type,
      pool: input.template.pool,
      band: input.band,
      status: 'active',
      xpReward: input.xp,
      categoryCode: (input.categoryCode ?? undefined) as MissionResponse['categoryCode'],
      targetPlayerName: input.targetPlayerName ?? undefined,
      targetMapSongName: input.targetMapSongName ?? undefined,
      targetAcc: input.targetAcc,
      targetAp: input.targetAp,
      targetCount: input.targetCount,
      targetXp: input.targetXp,
      targetStreak: input.targetStreak,
      targetThresholdAp: input.targetThresholdAp,
      progressCount: 0,
    }
    return {
      key: 'result',
      title: 'The mission',
      receipt: input.description,
      note: 'That is the whole derivation. What you see below is the same card the site renders in your missions dropdown, built from the numbers this run just produced.',
      data: { kind: 'result', mission },
    }
  }

  function fail(reason: string) {
    failure.value = reason
  }

  async function buildMapTarget(
    profile: ForgeProfile,
    template: MissionTemplate,
    skill: CategorySkill & { categoryId: string },
    band: MissionBand,
    rng: () => number,
    out: ForgeStage[],
  ) {
    const others = profile.categories.filter((c) => c.categoryCode !== skill.categoryCode)
    const lift = liftedThreshold(skill, others)
    const multiplier = bandMultiplier(template, band)
    out.push(anchorStage(skill, lift, multiplier))

    const anchored = lift.threshold * multiplier
    const range = complexityRange(lift.threshold, multiplier) ?? { min: 0, max: 0 }
    const pool = await fetchPool(skill.categoryId)
    const spread = complexitySpread(pool)
    const inRange = pool.filter((d) => {
      const complexity = d.complexity ?? 0
      return complexity >= range.min && complexity <= range.max
    })
    if (!inRange.length) {
      out.push(
        windowStage({
          range,
          target: anchored,
          categoryName: skill.categoryName,
          spread,
          qualified: 0,
          total: pool.length,
        }),
      )
      fail('no-eligible-map')
      return null
    }
    const coversAll = inRange.length === pool.length
    if (!coversAll) {
      out.push(
        windowStage({
          range,
          target: anchored,
          categoryName: skill.categoryName,
          spread,
          qualified: inRange.length,
          total: pool.length,
        }),
      )
    }

    const wrFloor = skill.topAp * MAP_WR_FLOOR[band]
    let picked: PublicMapDifficultyResponse | null = null
    let rejected = 0
    const shuffled = [...inRange]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    for (const candidate of shuffled) {
      const wr = candidate.statistics?.maxAp ?? 0
      if (skill.topAp > 0 && wr > 0 && wr < wrFloor) {
        rejected += 1
        continue
      }
      picked = candidate
      break
    }
    if (!picked) {
      out.push(poolStage(inRange.length, coversAll, inRange, null, 0, rejected))
      fail('map-wr-below-user-tier')
      return null
    }

    const complexity = picked.complexity ?? 0
    const wr = picked.statistics?.maxAp ?? 0
    out.push(poolStage(inRange.length, coversAll, inRange, picked, wr, rejected))

    const leaderboard = await fetchLeaderboard(picked.id)
    const mine = profile.userId
      ? (leaderboard.find((e) => e.userId === profile.userId) ?? null)
      : null
    const existingAp = mine?.ap ?? null

    return { lift, multiplier, anchored, complexity, wr, picked, leaderboard, existingAp, mine }
  }

  function targetChain(
    anchored: number,
    band: MissionBand,
    complexity: number,
    wr: number,
    skill: CategorySkill,
    leaderboard: LeaderboardEntry[],
    existingAp: number | null,
  ): { steps: ChainStep[]; final: number } {
    const steps: ChainStep[] = []
    let value = anchored
    steps.push({ label: 'Starting point', detail: 'what the band wants before the map exists', value, changed: false })

    const map = mapAwareTarget(leaderboard, skill.skillLevel, existingAp, band)
    if (map) {
      const blended = blendSkillAndMap(anchored, map.target)
      steps.push({
        label: 'Blend with the map',
        detail: `the leaderboard says players at your level sit around rank ${map.naturalIdx + 1}; this band aims at rank ${map.targetIdx + 1} (${fmtAp(map.target)}), weighted 70% map to 30% starting point`,
        value: blended,
        changed: Math.abs(blended - value) > 0.5,
      })
      value = blended
    }

    const floor = anchored * SKILL_FLOOR_FRACTION[band]
    if (floor > value) {
      steps.push({ label: 'Floor', detail: `never drop below ${(SKILL_FLOOR_FRACTION[band] * 100).toFixed(1)}% of the starting point`, value: floor, changed: true })
      value = floor
    }

    if (existingAp && existingAp > 0) {
      const lifted = bandLiftedFloorAp(existingAp, complexity, band)
      if (lifted > value) {
        steps.push({ label: 'Beat your own play', detail: `you already have ${fmtAp(existingAp)} here, so the target has to clear it by a real step`, value: lifted, changed: true })
        value = lifted
      }
    }

    const topCapped = capAtTopAp(value, band, skill.topAp, skill.skillLevel)
    if (topCapped < value) {
      steps.push({ label: 'Cap against your best', detail: `${band} is not allowed past ${(TOP_AP_CAP_FACTOR[band] * 100).toFixed(1)}% of your ${fmtAp(skill.topAp)} top play${skill.skillLevel < 70 ? ', shaded down further because you are still climbing' : ''}`, value: topCapped, changed: true })
      value = topCapped
    }

    const mapCapped = capAtMapCeiling(value, complexity, band, skill.skillLevel, wr)
    if (mapCapped < value) {
      steps.push({ label: 'Cap against the map', detail: `no target above ${(realisticCeilingFraction(band, skill.skillLevel) * 100).toFixed(0)}% of the ${fmtAp(wr)} world record on it`, value: mapCapped, changed: true })
      value = mapCapped
    }

    const dampened = densityDampener(value, band, wr, existingAp)
    if (dampened < value) {
      steps.push({ label: 'Ease off a crowded top', detail: 'the top of this leaderboard is packed tight, so the climb gets shortened', value: dampened, changed: true })
      value = dampened
    }

    return { steps, final: value }
  }

  async function build(type: ForgeMissionType, pool: 'daily' | 'weekly', seed: number) {
    const profile = profileRef()
    if (!profile) throw new Error('no profile')
    const rng = mulberry32(seed)
    const out: ForgeStage[] = []
    failure.value = null

    const candidates = TEMPLATES.filter((t) => t.type === type && t.pool === pool)
    const template = candidates.length
      ? (weightedPick(candidates, rng())?.item ?? candidates[0])
      : TEMPLATES.filter((t) => t.type === type)[0]
    if (!template) throw new Error('no template')
    const effectivePool = template.pool
    out.push(templateStage(type, effectivePool, template))

    const needsCategory = type !== 'XP_IN_WINDOW' && type !== 'SCORES_N'
    const chosenCategory = needsCategory && profile.categories.length
      ? profile.categories[Math.floor(rng() * profile.categories.length)]
      : null
    out.push(categoryStage(profile, chosenCategory))

    const flatBand: MissionBand = rng() < 0.5 ? 'easy' : 'medium'
    const simpleTypes = type === 'PLAY_N_MAPS' || type === 'SCORES_N' || type === 'XP_IN_WINDOW'
    const band = simpleTypes ? flatBand : bandFromRoll(rng())
    out.push(
      bandStage(
        band,
        rng(),
        simpleTypes
          ? 'Counting missions never run above medium, because a bigger number is grind rather than difficulty.'
          : null,
      ),
    )

    const skillLevel = chosenCategory?.skillLevel ?? profile.categories[0]?.skillLevel ?? 50

    if (type === 'XP_IN_WINDOW') {
      const rolling = profile.totalXp / 365
      const multiplier = bandMultiplier(template, band)
      const target = Math.max(100, Math.round(rolling * multiplier))
      out.push({
        key: 'xpwindow',
        title: 'Size the XP goal',
        receipt: `${target.toLocaleString()} XP`,
        note: `This one is measured against you rather than a map. Your lifetime XP spread across a year gives a rough daily pace of ${Math.round(rolling).toLocaleString()} XP, the band scales that by ${multiplier.toFixed(2)}x, and the result never drops below 100. Play at your usual rate and it clears itself.`,
        data: { kind: 'xpwindow', rolling, multiplier, target },
      })
      const base = computeXpReward(template, skillLevel, band, null) / (template.xpMultiplier * bandMultiplier(template, band))
      const xp = Math.max(50, computeXpReward(template, skillLevel, band, null))
      out.push(rewardStage(template, skillLevel, band, base, 1, null, xp))
      out.push(
        resultStage({
          template,
          type,
          description: `Earn ${target.toLocaleString()} XP from any source.`,
          band,
          xp,
          targetXp: target,
        }),
      )
      return out
    }

    if (type === 'PLAY_N_MAPS' || type === 'SCORES_N') {
      const min = template.targetCountMin ?? 1
      const max = template.targetCountMax ?? 3
      const center = countCenter(template, band)
      const jitterRange = countJitterRange(template)
      const jitter = Math.round((rng() * 2 - 1) * jitterRange)
      const count = Math.min(max, Math.max(min, center + jitter))
      out.push({
        key: 'count',
        title: 'Roll a count',
        receipt: String(count),
        note: `The template allows anywhere from ${min} to ${max}. The band decides where in that range to sit, ${band} centering on ${center}, and a small jitter keeps it from being the same number every day.`,
        data: { kind: 'count', min, max, center, jitter, count },
      })
      const base = computeXpReward(template, skillLevel, band, null) / (template.xpMultiplier * bandMultiplier(template, band))
      const xp = computeXpReward(template, skillLevel, band, null)
      out.push(rewardStage(template, skillLevel, band, base, 1, null, xp))
      const noun = type === 'PLAY_N_MAPS' ? 'ranked maps' : 'new scores'
      const scope = chosenCategory ? ` in ${chosenCategory.categoryName}` : ''
      out.push(
        resultStage({
          template,
          type,
          description:
            type === 'PLAY_N_MAPS' ? `Play ${count} ${noun}${scope}.` : `Set ${count} ${noun}.`,
          band,
          xp,
          categoryCode: chosenCategory?.categoryCode ?? null,
          targetCount: count,
        }),
      )
      return out
    }

    if (!chosenCategory) {
      fail('no-category')
      return out
    }

    if (type === 'PB_ABOVE_THRESHOLD') {
      if (!profile.userId) {
        fail('needs-real-profile')
        return out
      }
      const scores = await fetchScores(profile.userId, chosenCategory.categoryId)
      const aps = scores.map((s) => s.ap).filter((v) => v > 0).sort((a, b) => b - a)
      if (aps.length < 5) {
        fail('too-few-scores-in-category')
        return out
      }
      const percentile = PB_ABOVE_PERCENTILE[band]
      const idx = Math.min(aps.length - 1, Math.max(0, Math.round(aps.length * percentile)))
      const anchor = aps[idx]
      const shift = PB_ABOVE_SHIFT[band]
      const capped = Math.min(
        Math.round(anchor * shift),
        Math.round(capAtTopAp(aps[0] * 0.97, band, aps[0], chosenCategory.skillLevel)),
      )
      const qualifying = aps.filter((v) => v >= capped).length
      out.push({
        key: 'percentile',
        title: 'Read your own history',
        receipt: fmtAp(capped),
        note: `No map gets picked here. Your ${aps.length} scores in ${chosenCategory.categoryName} get sorted, and ${band} reaches ${Math.round(percentile * 100)}% of the way down the list to find a threshold you have already cleared ${qualifying} times. Nudged by ${shift.toFixed(3)}x and capped below your top play, that lands on ${fmtAp(capped)}. The mission is then to beat any one of those.`,
        data: { kind: 'percentile', scores: aps.slice(0, 40), index: idx, anchor, shift, threshold: capped, qualifying },
      })
      const min = template.targetCountMin ?? 1
      const max = template.targetCountMax ?? 2
      const center = countCenter(template, band)
      const jitter = Math.round((rng() * 2 - 1) * countJitterRange(template))
      const count = Math.min(Math.min(max, Math.max(min, center + jitter)), qualifying)
      out.push({
        key: 'count',
        title: 'Roll a count',
        receipt: String(count),
        note: `How many of them you need, between ${min} and ${max}, clamped so it can never ask for more PBs than you have qualifying maps.`,
        data: { kind: 'count', min, max, center, jitter, count },
      })
      const base = computeXpReward(template, chosenCategory.skillLevel, band, null) / (template.xpMultiplier * bandMultiplier(template, band))
      const xp = computeXpReward(template, chosenCategory.skillLevel, band, null)
      out.push(rewardStage(template, chosenCategory.skillLevel, band, base, 1, null, xp))
      out.push(
        resultStage({
          template,
          type,
          description: `Get ${count} PB${count === 1 ? '' : 's'} on any ${chosenCategory.categoryName} map where you already have a ${Math.round(capped)}+ AP play.`,
          band,
          xp,
          categoryCode: chosenCategory.categoryCode,
          targetCount: count,
          targetThresholdAp: capped,
        }),
      )
      return out
    }

    if (type === 'STREAK_N_IN_CATEGORY') {
      if (!profile.userId) {
        fail('needs-real-profile')
        return out
      }
      const scores = await fetchScores(profile.userId, chosenCategory.categoryId)
      const streaks = scores.map((s) => s.streak115).filter((v) => v > 0).sort((a, b) => b - a).slice(0, 30)
      if (!streaks.length) {
        fail('user-streak-too-low')
        return out
      }
      const rep = representativeStreak(streaks, band)
      const reference = rep.value
      if (reference < 3) {
        fail('user-streak-too-low')
        return out
      }
      const topTier = chosenCategory.skillLevel >= 90
      const target = Math.max(3, streakTargetFor(band, reference, topTier))
      out.push({
        key: 'streak',
        title: 'Read your streaks',
        receipt: `${target}-note streak`,
        note: `Your best 115 streaks in ${chosenCategory.categoryName} get sampled. ${streakBasis(rep)} One lucky night is not allowed to inflate every streak mission you get, and ${band} asks for ${Math.round((band === 'extreme' ? 1 : band === 'hard' ? 0.9 : band === 'medium' ? 0.7 : 0.5) * 100)}% of it.`,
        data: { kind: 'streak', sample: streaks.slice(0, 12), reference, ability: reference, target, fromBand: false, complexityBand: null, pickIndex: rep.index },
      })
      const min = template.targetCountMin ?? 2
      const max = template.targetCountMax ?? 3
      const center = countCenter(template, band)
      const jitter = Math.round((rng() * 2 - 1) * countJitterRange(template))
      const count = Math.min(max, Math.max(min, center + jitter))
      out.push({
        key: 'count',
        title: 'Roll a count',
        receipt: String(count),
        note: `And how many maps you need to do it on, between ${min} and ${max}.`,
        data: { kind: 'count', min, max, center, jitter, count },
      })
      const base = computeXpReward(template, chosenCategory.skillLevel, band, null) / (template.xpMultiplier * bandMultiplier(template, band))
      const xp = computeXpReward(template, chosenCategory.skillLevel, band, null)
      out.push(rewardStage(template, chosenCategory.skillLevel, band, base, 1, null, xp))
      out.push(
        resultStage({
          template,
          type,
          description: `Hit a ${target}-note 115 streak on ${count} ranked maps in ${chosenCategory.categoryName}.`,
          band,
          xp,
          categoryCode: chosenCategory.categoryCode,
          targetCount: count,
          targetStreak: target,
        }),
      )
      return out
    }

    if (type === 'COMEBACK_PB') {
      if (!profile.userId) {
        fail('needs-real-profile')
        return out
      }
      const scores = await fetchScores(profile.userId, chosenCategory.categoryId)
      const cutoff = Date.now() - 365 * 24 * 3600 * 1000
      const old = scores.filter((s) => new Date(s.timeSet).getTime() < cutoff && s.ap > 0)
      if (!old.length) {
        fail('no-old-scores-for-comeback')
        return out
      }
      const chosen = old[Math.floor(rng() * old.length)]
      const maxWeighted = Math.max(...scores.map((s) => s.weightedAp ?? 0))
      const derived = bandFromWeightedRatio(chosen.weightedAp ?? 0, maxWeighted)
      const complexity = chosen.complexity ?? 0
      const wr = (await fetchLeaderboard(chosen.mapDifficultyId))[0]?.ap ?? 0
      let value = bandLiftedFloorAp(chosen.ap, complexity, derived)
      const steps: ChainStep[] = [
        { label: 'Your old play', detail: `set ${new Date(chosen.timeSet).toLocaleDateString()} on ${chosen.songName}`, value: chosen.ap, changed: false },
        { label: 'Ask for a step up', detail: 'the step is measured on the accuracy curve, so it shrinks as the old play gets closer to perfect', value, changed: true },
      ]
      const topCapped = capAtTopAp(value, derived, chosenCategory.topAp, chosenCategory.skillLevel)
      if (topCapped < value) {
        steps.push({ label: 'Cap against your best', detail: `held under ${(TOP_AP_CAP_FACTOR[derived] * 100).toFixed(1)}% of your ${fmtAp(chosenCategory.topAp)} top play`, value: topCapped, changed: true })
        value = topCapped
      }
      const mapCapped = capAtMapCeiling(value, complexity, derived, chosenCategory.skillLevel, wr)
      if (mapCapped < value) {
        steps.push({
          label: 'Cap against the map',
          detail: wr > 0
            ? `held under ${Math.round(realisticCeilingFraction(derived, chosenCategory.skillLevel) * 100)}% of the ${fmtAp(wr)} world record`
            : 'kept inside what the map realistically allows',
          value: mapCapped,
          changed: true,
        })
        value = mapCapped
      }
      const dampened = densityDampener(value, derived, wr, chosen.ap)
      if (dampened < value) {
        steps.push({ label: 'Ease off a crowded top', detail: 'the top of this leaderboard is tight, so the ask backs off a little', value: dampened, changed: true })
        value = dampened
      }
      if (value <= chosen.ap) {
        out.push({
          key: 'chain',
          title: 'Dust off an old score',
          receipt: 'Target lands below your old play',
          note: `The ceilings brought the ask under the very play it is supposed to beat, which happens when that old score already sits near the top of what the map gives. Showing you a number you passed years ago would be worse than showing nothing, so this old score gets dropped and another one gets tried.`,
          data: { kind: 'chain', steps, final: value, accuracy: null },
        })
        fail('target-below-existing-after-caps')
        return out
      }
      out.push({
        key: 'chain',
        title: 'Dust off an old score',
        receipt: fmtAp(value),
        note: `Comeback missions skip the map pool entirely. One of your scores older than a year gets picked, and the band comes from how much that play still carries your total rather than from a dice roll, so a comeback on a play that barely matters anymore never gets classified as extreme. The step it asks for is measured on the accuracy curve, which is why an old 99.5% play is asked for far less than an old 96% one. The number is what the card displays, though the mission itself completes the moment you beat that old play at all.`,
        data: { kind: 'chain', steps, final: value, accuracy: null },
      })
      const base = computeXpReward(template, chosenCategory.skillLevel, derived, null) / (template.xpMultiplier * bandMultiplier(template, derived))
      const xp = computeXpReward(template, chosenCategory.skillLevel, derived, null)
      out.push(rewardStage(template, chosenCategory.skillLevel, derived, base, 1, null, xp))
      out.push(
        resultStage({
          template,
          type,
          description: `Beat your old PB on ${chosen.songName}.`,
          band: derived,
          xp,
          categoryCode: chosenCategory.categoryCode,
          targetMapSongName: chosen.songName,
          targetAp: value,
        }),
      )
      return out
    }

    if (!MAP_TYPES.includes(type)) {
      fail('unsupported-type')
      return out
    }

    const built = await buildMapTarget(profile, template, chosenCategory, band, rng, out)
    if (!built) return out
    const { anchored, complexity, wr, picked, leaderboard, existingAp } = built

    let effectiveBand = band
    if ((type === 'ACC_ON_MAP' || type === 'AP_ON_MAP') && existingAp) {
      const derived = bandFromWeightedRatio(existingAp, chosenCategory.topAp)
      effectiveBand = blendBands(band, derived)
      out.push({
        key: 'existing',
        title: 'Check your own score',
        receipt: effectiveBand === band ? `still ${band}` : `${band} to ${effectiveBand}`,
        note: `You already have ${fmtAp(existingAp)} on this map, and the mission has to beat it. That earns the band a second opinion: the rolled band and the one your existing score implies get blended 60 / 40. Topping one of your best plays is never easy work no matter what was rolled, and a modest step up never deserves the extreme tag.`,
        data: {
          kind: 'existing',
          score: null,
          assigned: band,
          derived,
          blended: effectiveBand,
          caption: `assigned ${band}, your play implies ${derived}`,
        },
      })
    }

    if (type === 'PB_SPECIFIC_MAP' && !existingAp && band !== 'easy') {
      effectiveBand = 'easy'
      out.push({
        key: 'existing',
        title: 'First time on this map',
        receipt: `${band} to easy`,
        note: `Personal best missions on a map you have never played only ever ask you to put a score on the board, because there is nothing of yours to beat yet. Leaving the ${band} tag on that would pay ${band} XP for a first attempt, so the band drops to easy and the target, the ceilings and the reward all get rebuilt from there.`,
        data: {
          kind: 'existing',
          score: null,
          assigned: band,
          derived: null,
          blended: 'easy',
          caption: `rolled ${band}, no score of yours on this map`,
        },
      })
    }

    const effectiveAnchor = effectiveBand === band ? anchored : built.lift.threshold * bandMultiplier(template, effectiveBand)
    const { steps, final } = targetChain(
      effectiveAnchor,
      effectiveBand,
      complexity,
      wr,
      chosenCategory,
      leaderboard,
      existingAp,
    )

    if (type === 'SNIPE_PLAYER_ON_MAP') {
      const skillAnchored = built.lift.threshold * SNIPE_BAND_FRACTION[band]
      const skillFloor = skillAnchored * SKILL_FLOOR_FRACTION[band]
      let target: number
      if (existingAp && existingAp > 0) {
        target = Math.max(bandLiftedFloorAp(existingAp, complexity, band), skillFloor)
        target = capAtTopAp(target, band, chosenCategory.topAp, chosenCategory.skillLevel)
        target = densityDampener(target, band, wr, existingAp)
      } else {
        const map = mapAwareTarget(leaderboard, chosenCategory.skillLevel, null, band)
        target = blendSkillAndMap(skillAnchored, map?.target ?? null)
        target = Math.max(target, skillFloor)
        target = capAtTopAp(target, band, chosenCategory.topAp, chosenCategory.skillLevel)
        target = densityDampener(target, band, wr, null)
      }
      const cap = existingAp && existingAp > 0
        ? target
        : capAtTopAp(target * SNIPE_SLACK[band], band, chosenCategory.topAp, chosenCategory.skillLevel)
      const floor = existingAp && existingAp > 0 ? existingAp : target * SNIPE_FLOOR_FRACTION[band]
      const maxDistance = SNIPE_MAX_SKILL_DISTANCE[band]
      const annotated = leaderboard
        .map((entry, i) => ({ entry, rank: i + 1 }))
        .filter(({ entry }) => entry.userId !== profile.userId)
        .map(({ entry, rank }) => {
          let reason: string | null = null
          if (entry.ap > cap) reason = 'too far above the target'
          else if (entry.ap < floor) reason = 'not enough of a climb'
          else if (entry.skillLevel !== null && Math.abs(entry.skillLevel - chosenCategory.skillLevel) > maxDistance) {
            reason = 'too far outside your tier'
          }
          return { ...entry, rank, viable: reason === null, picked: false, reason }
        })
      const viable = annotated
        .filter((e) => e.viable)
        .sort((a, b) => Math.abs(a.ap - target) - Math.abs(b.ap - target))
      const boardSlice = <T extends { ap: number }>(entries: T[], centerIndex: number): T[] => {
        const size = 14
        const start = Math.max(0, Math.min(centerIndex - Math.floor(size / 2), entries.length - size))
        return entries.slice(start, start + size)
      }
      if (!viable.length) {
        const nearestIdx = annotated.reduce(
          (best, e, i) => (Math.abs(e.ap - target) < Math.abs(annotated[best].ap - target) ? i : best),
          0,
        )
        out.push({
          key: 'board',
          title: 'Find someone to beat',
          receipt: 'No candidate fits',
          note: `The range on this map is empty. Every score is either too far above the target, not enough of a climb to be worth setting, or held by someone too far outside your tier. The slot gives up on this map and tries another one.`,
          data: { kind: 'board', entries: boardSlice(annotated, nearestIdx), target, floor, cap, maxSkillDistance: maxDistance, userSkill: chosenCategory.skillLevel },
        })
        fail('no-snipe-candidate-within-band')
        return out
      }
      const pickIndex = Math.floor(rng() * Math.min(3, viable.length))
      const chosen = viable[pickIndex]
      const marked = annotated.map((e) => ({ ...e, picked: e.userId === chosen.userId }))
      out.push({
        key: 'board',
        title: 'Find someone to beat',
        receipt: `${chosen.name} at ${fmtAp(chosen.ap)}`,
        note: `Now it needs a real person. The target AP opens a range: a floor at ${(SNIPE_FLOOR_FRACTION[band] * 100).toFixed(0)}% of it so the snipe is a genuine climb rather than two AP, and a ceiling so it stays reachable. On top of that, anyone more than ${maxDistance} skill points away from you is filtered out, which is what stops you being told to snipe someone two tiers up. Whatever survives gets ranked by closeness to the target, and one of the top three is taken.`,
        data: { kind: 'board', entries: boardSlice(marked, marked.findIndex((e) => e.picked)), target, floor, cap, maxSkillDistance: maxDistance, userSkill: chosenCategory.skillLevel },
      })
      const snipeDistance = existingAp && existingAp > 0
        ? Math.max(0, chosen.ap - existingAp)
        : Math.max(0, bandLiftedFloorAp(chosen.ap, complexity, band) - chosen.ap)
      const base = computeXpReward(template, chosenCategory.skillLevel, band, null) / (template.xpMultiplier * bandMultiplier(template, band))
      const xp = computeXpReward(template, chosenCategory.skillLevel, band, snipeDistance)
      const boost = 1 + Math.min(snipeDistance / 500, 0.5)
      out.push(
        rewardStage(
          template,
          chosenCategory.skillLevel,
          band,
          base,
          boost,
          `Snipes pay extra for distance: you are being asked to climb ${fmtAp(snipeDistance)}, which adds ${((boost - 1) * 100).toFixed(0)}%.`,
          xp,
        ),
      )
      out.push(
        resultStage({
          template,
          type,
          description: `Beat ${chosen.name}'s score on ${picked.songName}.`,
          band,
          xp,
          categoryCode: chosenCategory.categoryCode,
          targetMapSongName: picked.songName,
          targetPlayerName: chosen.name,
          targetAp: chosen.ap,
          targetAcc: chosen.accuracy * 100,
        }),
      )
      return out
    }

    if (type === 'STREAK_ON_MAP') {
      const [lo, hi] = streakComplexityBand(complexity)
      const mapStreaks = leaderboard
        .map((e) => e.streak115)
        .filter((v) => v > 0)
        .sort((a, b) => b - a)
        .slice(0, 5)
      const userStreaks = profile.userId
        ? (await fetchScores(profile.userId, chosenCategory.categoryId))
            .filter((s) => s.complexity !== null && s.complexity >= lo && s.complexity < hi)
            .map((s) => s.streak115)
            .filter((v) => v > 0)
            .sort((a, b) => b - a)
            .slice(0, 30)
        : []
      const abilityRep = representativeStreak(userStreaks, band)
      const ability = abilityRep.value
      if (ability < 3) {
        out.push({
          key: 'streak',
          title: 'Read your streaks',
          receipt: 'Not enough streak history here',
          note: `Streak targets are read from how you streak on maps of this difficulty specifically, complexity ${lo} to ${hi}, not from one blended number. You do not have enough there yet, so this map gets resampled rather than the mission being dropped.`,
          data: { kind: 'streak', sample: userStreaks.slice(0, 12), reference: 0, ability, target: 0, fromBand: true, complexityBand: [lo, hi], pickIndex: -1 },
        })
        fail('user-streak-too-low-for-complexity')
        return out
      }
      const reference = mapStreakReference(mapStreaks, ability)
      const topTier = chosenCategory.skillLevel >= 90
      const target = Math.max(3, Math.min(streakTargetFor(band, reference, topTier), ability + 1))
      out.push({
        key: 'streak',
        title: 'Read your streaks',
        receipt: `${target}-note streak`,
        note: `This is measured against maps like this one rather than your whole category. Complexity ${complexity.toFixed(1)} puts it in the ${lo} to ${hi} band. ${streakBasis(abilityRep)} The map's own top five streaks give ${reference}, ${band} asks for a share of that, and the whole thing is capped at one above what you have actually managed on maps this hard.`,
        data: { kind: 'streak', sample: userStreaks.slice(0, 12), reference, ability, target, fromBand: true, complexityBand: [lo, hi], pickIndex: abilityRep.index },
      })
      const base = computeXpReward(template, chosenCategory.skillLevel, band, null) / (template.xpMultiplier * bandMultiplier(template, band))
      const xp = computeXpReward(template, chosenCategory.skillLevel, band, null)
      out.push(rewardStage(template, chosenCategory.skillLevel, band, base, 1, null, xp))
      out.push(
        resultStage({
          template,
          type,
          description: `Hit a ${target}-note 115 streak on ${picked.songName}.`,
          band,
          xp,
          categoryCode: chosenCategory.categoryCode,
          targetMapSongName: picked.songName,
          targetStreak: target,
        }),
      )
      return out
    }

    if (existingAp && final <= existingAp) {
      out.push({ ...chainStage(steps, final, null), receipt: 'Target lands below your own score' })
      fail('target-below-existing-after-caps')
      return out
    }
    const meaningful = minMeaningfulTarget(effectiveBand, chosenCategory.topAp, effectiveAnchor)
    if (final < meaningful) {
      out.push({ ...chainStage(steps, final, null), receipt: 'Target too small to bother with' })
      fail('target-below-min-meaningful')
      return out
    }

    const accuracy = type === 'ACC_ON_MAP' ? targetAccuracy(final, complexity, chosenCategory.topAp) : null
    out.push(chainStage(steps, final, accuracy))

    const base = computeXpReward(template, chosenCategory.skillLevel, effectiveBand, null) / (template.xpMultiplier * bandMultiplier(template, effectiveBand))
    const xp = computeXpReward(template, chosenCategory.skillLevel, effectiveBand, null)
    out.push(rewardStage(template, chosenCategory.skillLevel, effectiveBand, base, 1, null, xp))

    const description =
      type === 'ACC_ON_MAP'
        ? `Hit ${((accuracy ?? 0) * 100).toFixed(2)}%+ accuracy on ${picked.songName}.`
        : type === 'AP_ON_MAP'
          ? `Score ${Math.round(final).toLocaleString()}+ AP on ${picked.songName}.`
          : `Set a personal best on ${picked.songName}.`
    out.push(
      resultStage({
        template,
        type,
        description,
        band: effectiveBand,
        xp,
        categoryCode: chosenCategory.categoryCode,
        targetMapSongName: picked.songName,
        targetAcc: accuracy !== null ? accuracy * 100 : undefined,
        targetAp: type === 'ACC_ON_MAP' ? undefined : final,
      }),
    )
    return out
  }

  function chainStage(steps: ChainStep[], final: number, accuracy: number | null): ForgeStage {
    return {
      key: 'chain',
      title: 'Settle on a number',
      receipt: accuracy !== null ? `${(accuracy * 100).toFixed(2)}%` : fmtAp(final),
      note: 'Here is the part nobody gets to see. The starting point is only an opening bid. It gets blended with what the leaderboard says players at your level actually score on this map, then pushed up by floors and pulled down by ceilings until it lands somewhere that is a real climb without being a fantasy.',
      data: { kind: 'chain', steps, final, accuracy },
    }
  }

  interface StreakReference {
    value: number
    index: number
    outlierGuarded: boolean
    median: number
    max: number
  }

  function representativeStreak(top: number[], band: MissionBand): StreakReference {
    if (!top.length) return { value: 0, index: -1, outlierGuarded: false, median: 0, max: 0 }
    const head = top.slice(0, 10)
    const max = head[0]
    const medianIndex = Math.min(Math.floor(head.length / 2), head.length - 1)
    const median = head[medianIndex]
    if (head.length >= 5 && max > median * 1.5) {
      const multiplier = band === 'easy' ? 0.8 : band === 'medium' ? 0.9 : band === 'hard' ? 1.05 : 1.3
      return {
        value: Math.max(2, Math.round(median * multiplier)),
        index: medianIndex,
        outlierGuarded: true,
        median,
        max,
      }
    }
    const idx = Math.min(
      Math.max(Math.round((top.length - 1) * 0.3), Math.min(4, top.length - 1)),
      top.length - 1,
    )
    return { value: top[idx], index: idx, outlierGuarded: false, median, max }
  }

  function ordinal(n: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const mod = n % 100
    return `${n}${suffixes[(mod - 20) % 10] ?? suffixes[mod] ?? suffixes[0]}`
  }

  function streakBasis(rep: StreakReference): string {
    return rep.outlierGuarded
      ? `Your best run of ${rep.max} is a spike next to the ${rep.median} you typically land, so the reference gets built from the middle of your list instead and comes out at ${rep.value}.`
      : `The reference is your ${ordinal(rep.index + 1)} best, ${rep.value}, deliberately not your top run.`
  }

  async function run(type: ForgeMissionType, pool: 'daily' | 'weekly', seed: number) {
    loading.value = true
    error.value = null
    stages.value = []
    try {
      stages.value = await build(type, pool, seed)
    } catch {
      error.value = 'Could not reach the leaderboards to build this one. Try again in a moment.'
    } finally {
      loading.value = false
    }
  }

  return { stages, loading, error, failure, run }
}
