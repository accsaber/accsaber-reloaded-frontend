<script setup lang="ts">
import type { HauntSpec } from '@/utils/cosmetics/wear'
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    spec: HauntSpec | null
    fill?: boolean
  }>(),
  { fill: true },
)

const filterId = `haunt-${useId()}`

const style = computed(() => {
  if (!props.spec) return undefined
  return {
    '--haunt-color': props.spec.color,
    '--haunt-tint': `url(#${filterId})`,
    '--haunt-opacity': String(props.spec.opacity),
    '--haunt-cycle': `${props.spec.cycleS}s`,
  }
})
</script>

<template>
  <span class="haunted-content" :class="{ 'haunted-content--intrinsic': !fill, 'haunted-content--on': !!spec }" :style="style">
    <svg v-if="spec" class="haunted-content__defs" aria-hidden="true">
      <filter :id="filterId" color-interpolation-filters="sRGB">
        <feColorMatrix type="saturate" values="0" result="gray" />
        <feFlood :flood-color="spec.color" result="tint" />
        <feBlend in="gray" in2="tint" mode="multiply" result="ghost" />
        <feComposite in="ghost" in2="SourceAlpha" operator="in" />
      </filter>
    </svg>
    <span class="haunted-content__inner">
      <slot />
    </span>
  </span>
</template>

<style scoped>
.haunted-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.haunted-content--intrinsic {
  display: inline-flex;
  width: auto;
  height: auto;
  vertical-align: middle;
}

.haunted-content__defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.haunted-content__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.haunted-content--intrinsic .haunted-content__inner {
  display: inline-flex;
  width: auto;
  height: auto;
}

.haunted-content--on .haunted-content__inner {
  animation: haunt-spectral var(--haunt-cycle, 8s) linear infinite;
}

@keyframes haunt-spectral {
  0%,
  100% {
    opacity: 1;
    filter: none;
  }
  4%,
  33% {
    opacity: var(--haunt-opacity, 0.7);
    filter: var(--haunt-tint) brightness(1.25) drop-shadow(0 0 1px var(--haunt-color));
  }
  37% {
    opacity: 1;
    filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .haunted-content--on .haunted-content__inner {
    animation: none;
  }
}
</style>
