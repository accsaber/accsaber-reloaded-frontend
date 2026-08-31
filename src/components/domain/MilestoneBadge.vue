<script setup lang="ts">
import MilestoneFrameArt from '@/components/domain/MilestoneFrameArt.vue'
import MilestoneGlyphArt from '@/components/domain/MilestoneGlyphArt.vue'
import { renderGlyph, type MilestoneGlyphKey } from '@/utils/milestoneIcons'
import { frameFor, resolveFrameTier } from '@/utils/milestoneTiers'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    glyph: MilestoneGlyphKey
    tier: string
    size?: number
    completed?: boolean
    dim?: boolean
  }>(),
  { size: 40 },
)

const tier = computed(() => resolveFrameTier(props.tier))

const frame = computed(() => frameFor(tier.value))

const parts = computed(() => renderGlyph(props.glyph, tier.value))

const glyphTransform = computed(() => {
  const box = 100 * frame.value.glyphScale
  const offset = (100 - box) / 2
  const offsetY = offset + (frame.value.glyphDy ?? 0)
  return `translate(${offset.toFixed(2)} ${offsetY.toFixed(2)}) scale(${(box / 24).toFixed(4)})`
})
</script>

<template>
  <svg
    class="ms-badge ms-surface"
    :class="{ 'ms-badge--completed': completed, 'ms-badge--dim': dim }"
    :style="{ '--ms-tier': `var(--tier-${tier})`, width: `${size}px`, height: `${size}px` }"
    viewBox="0 0 100 100"
    aria-hidden="true"
  >
    <MilestoneFrameArt :frame="frame" />
    <g class="ms-badge__glyph" :transform="glyphTransform">
      <MilestoneGlyphArt :parts="parts" />
    </g>
  </svg>
</template>

<style scoped>
.ms-badge {
  --ms-plate: var(--bg-surface);
  flex-shrink: 0;
  color: var(--ms-rim-idle);
  overflow: visible;
}

.ms-badge__glyph {
  color: var(--ms-ink-idle);
}

.ms-badge--completed {
  --ms-plate: var(--ms-plate-done);
  color: var(--ms-rim-done);
}

.ms-badge--completed .ms-badge__glyph {
  color: var(--ms-ink-done);
}

.ms-badge--dim {
  opacity: 0.5;
}

</style>
