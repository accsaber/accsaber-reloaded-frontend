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

type Streak = Pick<ClanWarStrikePreviewResponse, 'hitsThisCycle' | 'chipsThisCycle'>

export function streakFactor(rules: ClanWarStrikeRulesResponse, streak: Streak): number {
  return rules.escalation ** streak.hitsThisCycle * rules.chipEscalation ** streak.chipsThisCycle
}

export function targetValue(fighter: { guard: number; strikePreview: ClanWarStrikePreviewResponse | null }): number {
  const preview = fighter.strikePreview
  if (fighter.guard <= 0 || !preview) return -1
  return preview.standingTaken / Math.max(1, preview.hitsToBreak)
}

export function formatBounty(bounty: number): string | null {
  const change = Math.round((bounty - 1) * 100)
  return change ? `${change > 0 ? '+' : ''}${change}%` : null
}

export function penaltyPercent(penalty: number | null | undefined): number | null {
  return penalty != null && penalty < 1 ? Math.round(penalty * 100) : null
}

export function repeatShare(rules: ClanWarStrikeRulesResponse): number {
  return Math.round(rules.repeatMapShare * 100)
}

export function repeatTitle(rules: ClanWarStrikeRulesResponse): string {
  return `Each earlier hit on this map cuts the streak bonus to ${repeatShare(rules)}% of what it was. New maps get the full streak.`
}

export function isNoScore(preview: ClanWarStrikePreviewResponse): boolean {
  return !!preview.onMap && preview.onMap.targetScore === null
}

const MAX_SHARE = 0.999999

function level(score: number, maxScore: number): number {
  return -Math.log10(1 - Math.min(MAX_SHARE, score / maxScore))
}

export function minHit(targetScore: number, maxScore: number): number | null {
  return targetScore + 1 > maxScore ? null : targetScore + 1
}

export function minChip(rules: ClanWarStrikeRulesResponse, targetScore: number, maxScore: number): number {
  const target = level(targetScore, maxScore)
  const chips = (score: number) => target - level(score, maxScore) < rules.chipWindow
  let score = Math.floor(maxScore * (1 - 10 ** rules.chipWindow * (1 - Math.min(MAX_SHARE, targetScore / maxScore)))) + 1
  if (score <= 0) return 0
  while (score > 1 && chips(score - 1)) score -= 1
  while (score <= targetScore && !chips(score)) score += 1
  return score
}

function closeness(rules: ClanWarStrikeRulesResponse, targetScore: number, score: number, maxScore: number): number {
  return 1 - (level(targetScore, maxScore) - level(score, maxScore)) / rules.chipWindow
}

function skillRatio(preview: ClanWarStrikePreviewResponse): number {
  return Math.min(1, Math.max(1, preview.attackerSkill) / Math.max(1, preview.victimSkill))
}

function streakLines(rules: ClanWarStrikeRulesResponse, preview: ClanWarStrikePreviewResponse): StrikeLine[] {
  const base = { label: 'Base damage', value: formatDamage(rules.baseDamage) }
  const rates = [
    `x${formatRate(rules.escalation)} per map hit (${preview.hitsThisCycle})`,
    `x${formatRate(rules.chipEscalation)} per chip, no-score or repeat hit (${preview.chipsThisCycle})`,
  ]
  return [base, factor('Streak', streakFactor(rules, preview), `since their guard came back: ${rates.join(', ')}`)]
}

function lastStandLines(preview: ClanWarStrikePreviewResponse): StrikeLine[] {
  return preview.lastStand < 1 ? [factor('Last stand', preview.lastStand, 'few of their team are still unbroken')] : []
}

function noScoreLines(rules: ClanWarStrikeRulesResponse, preview: ClanWarStrikePreviewResponse): StrikeLine[] {
  return [
    { label: 'Base damage', value: formatDamage(rules.baseDamage), detail: "they haven't played this map" },
    ...penaltyLines(preview),
  ]
}

function penaltyLines(preview: ClanWarStrikePreviewResponse): StrikeLine[] {
  const penalty = preview.onMap?.mapPenalty ?? 1
  return penalty < 1 ? [factor('Broken here before', penalty, 'this map broke them before')] : []
}

function hitLines(rules: ClanWarStrikeRulesResponse, preview: ClanWarStrikePreviewResponse): StrikeLine[] {
  const repeat = preview.onMap?.repeatMap
    ? [{ label: 'Repeat map', value: 'reduced streak', detail: repeatTitle(rules) }]
    : []
  return [
    ...streakLines(rules, preview),
    ...repeat,
    factor('Skill gap', preview.disparity, skillDetail(preview, rules.disparityExponent)),
    ...penaltyLines(preview),
    ...lastStandLines(preview),
  ]
}

function finish(lines: StrikeLine[], damage: number, guard: number, suffix = ''): StrikeBreakdown {
  const capped = Math.min(damage, guard)
  const cap: StrikeLine[] = damage > guard
    ? [{ label: 'Guard cap', value: formatDamage(guard), detail: 'a hit never takes more than the guard they have left' }]
    : []
  return { damage: capped, lines: [...lines, ...cap, { label: '=', value: `${formatDamage(capped)}${suffix}` }] }
}

function breakLine(preview: ClanWarStrikePreviewResponse): StrikeLine {
  const taken = formatStanding(preview.standingTaken)
  const gained = formatStanding(preview.standingGained)
  return taken === gained
    ? { label: 'Breaking them', value: `${taken} Standing`, detail: 'from their clan to yours' }
    : { label: 'Breaking them', value: `${taken} Standing`, detail: `taken from their clan, yours gets ${gained}` }
}

export function hitBreakdown(
  rules: ClanWarStrikeRulesResponse,
  preview: ClanWarStrikePreviewResponse,
  guard: number,
  bounty: number,
): StrikeLine[] {
  const hits = `${preview.hitsToBreak} ${preview.hitsToBreak === 1 ? 'hit' : 'hits'} to break`
  const lines = isNoScore(preview) ? noScoreLines(rules, preview) : hitLines(rules, preview)
  const change = formatBounty(bounty)
  const bountyLine = { label: 'Bounty', value: change ?? '', detail: 'big hitters are worth more, freshly broken players less' }
  return [...finish(lines, preview.damage, guard, ` per hit, ${hits}`).lines, ...(change ? [bountyLine] : []), breakLine(preview)]
}

export function mapOutcome(
  rules: ClanWarStrikeRulesResponse,
  preview: ClanWarStrikePreviewResponse,
  guard: number,
  map: { targetScore: number | null; targetDamage: number; maxScore: number; mapPenalty?: number; repeatMap?: boolean },
  score: number,
): StrikeOutcome {
  if (map.targetScore === null || score > map.targetScore) {
    const onMap = { targetScore: map.targetScore, repeatMap: !!map.repeatMap, mapPenalty: map.mapPenalty ?? 1 }
    const scoped = { ...preview, onMap }
    const lines = map.targetScore === null ? noScoreLines(rules, scoped) : hitLines(rules, scoped)
    return { kind: 'damage', ...finish(lines, map.targetDamage, guard) }
  }
  return chipOutcome(rules, preview, guard, map.targetScore, score, map.maxScore)
}

function chipOutcome(
  rules: ClanWarStrikeRulesResponse,
  preview: ClanWarStrikePreviewResponse,
  guard: number,
  target: number,
  score: number,
  maxScore: number,
): StrikeOutcome {
  if (score < minChip(rules, target, maxScore)) return { kind: 'none', damage: 0, lines: [] }
  const accuracies = `your ${formatAccuracy(score / maxScore)} vs their ${formatAccuracy(target / maxScore)}`
  const close = closeness(rules, target, score, maxScore)
  const punching = skillRatio(preview) ** rules.chipSkillExponent
  const lines = [
    { label: 'Chip damage', value: formatDamage(rules.chipDamage) },
    factor('Closeness', close, accuracies),
    factor('Skill gap', punching, skillDetail(preview, rules.chipSkillExponent)),
    ...lastStandLines(preview),
  ]
  return { kind: 'chip', ...finish(lines, rules.chipDamage * close * punching * preview.lastStand, guard) }
}
