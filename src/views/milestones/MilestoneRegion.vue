<script setup lang="ts">
import {
  CARD_HEAD_UNITS,
  MILESTONE_UNIT,
  PIP_COLUMNS,
  PIP_GAP_UNITS,
  PIP_SIZE_UNITS,
  type MilestoneRegion,
} from '@/utils/milestoneLayout'
import { computed } from 'vue'

const props = defineProps<{ region: MilestoneRegion; loggedIn?: boolean }>()

const NOTCH = MILESTONE_UNIT * 7
const PIP = MILESTONE_UNIT * PIP_SIZE_UNITS
const PIP_GAP = MILESTONE_UNIT * PIP_GAP_UNITS

const outline = computed(() => {
  const { x, y, width, height } = props.region.rect
  return [
    `M${(x + NOTCH).toFixed(1)} ${y.toFixed(1)}`,
    `H${(x + width).toFixed(1)}`,
    `V${(y + height).toFixed(1)}`,
    `H${x.toFixed(1)}`,
    `V${(y + NOTCH).toFixed(1)}`,
    'Z',
  ].join(' ')
})

const titleX = computed(() => props.region.rect.x + NOTCH)

const titleY = computed(
  () => props.region.rect.y + props.region.headerY + MILESTONE_UNIT * 4.6,
)

const metaY = computed(() => titleY.value + MILESTONE_UNIT * 9.4)

const bonusY = computed(() => metaY.value + MILESTONE_UNIT * 6.4)

const rule = computed(() => {
  const { x, width } = props.region.rect
  const top = (props.region.set.setBonusXp > 0 ? bonusY.value : metaY.value) + MILESTONE_UNIT * 4.6
  return `M${(x + NOTCH).toFixed(1)} ${top.toFixed(1)}H${(x + width - NOTCH * 0.6).toFixed(1)}`
})

const meta = computed(() =>
  props.loggedIn
    ? `${props.region.completed} / ${props.region.total} complete`
    : `${props.region.total} milestones`,
)

const bonus = computed(() =>
  props.region.set.setBonusXp > 0 ? `+${props.region.set.setBonusXp} XP set bonus` : null,
)

const pips = computed(() =>
  props.region.pips.map((pip, i) => ({
    key: i,
    tier: pip.tier,
    completed: pip.completed,
    x: titleX.value + (i % PIP_COLUMNS) * (PIP + PIP_GAP),
    y:
      props.region.rect.y +
      CARD_HEAD_UNITS * MILESTONE_UNIT +
      Math.floor(i / PIP_COLUMNS) * (PIP + PIP_GAP),
  })),
)
</script>

<template>
  <g class="ms-region" :class="{ 'ms-region--collapsed': region.collapsed }">
    <path class="ms-region__outline" :d="outline" />
    <path class="ms-region__rule" :d="rule" />
    <text class="ms-region__title" :x="titleX" :y="titleY">{{ region.set.title }}</text>
    <text class="ms-region__meta" :x="titleX" :y="metaY">{{ meta }}</text>
    <text v-if="bonus" class="ms-region__bonus" :x="titleX" :y="bonusY">{{ bonus }}</text>

    <rect
      v-for="pip in pips"
      :key="pip.key"
      class="ms-region__pip"
      :class="{ 'ms-region__pip--done': pip.completed }"
      :style="{ '--ms-tier': `var(--tier-${pip.tier})` }"
      :x="pip.x"
      :y="pip.y"
      :width="PIP"
      :height="PIP"
      rx="1.5"
    />
  </g>
</template>

<style scoped>
.ms-region {
  pointer-events: none;
}

.ms-region__outline {
  fill: var(--bg-base);
  stroke: var(--text-tertiary);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.ms-region__rule {
  fill: none;
  stroke: var(--bg-overlay);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.ms-region__title {
  fill: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.ms-region__meta {
  fill: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 17px;
  letter-spacing: 0.04em;
}

.ms-region__bonus {
  fill: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 16px;
  letter-spacing: 0.04em;
}

.ms-region__pip {
  fill: none;
  stroke: color-mix(in srgb, var(--ms-tier) 45%, var(--bg-overlay));
  stroke-width: 1.5;
}

.ms-region__pip--done {
  fill: var(--ms-tier);
  stroke: var(--ms-tier);
}

.ms-region--collapsed {
  cursor: pointer;
  pointer-events: auto;
}

.ms-region--collapsed .ms-region__outline {
  fill: var(--bg-surface);
}

.ms-region--collapsed:hover .ms-region__outline {
  stroke: var(--text-tertiary);
}

.ms-region--collapsed .ms-region__title {
  font-size: 23px;
}
</style>
