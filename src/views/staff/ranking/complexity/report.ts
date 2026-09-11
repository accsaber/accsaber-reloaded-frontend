import type {
  ComparisonScenario,
  ComplexityDifficultyRow,
  ComplexityPlayerBoard,
  ScenarioLadderValues,
} from '@/types/api/complexity'
import { AP_DECIMALS, CX_DECIMALS } from '@/utils/complexity'
import { formatCount, formatFixed, formatSigned } from '@/utils/formatters'

export interface ComplexityReportInput {
  title: string
  scope: string[]
  scenarioLabel: string
  scenario: ComparisonScenario
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
  return formatFixed(value, CX_DECIMALS)
}

function ap(value: number | null | undefined): string {
  return formatFixed(value, AP_DECIMALS)
}

function row(cells: (string | number)[]): string {
  return `| ${cells.join(' | ')} |`
}

function header(cells: string[]): string[] {
  return [row(cells), row(cells.map(() => '---'))]
}

function ladderTable(input: ComplexityReportInput): string[] {
  const now = input.board?.ladders.CURRENT
  const next = input.board?.ladders[input.scenario]
  if (!now || !next) return []
  const lines = header(['Ladder', 'Now', input.scenarioLabel, 'Change'])
  for (const metric of LADDER_ROWS) {
    lines.push(row([
      metric.label,
      formatFixed(now[metric.key], metric.decimals),
      formatFixed(next[metric.key], metric.decimals),
      formatSigned(next[metric.key] - now[metric.key], metric.decimals),
    ]))
  }
  return lines
}

function mapTable(input: ComplexityReportInput): string[] {
  const { maps, scenario, scenarioLabel } = input
  if (!maps.length) return []
  const after = scenarioLabel.toLowerCase()
  const lines = header([
    'Song',
    'Mapper',
    'Category',
    'CX now',
    `CX ${after}`,
    'Δ CX',
    'Top AP now',
    `Top AP ${after}`,
    'Δ top AP',
    'Avg wgt now',
    `Avg wgt ${after}`,
    'Δ avg wgt',
    'Scores',
  ])
  for (const map of maps) {
    const current = map.scenarios.CURRENT
    const next = map.scenarios[scenario]
    const delta = map.deltas[scenario]
    lines.push(row([
      `${map.songName}${map.songSubName ? ` ${map.songSubName}` : ''}`,
      map.mapAuthor,
      map.categoryCode,
      cx(current?.complexity),
      cx(next?.complexity),
      formatSigned(delta?.complexity, CX_DECIMALS),
      ap(current?.topAp),
      ap(next?.topAp),
      formatSigned(delta?.topAp, AP_DECIMALS),
      ap(current?.averageWeightedAp),
      ap(next?.averageWeightedAp),
      formatSigned(delta?.averageWeightedAp, AP_DECIMALS),
      formatCount(map.scores),
    ]))
  }
  return lines
}

function playerTable(input: ComplexityReportInput): string[] {
  const rows = input.board?.rows ?? []
  if (!rows.length) return []
  const lines = header([
    'Rank now',
    'Player',
    'Country',
    'AP now',
    `AP ${input.scenarioLabel.toLowerCase()}`,
    'Δ AP',
    'Rank after',
    'Δ rank (+ is down)',
  ])
  for (const player of rows) {
    const current = player.scenarios.CURRENT
    const next = player.scenarios[input.scenario]
    const delta = player.deltas[input.scenario]
    lines.push(row([
      current?.rank != null ? `#${current.rank}` : '-',
      player.name,
      player.country,
      ap(current?.ap),
      ap(next?.ap),
      formatSigned(delta?.ap, AP_DECIMALS),
      next?.rank != null ? `#${next.rank}` : '-',
      formatSigned(delta?.rank, 0),
    ]))
  }
  return lines
}

export function buildComplexityReport(input: ComplexityReportInput): string {
  const sections: string[][] = [
    [`# ${input.title}`, '', ...input.scope.map((line) => `- ${line}`)],
  ]

  const ladder = ladderTable(input)
  if (ladder.length) sections.push(['## Ladder', '', ...ladder])

  const maps = mapTable(input)
  if (maps.length) {
    sections.push([`## Maps (${formatCount(input.maps.length)})`, '', ...maps])
  }

  const players = playerTable(input)
  if (players.length) {
    sections.push([
      `## Players (${formatCount(input.board?.rows.length ?? 0)})`,
      '',
      ...players,
    ])
  }

  return `${sections.map((section) => section.join('\n')).join('\n\n')}\n`
}
