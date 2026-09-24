<script setup lang="ts">
import { anchorCrack, bitePath, crackPath, wearBites, wearCracks, type WearSpec } from '@/utils/cosmetics/wear'
import { computed, onMounted, onUnmounted, ref, useId, useTemplateRef } from 'vue'

const props = withDefaults(
  defineProps<{
    spec: WearSpec | null
    seed: string
    fill?: boolean
  }>(),
  { fill: true },
)

const FILL_WEAR = { band: 0, crack: 1, bite: 1, reach: 1 }
const INTRINSIC_WEAR = { band: 0.22, crack: 3, bite: 2, reach: 2.2 }

const maskId = `worn-${useId()}`

const baseEl = useTemplateRef<HTMLElement>('base')
const size = ref({ w: 0, h: 0, px: 0, py: 0 })
let ro: ResizeObserver | null = null

onMounted(() => {
  if (!baseEl.value || typeof ResizeObserver === 'undefined') return
  ro = new ResizeObserver(([entry]) => {
    if (!entry) return
    const r = entry.contentRect
    size.value = { w: r.width, h: r.height, px: r.left, py: r.top }
  })
  ro.observe(baseEl.value)
})

onUnmounted(() => {
  ro?.disconnect()
  ro = null
})

const bites = computed(() => (props.spec ? wearBites(props.seed, props.spec.chips) : []))
const cracks = computed(() => (props.spec ? wearCracks(props.seed, bites.value, props.spec.cracks) : []))
const flakes = computed(() => (props.spec?.flakes ? bites.value.slice(0, 2) : []))

const measured = computed(() => size.value.w > 0 && size.value.h > 0)

const wearTuning = computed(() => (props.fill ? FILL_WEAR : INTRINSIC_WEAR))

const maskPaths = computed(() => {
  if (!measured.value) return []
  const t = wearTuning.value
  const w = size.value.w
  const h = size.value.h * (1 - 2 * t.band)
  const unit = Math.min(w, h)
  return [
    ...bites.value.map((b) => bitePath(b, w, h, t.bite)),
    ...cracks.value.map((c) => crackPath(anchorCrack(c, w, h, t.reach), 1, 1, Math.max(1, unit * c.width * t.crack))),
  ]
})

const maskTransform = computed(() => {
  const { w, h, px, py } = size.value
  const band = h * wearTuning.value.band
  return `scale(${1 / (w + 2 * px)} ${1 / (h + 2 * py)}) translate(${px} ${py + band})`
})

const maskStyle = computed(() =>
  props.spec && measured.value ? { mask: `url(#${maskId})`, WebkitMask: `url(#${maskId})` } : undefined,
)
</script>

<template>
  <span class="worn-content" :class="{ 'worn-content--intrinsic': !fill }">
    <svg v-if="spec && measured" class="worn-content__defs" aria-hidden="true">
      <defs>
        <mask :id="maskId" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1">
          <rect x="0" y="0" width="1" height="1" fill="white" />
          <g :transform="maskTransform">
            <path v-for="(d, i) in maskPaths" :key="i" :d="d" fill="black" />
          </g>
        </mask>
      </defs>
    </svg>
    <span ref="base" class="worn-content__base" :style="maskStyle">
      <slot />
    </span>
    <span
      v-for="(b, i) in flakes"
      :key="`f${i}`"
      class="worn-content__flake"
      :style="{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, animationDelay: `${i * 7.3}s`, background: spec?.dark }"
      aria-hidden="true"
    />
  </span>
</template>

<style scoped>
.worn-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.worn-content--intrinsic {
  display: inline-flex;
  width: auto;
  height: auto;
  vertical-align: middle;
}

.worn-content__defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.worn-content__base {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.worn-content--intrinsic .worn-content__base {
  display: inline-flex;
  width: auto;
  height: auto;
  padding: 2em;
  margin: -2em;
}

.worn-content__flake {
  position: absolute;
  width: 3px;
  height: 2px;
  opacity: 0;
  pointer-events: none;
  animation: worn-flake 16s linear infinite;
}

@keyframes worn-flake {
  0%,
  93% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg);
  }
  94% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(4px, 26px) rotate(140deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .worn-content__flake {
    animation: none;
  }
}
</style>
