<script setup lang="ts">
import { TITLE_AURA_PAD } from '@/utils/cosmetics/titleAura'

const hostStyle = {
  left: `${-TITLE_AURA_PAD.x}em`,
  top: `${-TITLE_AURA_PAD.top}em`,
  width: `calc(100% + ${TITLE_AURA_PAD.x * 2}em)`,
  height: `calc(100% + ${TITLE_AURA_PAD.top + TITLE_AURA_PAD.bottom}em)`,
}
</script>

<template>
  <span class="title-layer-host" :style="hostStyle" aria-hidden="true">
    <slot />
  </span>
</template>

<style scoped>
.title-layer-host {
  position: absolute;
  display: block;
  pointer-events: none;
  z-index: 0;
}

.title-layer-host :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
}
</style>
