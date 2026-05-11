<script setup lang="ts">
import { useTimeline } from '@/composables/useTimeline'
import type { TitleStateValue, TitleValue } from '@/types/api/items'
import {
  gradientToCss,
  interpolateTitleState,
  isAnimated,
  pickInterpolatedState,
} from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  value: TitleValue
}>()

const needsTimeline = computed(() => isAnimated(props.value))
const { tMs } = useTimeline({ active: () => needsTimeline.value })

const state = computed<TitleStateValue>(() =>
  pickInterpolatedState(
    { states: props.value.states, durationMs: props.value.durationMs, loop: props.value.loop },
    tMs.value,
    interpolateTitleState,
  ),
)

const style = computed(() => {
  const out: Record<string, string> = {}
  if (state.value.gradient) {
    out.background = gradientToCss(state.value.gradient)
    out.webkitBackgroundClip = 'text'
    out.backgroundClip = 'text'
    out.color = 'transparent'
  } else if (state.value.color) {
    out.color = state.value.color
  }
  if (state.value.fontWeight) out.fontWeight = String(state.value.fontWeight)
  if (state.value.fontStyle) out.fontStyle = state.value.fontStyle
  if (state.value.letterSpacingPx != null) out.letterSpacing = `${state.value.letterSpacingPx}px`
  return out
})
</script>

<template>
  <span class="title-renderer" :style="style">{{ value.text }}</span>
</template>

<style scoped>
.title-renderer {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
</style>
