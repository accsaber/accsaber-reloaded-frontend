<script setup lang="ts">
import { onImageError, pickCoverFallback, pickCoverUrl, type CoverSource } from '@/utils/media'
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  source?: CoverSource | null
  src?: string
  alt?: string
  size?: number
  fallbackSrc?: string | null
  hideOnError?: boolean
}>(), {
  source: null,
  src: '',
  alt: '',
  size: 36,
  fallbackSrc: null,
  hideOnError: false,
})

const resolvedSrc = computed(() => props.source ? pickCoverUrl(props.source) : props.src)
const resolvedFallback = computed(() => props.source ? pickCoverFallback(props.source) : props.fallbackSrc)

const broken = ref(false)

const handleError = (e: Event) => {
  onImageError(resolvedFallback.value)(e)
  const img = e.currentTarget as HTMLImageElement
  if (props.hideOnError && img.dataset.fellBack !== '1') broken.value = true
}

watch(resolvedSrc, () => { broken.value = false })
</script>

<template>
  <div v-if="!broken" class="cover-image" :style="{ width: `${size}px`, height: `${size}px` }">
    <img class="cover-image__img" :src="resolvedSrc" :alt="alt" loading="lazy" decoding="async"
      @error="handleError" />
  </div>
</template>
<style scoped>
.cover-image {
  position: relative;
  flex-shrink: 0;
}

.cover-image__img {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-btn);
  object-fit: cover;
}
</style>
