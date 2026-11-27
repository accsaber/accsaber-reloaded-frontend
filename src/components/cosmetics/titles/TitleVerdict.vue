<script setup lang="ts">
import TitleRenderer from '@/components/cosmetics/titles/TitleRenderer.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useTimeline } from '@/composables/useTimeline'
import type { TitleValue, TitleVerdictSpec } from '@/types/cosmetics/title'
import { clamp01 } from '@/utils/math'
import { computed, ref, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  value: TitleValue
  verdict: TitleVerdictSpec
}>()

const SPIN_MS = 2600
const TURNS = 4
const TRAVEL_EM = 1.3
const HIDDEN = { visibility: 'hidden' } as const

const result = Math.floor(Math.random() * props.verdict.outcomes.length)
const reduced = useReducedMotion()
const landed = ref(false)
const rootRef = useTemplateRef<HTMLElement>('root')
const { tMs } = useTimeline({ active: () => !landed.value, el: rootRef })

watch(tMs, (t) => {
  if (t >= SPIN_MS) landed.value = true
})

const spinning = computed(() => !landed.value && !reduced.value)

const faces = computed<TitleValue[]>(() =>
  props.verdict.outcomes.map((o) => ({ text: o.text ?? props.value.text, font: props.value.font, states: (o.states ?? props.value.states).map((s) => ({ ...s, glisten: undefined })) })),
)

const outcome = computed<TitleValue>(() => ({ ...props.value, ...props.verdict.outcomes[result], verdict: undefined }))

const reel = computed(() => {
  const n = faces.value.length
  const pos = (TURNS * n + result) * (1 - (1 - clamp01(tMs.value / SPIN_MS)) ** 3)
  const face = Math.round(pos)
  return { face: face % n, offset: pos - face }
})

const faceStyle = computed(() => ({
  transform: `translateY(${(reel.value.offset * TRAVEL_EM).toFixed(3)}em)`,
  opacity: clamp01(1 - Math.abs(reel.value.offset) * 2).toFixed(3),
}))
</script>

<template>
  <span ref="root" class="title-verdict">
    <template v-if="spinning">
      <span v-for="(face, k) in faces" :key="k" class="title-verdict__face" :style="k === reel.face ? faceStyle : HIDDEN">
        <TitleRenderer :value="face" />
      </span>
    </template>
    <TitleRenderer v-else class="title-verdict__result" :value="outcome" />
  </span>
</template>

<style scoped>
.title-verdict {
  display: inline-grid;
}

.title-verdict__face {
  grid-area: 1 / 1;
}

.title-verdict__result {
  animation: verdict-pop var(--dur-enter) var(--ease-out);
}

@keyframes verdict-pop {
  from {
    transform: scale(1.25);
  }
}
</style>
