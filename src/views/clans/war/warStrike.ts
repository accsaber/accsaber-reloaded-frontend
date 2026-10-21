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
    factor('Streak', rules.escalation ** preview.hitsThisCycle,
      `×${formatDamage(rules.escalation)} per hit since their guard came back, ${preview.hitsThisCycle} so far`),
    factor('Skill gap', preview.disparity, skillDetail(preview, rules.disparityExponent)),
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
  return finish(hitLines(rules, preview), preview.damage, guard, ` per hit, ${hits}`)
}

export function accuracyGap(targetAccuracy: number, accuracy: number): number {
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
    { label: 'Minimum chip', value: formatDamage(rules.minChipDamage) },
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
  const target = preview.onMap?.targetScore
  if (target == null) {
    const lines = [...hitLines(rules, preview), factor('No score on the map', rules.missingScoreMultiplier, 'they have no score here')]
    const result = finish(lines, preview.damage * rules.missingScoreMultiplier, guard)
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
  const result = finish(lines, Math.max(rules.minChipDamage, rules.chipDamage * closeness * ratio ** rules.chipSkillExponent), guard)
  return { kind: 'chip', note, ...result }
}
