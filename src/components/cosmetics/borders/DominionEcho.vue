<script setup lang="ts">
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useRenderLoop } from '@/composables/useRenderLoop'
import type { DominionFill } from '@/types/cosmetics/border'
import { cyc, win } from '@/utils/cosmetics/canvasShapes'
import { fissionAmt, splitDir } from '@/utils/cosmetics/dominion'
import { onMounted, shallowRef, watch } from 'vue'

interface Ghost {
  dx: number
  dy: number
  color: string
  opacity: number
}

const props = defineProps<{
  fill: DominionFill
  paths: { d: string; transform?: string }[]
  viewBox: string
  unit: number
}>()

const reducedMotion = useReducedMotion()
const ghosts = shallowRef<Ghost[]>([])

function ghostsAt(t: number): Ghost[] {
  const fill = props.fill
  const colors = fill.colors
  const unit = props.unit
  const e = cyc(t, fill.intervalS ?? 5)
  const amt = fissionAmt(e)
  const flash = win(e, 0.92, 1)
  const out: Ghost[] = []
  if (amt > 0.02) {
    for (let i = 0; i < colors.length; i++) {
      const d = splitDir(i, colors.length)
      const wob = Math.sin(t * 3.1 + i * 2.2) * 1.6 * amt
      out.push({ dx: (d[0] * 7 * amt + wob * d[1]) * unit, dy: (d[1] * 7 * amt + wob * d[0]) * unit, color: colors[i], opacity: 0.7 })
    }
  } else if (flash < 0 && colors.length > 1) {
    const tb = win(cyc(t, fill.microS ?? 1.9), 0.72, 0.94)
    if (tb >= 0) {
      const ta = Math.sin(tb * Math.PI)
      out.push(
        { dx: 2.6 * ta * unit, dy: -1.4 * ta * unit, color: colors[0], opacity: 0.6 * ta },
        { dx: -2.6 * ta * unit, dy: 1.4 * ta * unit, color: colors[colors.length - 1], opacity: 0.6 * ta },
      )
    }
  }
  const flashAlpha = flash >= 0 ? Math.sin(flash * Math.PI) : 0
  if (flashAlpha > 0.02) out.push({ dx: 0, dy: 0, color: fill.body ?? '#ffffff', opacity: flashAlpha })
  return out
}

let startedAt = 0

const loop = useRenderLoop(
  (now) => {
    startedAt ||= now
    const next = ghostsAt((now - startedAt) / 1000)
    if (next.length || ghosts.value.length) ghosts.value = next
  },
  () => !reducedMotion.value,
)

onMounted(loop.start)
watch(reducedMotion, (still) => {
  if (still) ghosts.value = []
  else loop.start()
})
</script>

<template>
  <svg
    :viewBox="viewBox"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g
      v-for="(gh, gi) in ghosts"
      :key="gi"
      :transform="`translate(${gh.dx} ${gh.dy})`"
      :opacity="gh.opacity"
    >
      <path
        v-for="(entry, i) in paths"
        :key="i"
        :d="entry.d"
        fill="none"
        :stroke="gh.color"
        stroke-width="1.6"
        stroke-linejoin="round"
        :transform="entry.transform"
      />
    </g>
  </svg>
</template>
