<script setup lang="ts">
import type { ClanWarResponse, ClanWarTimelineHitResponse } from '@/types/api/clans'
import { formatStanding, warSideStyles } from '@/utils/clans'
import { computed, ref } from 'vue'

const props = defineProps<{
  war: ClanWarResponse
  hits: ClanWarTimelineHitResponse[]
}>()

const LEFT = 20
const WIDTH = 960
const AXIS = 120
const BAND = 96
const HOUR = 3_600_000

interface Marker {
  x: number
  y: number
  r: number
  hit: ClanWarTimelineHitResponse
  attacking: boolean
}

const styles = computed(() => warSideStyles(props.war))
const start = computed(() => new Date(props.war.startsAt ?? props.war.declaredAt).getTime())
const end = computed(() => {
  const last = props.hits.length ? new Date(props.hits[props.hits.length - 1].at).getTime() : start.value
  const close = props.war.endedAt ? new Date(props.war.endedAt).getTime() : last
  return Math.max(close, last, start.value + HOUR)
})

function x(at: string | number): number {
  const t = typeof at === 'number' ? at : new Date(at).getTime()
  return LEFT + ((t - start.value) / (end.value - start.value)) * WIDTH
}

const markers = computed<Marker[]>(() => {
  const maxDamage = Math.max(1, ...props.hits.map((h) => h.damage))
  return props.hits.map((hit) => {
    const attacking = hit.clanId === props.war.attacker.clan.id
    const r = 3 + 5 * Math.sqrt(hit.damage / maxDamage) + (hit.broke ? 3 : 0)
    return { x: x(hit.at), y: attacking ? AXIS - 4 - r : AXIS + 4 + r, r, hit, attacking }
  })
})

function stakePath(role: 'attacker' | 'defender'): string {
  const stake = props.war[role].stake
  const enemy = role === 'attacker' ? props.war.defender.clan.id : props.war.attacker.clan.id
  const y = (left: number) => {
    const share = stake > 0 ? Math.max(0, left) / stake : 0
    return role === 'attacker' ? AXIS - 10 - share * BAND : AXIS + 10 + share * BAND
  }
  let left = stake
  let path = `M${LEFT},${y(left)}`
  for (const hit of props.hits) {
    if (!hit.broke || hit.clanId !== enemy) continue
    left -= hit.standingMoved
    path += ` H${x(hit.at)} V${y(left)}`
  }
  return `${path} H${LEFT + WIDTH}`
}

const attackerPath = computed(() => stakePath('attacker'))
const defenderPath = computed(() => stakePath('defender'))

const hovered = ref<Marker | null>(null)
const tooltipStyle = computed(() =>
  hovered.value
    ? {
        left: `${Math.min(88, Math.max(12, (hovered.value.x / 1000) * 100))}%`,
        top: `${(hovered.value.y / 240) * 100}%`,
      }
    : undefined,
)

function stamp(at: string | number): string {
  return new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function tooltipLine(marker: Marker): string {
  const tag = marker.attacking ? props.war.attacker.clan.tag : props.war.defender.clan.tag
  const kind = marker.hit.broke ? 'break' : 'hit'
  const moved = marker.hit.broke ? `, ${formatStanding(marker.hit.standingMoved)} Standing` : ''
  return `${tag} ${kind}, -${marker.hit.damage.toFixed(1)}${moved}`
}

const summary = computed(() => {
  const attacks = markers.value.filter((m) => m.attacking).length
  return `${attacks} hits by ${props.war.attacker.clan.tag}, ${markers.value.length - attacks} by ${props.war.defender.clan.tag}`
})
</script>

<template>
  <section class="timeline">
    <h2 class="timeline__title">Timeline</h2>
    <p v-if="!hits.length" class="timeline__empty">No hits yet.</p>
    <div v-else class="timeline__frame">
      <svg class="timeline__chart" viewBox="0 0 1000 240" role="img" :aria-label="summary">
        <line :x1="LEFT" :x2="LEFT + WIDTH" :y1="AXIS" :y2="AXIS" class="timeline__axis" />
        <g class="clan-colors" :style="styles.attacker">
          <path :d="attackerPath" class="timeline__stake" />
        </g>
        <g class="clan-colors" :style="styles.defender">
          <path :d="defenderPath" class="timeline__stake" />
        </g>
        <g
          v-for="(marker, i) in markers"
          :key="i"
          class="clan-colors"
          :style="marker.attacking ? styles.attacker : styles.defender"
        >
          <circle
            :cx="marker.x"
            :cy="marker.y"
            :r="marker.r"
            class="timeline__hit"
            :class="{ 'timeline__hit--break': marker.hit.broke }"
            @pointerenter="hovered = marker"
            @pointerleave="hovered = null"
          />
        </g>
      </svg>
      <div v-if="hovered" class="timeline__tooltip" :style="tooltipStyle" role="status">
        <span>{{ tooltipLine(hovered) }}</span>
        <span class="timeline__tooltip-time">{{ stamp(hovered.hit.at) }}</span>
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

.timeline__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 700;
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
