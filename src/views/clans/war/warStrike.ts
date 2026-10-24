import type { ClanWarStrikePreviewResponse, ClanWarStrikeRulesResponse } from '@/types/api/clans'
import { formatStanding } from '@/utils/clans'
import { formatAccuracy, formatFixed } from '@/utils/formatters'

export type StrikeKind = 'damage' | 'chip' | 'none'

export interface StrikeLine {
  label: string
  value: string
  detail?: string
  muted?: boolean
}

interface StrikeBreakdown {
  damage: number
  lines: StrikeLine[]
}

export interface StrikeOutcome extends StrikeBreakdown {
  kind: StrikeKind
  note: string
}

export function formatDamage(value: number): string {
  if (value > 0 && value < 0.1) return '<0.1'
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

const formatRate = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 3 })

function factor(label: string, value: number, detail: string): StrikeLine {
  const shown = formatFixed(value, 2)
  return { label, value: `x${shown}`, detail, muted: shown === formatFixed(1, 2) }
}

function skillDetail(preview: ClanWarStrikePreviewResponse, exponent: number): string {
  const power = exponent === 1 ? '' : `, to the power ${formatDamage(exponent)}`
  return `your skill ${formatDamage(preview.attackerSkill)} vs theirs ${formatDamage(preview.victimSkill)}${power}`
}

type Streak = Pick<ClanWarStrikePreviewResponse, 'hitsThisCycle' | 'noScoreHitsThisCycle' | 'chipsThisCycle'>

export function streakFactor(rules: ClanWarStrikeRulesResponse, streak: Streak): number {
  return rules.escalation ** streak.hitsThisCycle * rules.missingScoreEscalation ** streak.noScoreHitsThisCycle
    * rules.chipEscalation ** streak.chipsThisCycle
}

const NO_STREAK: Streak = { hitsThisCycle: 0, noScoreHitsThisCycle: 0, chipsThisCycle: 0 }

const mapStreak = (preview: ClanWarStrikePreviewResponse): Streak => (preview.onMap?.repeatMap ? NO_STREAK : preview)

export function noScoreDamage(rules: ClanWarStrikeRulesResponse, preview: ClanWarStrikePreviewResponse): number {
  return rules.baseDamage * streakFactor(rules, mapStreak(preview)) * rules.missingScoreMultiplier
    * (preview.onMap?.mapPenalty ?? 1) * preview.lastStand
}

function streakLines(rules: ClanWarStrikeRulesResponse, preview: ClanWarStrikePreviewResponse): StrikeLine[] {
  const base = { label: 'Base damage', value: formatDamage(rules.baseDamage) }
  if (preview.onMap?.repeatMap) return [base, factor('Streak', 1, 'already hit on this map: no streak bonus')]
  const rates = [
    `x${formatRate(rules.escalation)} per map hit (${preview.hitsThisCycle})`,
    `x${formatRate(rules.missingScoreEscalation)} per no-score map hit (${preview.noScoreHitsThisCycle})`,
    `x${formatRate(rules.chipEscalation)} per chip (${preview.chipsThisCycle})`,
  ]
  return [base, factor('Streak', streakFactor(rules, preview), `since their guard came back: ${rates.join(', ')}`)]
}

function lastStandLines(preview: ClanWarStrikePreviewResponse): StrikeLine[] {
  return preview.lastStand < 1 ? [factor('Last stand', preview.lastStand, 'few of their team are still unbroken')] : []
}

function penaltyLines(preview: ClanWarStrikePreviewResponse): StrikeLine[] {
  const penalty = preview.onMap?.mapPenalty ?? 1
  const map = penalty < 1 ? [factor('Map penalty', penalty, 'this map broke them before')] : []
  return [...map, ...lastStandLines(preview)]
}

function hitLines(rules: ClanWarStrikeRulesResponse, preview: ClanWarStrikePreviewResponse): StrikeLine[] {
  return [
    ...streakLines(rules, preview),
    factor('Skill gap', preview.disparity, skillDetail(preview, rules.disparityExponent)),
    ...penaltyLines(preview),
  ]
}

function finish(lines: StrikeLine[], damage: number, guard: number, suffix = ''): StrikeBreakdown {
  const capped = Math.min(damage, guard)
  const cap: StrikeLine[] = damage > guard
    ? [{ label: 'Guard cap', value: formatDamage(guard), detail: 'a hit never takes more than the guard they have left' }]
    : []
  return { damage: capped, lines: [...lines, ...cap, { label: '=', value: `${formatDamage(capped)}${suffix}` }] }
}

export function hitBreakdown(
  rules: ClanWarStrikeRulesResponse,
  preview: ClanWarStrikePreviewResponse,
  guard: number,
): StrikeBreakdown {
  const hits = `${preview.hitsToBreak} ${preview.hitsToBreak === 1 ? 'hit' : 'hits'} to break`
  const result = finish(hitLines(rules, preview), preview.damage, guard, ` per hit, ${hits}`)
  return { ...result, lines: [...result.lines, breakLine(preview)] }
}

function breakLine(preview: ClanWarStrikePreviewResponse): StrikeLine {
  const taken = formatStanding(preview.standingTaken)
  const gained = formatStanding(preview.standingGained)
  return taken === gained
    ? { label: 'Breaking them', value: `${taken} Standing`, detail: 'from their clan to yours' }
    : { label: 'Breaking them', value: `-${taken} Standing`, detail: `for their clan, +${gained} for yours` }
}

function accuracyGap(targetAccuracy: number, accuracy: number): number {
  if (accuracy === targetAccuracy) return 0
  return -Math.log10(1 - targetAccuracy) + Math.log10(1 - accuracy)
}

function chipLines(
  rules: ClanWarStrikeRulesResponse,
  preview: ClanWarStrikePreviewResponse,
  closeness: number,
  ratio: number,
  accuracies: string,
): StrikeLine[] {
  return [
    { label: 'Chip damage', value: formatDamage(rules.chipDamage) },
    factor('Closeness', closeness, accuracies),
    factor('Skill gap', ratio ** rules.chipSkillExponent, skillDetail(preview, rules.chipSkillExponent)),
    ...lastStandLines(preview),
  ]
}

export function strikeOutcome(
  rules: ClanWarStrikeRulesResponse,
  preview: ClanWarStrikePreviewResponse,
  guard: number,
  score: number,
  maxScore: number,
): StrikeOutcome {
  const target = preview.onMap?.targetScore
  if (target == null) {
    const lines = [
      ...streakLines(rules, preview),
      factor('No score on the map', rules.missingScoreMultiplier, 'they have no score here'),
      ...penaltyLines(preview),
    ]
    const result = finish(lines, noScoreDamage(rules, preview), guard)
    return { kind: 'damage', note: 'No score on this map', ...result }
  }
  if (score > target) {
    const result = finish(hitLines(rules, preview), preview.damage, guard)
    return { kind: 'damage', note: "This score is above the target's score on this map", ...result }
  }
  const gap = accuracyGap(target / maxScore, score / maxScore)
  const note = "This score is below the target's score on this map"
  if (!(gap < rules.chipWindow)) return { kind: 'none', damage: 0, note, lines: [] }
  const closeness = 1 - gap / rules.chipWindow
  const ratio = Math.min(1, preview.attackerSkill / preview.victimSkill)
  const accuracies = `your ${formatAccuracy(score / maxScore)} vs their ${formatAccuracy(target / maxScore)}`
  const lines = chipLines(rules, preview, closeness, ratio, accuracies)
  const result = finish(lines, rules.chipDamage * closeness * ratio ** rules.chipSkillExponent * preview.lastStand, guard)
  return { kind: 'chip', note, ...result }
}
