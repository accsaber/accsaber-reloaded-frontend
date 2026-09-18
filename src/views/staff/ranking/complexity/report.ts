import type {
  ComparisonScenario,
  ComplexityDifficultyRow,
  ComplexityPlayerBoard,
  ScenarioLadderValues,
} from '@/types/api/complexity'
import { AP_DECIMALS, CX_DECIMALS } from '@/utils/complexity'
import { formatCount, formatFixed, formatSigned } from '@/utils/formatters'
import { formatDifficulty } from '@/utils/mappers'

export interface ComplexityReportInput {
  title: string
  scope: string[]
  scenarioLabel: string
  scenario: ComparisonScenario
  categoryName: (code: string) => string
  maps: ComplexityDifficultyRow[]
  board: ComplexityPlayerBoard | null
}

type LadderKey = keyof ScenarioLadderValues

const LADDER_ROWS: { key: LadderKey; label: string; decimals: number }[] = [
  { key: 'playersWith900', label: 'Players holding a 900', decimals: 0 },
  { key: 'playersWith1000', label: 'Players holding a 1000', decimals: 0 },
  { key: 'playersWith1100', label: 'Players holding an 1100', decimals: 0 },
  { key: 'playsWith1000', label: 'Plays at 1000', decimals: 0 },
  { key: 'playsWith1100', label: 'Plays at 1100', decimals: 0 },
  { key: 'topPlayAp', label: 'Top play', decimals: AP_DECIMALS },
  { key: 'totalAp', label: 'Total AP', decimals: AP_DECIMALS },
  { key: 'players', label: 'Ranked players', decimals: 0 },
]

function cx(value: number | null | undefined): string {
  return formatFixed(value, CX_DECIMALS, '-')
}

function ap(value: number | null | undefined): string {
  return formatFixed(value, AP_DECIMALS, '-')
}

function ladderSection(input: ComplexityReportInput): string[] {
  const now = input.board?.ladders.CURRENT
  const next = input.board?.ladders[input.scenario]
  if (!now || !next) return []
  const columns: [string, (key: LadderKey, decimals: number) => string][] = [
    ['Now', (key, decimals) => formatFixed(now[key], decimals)],
    [input.scenarioLabel, (key, decimals) => formatFixed(next[key], decimals)],
    ['Change', (key, decimals) => formatSigned(next[key] - now[key], decimals, '-')],
  ]
  return columns.flatMap(([label, read], index) => [
    ...(index ? [''] : []),
    label,
    ...LADDER_ROWS.map((metric) => `- ${metric.label}: ${read(metric.key, metric.decimals)}`),
  ])
}

function mapLines(input: ComplexityReportInput): string[] {
  return input.maps.map((map) => {
    const song = `${map.songName}${map.songSubName ? ` ${map.songSubName}` : ''}`
    const tags = [
      map.mapAuthor,
      input.categoryName(map.categoryCode),
      formatDifficulty(map.difficulty),
    ].join(', ')
    const now = cx(map.scenarios.CURRENT?.complexity)
    const next = cx(map.scenarios[input.scenario]?.complexity)
    const change = formatSigned(map.deltas[input.scenario]?.complexity, CX_DECIMALS, '-')
    return `- ${map.songAuthor} - ${song} (${tags}): ${now} --> ${next} (${change})`
  })
}

function playerLines(input: ComplexityReportInput): string[] {
  const rows = [...(input.board?.rows ?? [])].sort(
    (a, b) =>
      (a.scenarios[input.scenario]?.rank ?? Infinity) -
      (b.scenarios[input.scenario]?.rank ?? Infinity),
  )
  return rows.map((player) => {
    const current = player.scenarios.CURRENT
    const next = player.scenarios[input.scenario]
    const delta = player.deltas[input.scenario]
    const climbed = delta?.rank != null ? -delta.rank : null
    const rankNow = current?.rank != null ? `#${current.rank}` : '-'
    return (
      `${next?.rank ?? '-'} - ${player.name} (${player.country}): ` +
      `${ap(current?.ap)} --> ${ap(next?.ap)} (${formatSigned(delta?.ap, AP_DECIMALS, '-')}); ` +
      `Rank Now: ${rankNow} (${formatSigned(climbed, 0, '-')})`
    )
  })
}

export function buildComplexityReport(input: ComplexityReportInput): string {
  const sections: string[][] = [[input.title, '', ...input.scope.map((line) => `- ${line}`)]]

  const ladder = ladderSection(input)
  if (ladder.length) sections.push(['STATS', '', ...ladder])

  const maps = mapLines(input)
  if (maps.length) sections.push([`MAPS (${formatCount(maps.length)})`, '', ...maps])

  const players = playerLines(input)
  if (players.length) sections.push([`PLAYERS (${formatCount(players.length)})`, '', ...players])

  return `${sections.map((section) => section.join('\n')).join('\n\n\n')}\n`
}
