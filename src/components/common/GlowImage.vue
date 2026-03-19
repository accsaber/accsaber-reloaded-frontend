<script setup lang="ts">
withDefaults(defineProps<{
  src: string
  alt?: string
  size?: number
}>(), {
  alt: '',
  size: 36,
})
</script>

<template>
  <div class="glow-image" :style="{ width: `${size}px`, height: `${size}px` }">
    <img class="glow-image__img" :src="src" :alt="alt" loading="lazy" />
    <div class="glow-image__glow" :style="{ backgroundImage: `url(${src})` }" />
  </div>
</template>

<style scoped>
.glow-image {
  position: relative;
  flex-shrink: 0;
}

.glow-image__img {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-btn);
  object-fit: cover;
  position: relative;
  z-index: 1;
}

.glow-image__glow {
  position: absolute;
  inset: -4px;
  border-radius: var(--radius-card);
  background-size: cover;
  background-position: center;
  filter: blur(10px) saturate(1.8);
  opacity: 0.35;
  z-index: 0;
  pointer-events: none;
}
</style>
