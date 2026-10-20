import type { ClanWarStrikePreviewResponse, ClanWarStrikeRulesResponse } from '@/types/api/clans'
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

interface StrikeOutcome extends StrikeBreakdown {
  kind: StrikeKind
  note: string
}

export const formatDamage = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 })

function factor(label: string, value: number, detail: string): StrikeLine {
  const shown = formatFixed(value, 2)
  return { label, value: `×${shown}`, detail, muted: shown === formatFixed(1, 2) }
}

function skillDetail(preview: ClanWarStrikePreviewResponse, exponent: number): string {
  const power = exponent === 1 ? '' : `, to the power ${formatDamage(exponent)}`
  return `your skill ${formatDamage(preview.attackerSkill)} vs theirs ${formatDamage(preview.victimSkill)}${power}`
}

export function hitDamage(rules: ClanWarStrikeRulesResponse, hitsThisCycle: number, disparity: number): number {
  return rules.baseDamage * rules.escalation ** hitsThisCycle * disparity
}

export function hitsToBreak(
  rules: ClanWarStrikeRulesResponse,
  guard: number,
  hitsThisCycle: number,
  disparity: number,
): number {
  let hits = 0
  for (let left = guard; left > 0; hits++) left -= hitDamage(rules, hitsThisCycle + hits, disparity)
  return hits
}

function hitLines(rules: ClanWarStrikeRulesResponse, preview: ClanWarStrikePreviewResponse): StrikeLine[] {
  return [
    { label: 'Base damage', value: formatDamage(rules.baseDamage) },
    factor('Escalation', rules.escalation ** preview.hitsThisCycle,
      `×${formatDamage(rules.escalation)} per hit this cycle, ${preview.hitsThisCycle} so far`),
    factor('Skill gap', preview.disparity, skillDetail(preview, rules.disparityExponent)),
  ]
}

function finish(lines: StrikeLine[], damage: number, guard: number, used: string | null, suffix = ''): StrikeBreakdown {
  if (used) return { damage: 0, lines: [...lines, { label: used, value: '×0' }, { label: '=', value: formatDamage(0) }] }
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
  return finish(hitLines(rules, preview), preview.damage, guard, null, ` per hit, ${hits}`)
}

function accuracyGap(targetScore: number, score: number, maxScore: number): number {
  if (score === targetScore) return 0
  return -Math.log10(1 - targetScore / maxScore) + Math.log10(1 - score / maxScore)
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
  ]
}

export function strikeOutcome(
  rules: ClanWarStrikeRulesResponse,
  preview: ClanWarStrikePreviewResponse,
  guard: number,
  score: number,
  maxScore: number,
): StrikeOutcome {
  const onMap = preview.onMap
  const target = onMap?.targetScore
  const usedHit = onMap?.hitUsed ? 'Already used on this score' : null
  if (target == null) {
    const lines = [...hitLines(rules, preview), factor('No score on the map', rules.missingScoreMultiplier, 'they have no score here')]
    const result = finish(lines, preview.damage * rules.missingScoreMultiplier, guard, usedHit)
    return { kind: 'damage', note: usedHit ?? 'No score on this map', ...result }
  }
  if (score > target) {
    const result = finish(hitLines(rules, preview), preview.damage, guard, usedHit)
    return { kind: 'damage', note: usedHit ?? "This score is above the target's score on this map", ...result }
  }
  const gap = accuracyGap(target, score, maxScore)
  const note = "This score is below the target's score on this map"
  if (!(gap < rules.chipWindow)) return { kind: 'none', damage: 0, note, lines: [] }
  const closeness = 1 - gap / rules.chipWindow
  const ratio = Math.min(1, preview.attackerSkill / preview.victimSkill)
  const accuracies = `your ${formatAccuracy(score / maxScore)} vs their ${formatAccuracy(target / maxScore)}`
  const usedChip = onMap?.chipUsed ? 'Already used on this score' : null
  const lines = chipLines(rules, preview, closeness, ratio, accuracies)
  const result = finish(lines, rules.chipDamage * closeness * ratio ** rules.chipSkillExponent, guard, usedChip)
  return { kind: 'chip', note: usedChip ?? note, ...result }
}
