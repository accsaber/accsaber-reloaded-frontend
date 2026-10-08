<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    max: number
    size?: 'sm' | 'lg'
    mirror?: boolean
    broken?: boolean
  }>(),
  { size: 'sm' },
)

const scale = computed(() => (props.max <= 0 ? 0 : Math.max(0, Math.min(1, props.value / props.max))))
</script>

<template>
  <span
    class="clan-bar"
    :class="[`clan-bar--${size}`, { 'clan-bar--mirror': mirror, 'clan-bar--broken': broken }]"
    :style="{ '--clan-bar-scale': scale }"
    role="progressbar"
    :aria-valuenow="Math.round(value)"
    aria-valuemin="0"
    :aria-valuemax="Math.round(max)"
  >
    <span class="clan-bar__chip" />
    <span class="clan-bar__fill" />
  </span>
</template>

<style scoped>
.clan-bar {
  position: relative;
  display: block;
  width: 100%;
  height: 6px;
  overflow: hidden;
  background: var(--bg-overlay);
  border-radius: 2px;
}

.clan-bar--lg {
  height: 16px;
  border-radius: 3px;
}

.clan-bar--broken {
  background: color-mix(in srgb, var(--error) 30%, var(--bg-overlay));
}

.clan-bar__fill,
.clan-bar__chip {
  position: absolute;
  inset: 0;
  transform: scaleX(var(--clan-bar-scale));
  transform-origin: left center;
}

.clan-bar--mirror .clan-bar__fill,
.clan-bar--mirror .clan-bar__chip {
  transform-origin: right center;
}

.clan-bar__fill {
  background: var(--clan-bar-fill, var(--clan-accent, var(--page-accent)));
  transition: transform 200ms ease-out;
}

.clan-bar__chip {
  background: var(--text-primary);
  opacity: 0.55;
  transition: transform 500ms ease-in 400ms;
}

@media (prefers-reduced-motion: reduce) {
  .clan-bar__fill,
  .clan-bar__chip {
    transition: none;
  }
}
</style>
