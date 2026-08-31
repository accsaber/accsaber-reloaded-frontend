<script setup lang="ts">
import type { MilestoneNode } from '@/utils/milestoneLayout'
import { glyphSymbolId } from '@/utils/milestoneIcons'
import { frameFor, frameSymbolId, markSymbolId, resolveFrameTier } from '@/utils/milestoneTiers'
import { computed } from 'vue'

const props = defineProps<{ node: MilestoneNode; accent?: string }>()

const tier = computed(() => resolveFrameTier(props.node.milestone.tier))

const frameHref = computed(() => `#${frameSymbolId(tier.value)}`)

const glyphHref = computed(() =>
  props.node.state === 'locked'
    ? `#${markSymbolId('lock')}`
    : `#${glyphSymbolId(props.node.milestone.glyph, tier.value)}`,
)

const glyphDy = computed(() => ((frameFor(tier.value).glyphDy ?? 0) / 50) * props.node.radius)

const progressPercent = computed(() =>
  Math.max(0, Math.min(100, (props.node.milestone.normalizedProgress ?? 0) * 100)),
)

const progressBar = computed(() => {
  const width = props.node.radius * 1.2
  return {
    x: -width / 2,
    y: props.node.radius * 1.24,
    width,
    fill: (width * progressPercent.value) / 100,
  }
})

const rewardBadge = computed(() => {
  const size = props.node.radius * 0.42
  const at = props.node.radius * 0.9
  return { x: at - size / 2, y: -at - size / 2, size }
})

const categoryDot = computed(() => {
  if (!props.accent) return null
  const at = props.node.radius * 0.9
  return { cx: -at, cy: at, r: props.node.radius * 0.14 }
})

const ariaLabel = computed(() => {
  const m = props.node.milestone
  const state =
    props.node.state === 'completed'
      ? 'completed'
      : props.node.state === 'locked'
        ? 'locked'
        : props.node.state === 'progress'
          ? `${Math.round(progressPercent.value)} percent complete`
          : 'not started'
  return `${m.title}, ${m.tier} tier, ${state}`
})
</script>

<template>
  <g
    class="ms-node ms-surface"
    :class="`ms-node--${node.state}`"
    :style="{ '--ms-tier': `var(--tier-${tier})`, '--ms-cat': accent }"
    :transform="`translate(${node.cx.toFixed(1)} ${node.cy.toFixed(1)})`"
    data-node
    :data-id="node.id"
    :aria-label="ariaLabel"
  >
    <circle class="ms-node__hit" :r="node.radius * 1.1" />

    <use
      class="ms-node__frame"
      :href="frameHref"
      :x="-node.radius"
      :y="-node.radius"
      :width="node.radius * 2"
      :height="node.radius * 2"
    />

    <use
      class="ms-node__glyph"
      :href="glyphHref"
      :x="-node.glyphSize / 2"
      :y="-node.glyphSize / 2 + glyphDy"
      :width="node.glyphSize"
      :height="node.glyphSize"
    />

    <use
      v-if="node.hasReward"
      class="ms-node__reward"
      :href="`#${markSymbolId('reward')}`"
      :x="rewardBadge.x"
      :y="rewardBadge.y"
      :width="rewardBadge.size"
      :height="rewardBadge.size"
    />

    <circle
      v-if="categoryDot"
      class="ms-node__category"
      :cx="categoryDot.cx"
      :cy="categoryDot.cy"
      :r="categoryDot.r"
    />

    <template v-if="node.state === 'progress'">
      <rect
        class="ms-node__track"
        :x="progressBar.x"
        :y="progressBar.y"
        :width="progressBar.width"
        height="3"
        rx="1.5"
      />
      <rect
        class="ms-node__progress"
        :x="progressBar.x"
        :y="progressBar.y"
        :width="progressBar.fill"
        height="3"
        rx="1.5"
      />
    </template>
  </g>
</template>

<style scoped>
.ms-node {
  --ms-plate: var(--bg-surface);
  --ms-rim: var(--ms-rim-idle);
  --ms-ink: var(--ms-ink-idle);
  cursor: pointer;
}

.ms-node__hit {
  fill: transparent;
}

.ms-node__frame {
  color: var(--ms-rim);
}

.ms-node__glyph {
  color: var(--ms-ink);
  pointer-events: none;
}

.ms-node__track {
  fill: var(--bg-overlay);
  pointer-events: none;
}

.ms-node__progress {
  fill: var(--ms-tier);
  pointer-events: none;
}

.ms-node__reward {
  color: var(--tier-gold);
  pointer-events: none;
}

.ms-node__category {
  fill: var(--ms-cat);
  pointer-events: none;
}

.ms-node--locked {
  --ms-plate: var(--bg-base);
  --ms-rim: var(--bg-overlay);
  --ms-ink: var(--text-tertiary);
}

.ms-node--progress {
  --ms-rim: var(--ms-rim-progress);
  --ms-ink: var(--ms-ink-progress);
}

.ms-node--completed {
  --ms-plate: var(--ms-plate-done);
  --ms-rim: var(--ms-rim-done);
  --ms-ink: var(--ms-ink-done);
}

.ms-node:hover {
  --ms-rim: var(--ms-tier);
  --ms-ink: var(--text-primary);
}

.ms-node--completed:hover {
  --ms-ink: var(--ms-tier);
}

.ms-node:focus {
  outline: none;
}
</style>
