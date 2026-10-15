<script setup lang="ts">
import type { ClanWarResponse, ClanWarTeam, ClanWarTimelinePointResponse } from '@/types/api/clans'
import { formatStanding, OPPOSING_TEAM, WAR_TEAMS, warSideStyles } from '@/utils/clans'
import { computed, ref } from 'vue'
import { clamp } from '@/utils/math'

const props = defineProps<{
  war: ClanWarResponse
  points: ClanWarTimelinePointResponse[]
}>()

const LEFT = 20
const WIDTH = 960
const AXIS = 120
const BAND = 96
const HOUR = 3_600_000
const VIEW_W = LEFT * 2 + WIDTH
const VIEW_H = AXIS * 2

interface Marker {
  x: number
  y: number
  r: number
  point: ClanWarTimelinePointResponse
  team: ClanWarTeam
}

const styles = computed(() => warSideStyles(props.war))
const clans = computed(
  () => new Map(WAR_TEAMS.flatMap((team) => props.war[team].sides.map((s) => [s.clan.id, { clan: s.clan, team }] as const))),
)

function teamOf(point: ClanWarTimelinePointResponse): ClanWarTeam {
  return clans.value.get(point.clanId)?.team ?? 'attack'
}
const start = computed(() => new Date(props.war.startsAt ?? props.war.declaredAt).getTime())
const end = computed(() => {
  const last = props.points.length ? new Date(props.points[props.points.length - 1].at).getTime() : start.value
  const close = props.war.endedAt ? new Date(props.war.endedAt).getTime() : last
  return Math.max(close, last, start.value + HOUR)
})

function x(at: string | number): number {
  const t = typeof at === 'number' ? at : new Date(at).getTime()
  return LEFT + ((t - start.value) / (end.value - start.value)) * WIDTH
}

const markers = computed<Marker[]>(() => {
  const maxDamage = props.points.reduce((max, h) => Math.max(max, h.damage), 1)
  return props.points.map((point) => {
    const team = teamOf(point)
    const r = 3 + 5 * Math.sqrt(point.damage / maxDamage) + (point.breaks > 0 ? 3 : 0)
    return { x: x(point.at), y: team === 'attack' ? AXIS - 4 - r : AXIS + 4 + r, r, point, team }
  })
})

function stakeY(team: ClanWarTeam, left: number): number {
  const stake = props.war[team].stake
  const share = stake > 0 ? Math.max(0, left) / stake : 0
  return team === 'attack' ? AXIS - 10 - share * BAND : AXIS + 10 + share * BAND
}

function stakePath(team: ClanWarTeam): string {
  const { stake, stakeRemaining } = props.war[team]
  const drains = props.points.filter((p) => p.breaks && teamOf(p) === OPPOSING_TEAM[team])
  const moved = drains.reduce((sum, p) => sum + p.standingMoved, 0)
  const scale = moved > 0 ? (stake - stakeRemaining) / moved : 0
  let left = stake
  let path = `M${LEFT},${stakeY(team, left)}`
  for (const point of drains) {
    left -= point.standingMoved * scale
    path += ` H${x(point.at)} V${stakeY(team, left)}`
  }
  return `${path} H${LEFT + WIDTH} V${stakeY(team, stakeRemaining)}`
}

const markerGroups = computed(() =>
  WAR_TEAMS.map((team) => ({ team, markers: markers.value.filter((m) => m.team === team) })),
)

const paths = computed(() =>
  WAR_TEAMS.map((team) => ({
    team,
    d: stakePath(team),
    y: stakeY(team, props.war[team].stakeRemaining),
    label: formatStanding(props.war[team].stakeRemaining),
  })),
)

const hovered = ref<Marker | null>(null)
const tooltipStyle = computed(() =>
  hovered.value
    ? {
        left: `${clamp((hovered.value.x / VIEW_W) * 100, 12, 88)}%`,
        top: `${(hovered.value.y / VIEW_H) * 100}%`,
      }
    : undefined,
)

function stamp(at: string | number): string {
  return new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function tooltipLine(marker: Marker): string {
  const { point } = marker
  const tag = clans.value.get(point.clanId)?.clan.tag ?? props.war[marker.team].lead.tag
  const breaks = point.breaks ? `, ${plural(point.breaks, 'break')}` : ''
  const moved = point.breaks ? `, ${formatStanding(point.standingMoved)} Standing` : ''
  return `${tag} ${plural(point.hits, 'hit')}${breaks}, -${point.damage.toFixed(1)}${moved}`
}

const summary = computed(() =>
  markerGroups.value
    .map(({ team, markers: group }) => {
      const hits = group.reduce((sum, m) => sum + m.point.hits, 0)
      return `${plural(hits, 'hit')} by ${props.war[team].lead.tag}`
    })
    .join(', '),
)
</script>

<template>
  <section class="timeline">
    <h2 class="section-title">Timeline</h2>
    <p v-if="!points.length" class="timeline__empty">No hits yet.</p>
    <div v-else class="timeline__frame">
      <svg class="timeline__chart" :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`" role="img" :aria-label="summary">
        <line :x1="LEFT" :x2="LEFT + WIDTH" :y1="AXIS" :y2="AXIS" class="timeline__axis" />
        <g v-for="path in paths" :key="path.team" class="clan-colors" :style="styles[path.team]">
          <path :d="path.d" class="timeline__stake" />
          <text :x="LEFT + WIDTH" :y="path.y + (path.team === 'attack' ? -6 : 14)" class="timeline__left" text-anchor="end">
            {{ path.label }}
          </text>
        </g>
        <g v-for="group in markerGroups" :key="group.team" class="clan-colors" :style="styles[group.team]">
          <circle
            v-for="(marker, i) in group.markers"
            :key="i"
            :cx="marker.x"
            :cy="marker.y"
            :r="marker.r"
            class="timeline__hit"
            :class="{ 'timeline__hit--break': marker.point.breaks > 0 }"
            @pointerenter="hovered = marker"
            @pointerleave="hovered = null"
          />
        </g>
      </svg>
      <div v-if="hovered" class="timeline__tooltip" :style="tooltipStyle" role="status">
        <span>{{ tooltipLine(hovered) }}</span>
        <span class="timeline__tooltip-time">{{ stamp(hovered.point.at) }}</span>
      </div>
      <div class="timeline__ends">
        <span>{{ stamp(start) }}</span>
        <span>{{ stamp(end) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.timeline__empty {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.timeline__frame {
  position: relative;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.timeline__chart {
  display: block;
  width: 100%;
  height: auto;
}

.timeline__axis {
  stroke: var(--bg-overlay);
  stroke-width: 2;
}

.timeline__stake {
  fill: none;
  stroke: var(--war-side);
  stroke-width: 2;
  opacity: 0.6;
}

.timeline__left {
  font-family: var(--font-mono);
  font-size: 12px;
  fill: var(--war-side);
}

.timeline__hit {
  fill: var(--war-side);
  fill-opacity: 0.45;
  cursor: default;
  transition: fill-opacity 120ms ease-out;
}

.timeline__hit--break {
  fill-opacity: 0.9;
  stroke: var(--text-primary);
  stroke-width: 2;
}

.timeline__hit:hover {
  fill-opacity: 1;
}

.timeline__tooltip {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-caption);
  white-space: nowrap;
  pointer-events: none;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  transform: translate(-50%, calc(-100% - 8px));
}

.timeline__tooltip-time {
  color: var(--text-secondary);
}

.timeline__ends {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

@media (prefers-reduced-motion: reduce) {
  .timeline__hit {
    transition: none;
  }
}
</style>
