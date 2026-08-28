<script setup lang="ts">
import { crackPath, wearBites, wearCracks, type WearSpec } from '@/utils/cosmetics/wear'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    spec: WearSpec | null
    seed: string
    fill?: boolean
  }>(),
  { fill: true },
)

let counter = 0
const maskId = `worn-${++counter}-${Math.random().toString(36).slice(2, 8)}`

const bites = computed(() => (props.spec ? wearBites(props.seed, props.spec.chips) : []))
const cracks = computed(() => (props.spec ? wearCracks(props.seed, bites.value, props.spec.cracks) : []))
const flakes = computed(() => (props.spec?.flakes ? bites.value.slice(0, 2) : []))

const maskStyle = computed(() => (props.spec ? { mask: `url(#${maskId})`, WebkitMask: `url(#${maskId})` } : undefined))
</script>

<template>
  <span class="worn-content" :class="{ 'worn-content--intrinsic': !fill }">
    <svg v-if="spec" class="worn-content__defs" aria-hidden="true">
      <defs>
        <mask :id="maskId" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1">
          <rect x="0" y="0" width="1" height="1" fill="#ffffff" />
          <path v-for="(b, i) in bites" :key="`b${i}`" :d="b.d" fill="#000000" />
          <path
            v-for="(c, i) in cracks"
            :key="`c${i}`"
            :d="crackPath(c)"
            fill="none"
            stroke="#000000"
            :stroke-width="i % 3 === 0 ? 0.016 : 0.01"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </mask>
      </defs>
    </svg>
    <span class="worn-content__base" :style="maskStyle">
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
