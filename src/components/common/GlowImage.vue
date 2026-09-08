<script setup lang="ts">
import { onAvatarError } from '@/composables/useAvatarFallback'
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  src: string
  alt?: string
  size?: number
  fallbackSrc?: string | null
  hideOnError?: boolean
}>(), {
  alt: '',
  size: 36,
  fallbackSrc: null,
  hideOnError: false,
})

const broken = ref(false)

const handleError = (e: Event) => {
  onAvatarError(props.fallbackSrc)(e)
  const img = e.currentTarget as HTMLImageElement
  if (props.hideOnError && img.dataset.fellBack !== '1') broken.value = true
}

watch(() => props.src, () => { broken.value = false })
</script>

<template>
  <div v-if="!broken" class="glow-image" :style="{ width: `${size}px`, height: `${size}px` }">
    <img class="glow-image__img" :src="src" :alt="alt" loading="lazy" decoding="async"
      @error="handleError" />
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
}
</style>
