<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'

const OUTPUT_PX = 512
const MAX_ZOOM = 4

const props = defineProps<{
  file: File | null
}>()

const emit = defineEmits<{
  confirm: [file: File]
  close: []
}>()

const stage = useTemplateRef<HTMLDivElement>('stage')
const image = ref<HTMLImageElement | null>(null)
const sourceUrl = ref<string | null>(null)
const zoom = ref(1)
const offset = ref({ x: 0, y: 0 })
const failed = ref(false)
let drag: { pointerId: number; x: number; y: number } | null = null

function stageSize(): number {
  return stage.value?.clientWidth ?? 0
}

function scale(): number {
  const img = image.value
  if (!img) return 1
  return (stageSize() / Math.min(img.naturalWidth, img.naturalHeight)) * zoom.value
}

function clamp(next: { x: number; y: number }) {
  const img = image.value
  if (!img) return next
  const limitX = Math.max(0, (img.naturalWidth * scale() - stageSize()) / 2)
  const limitY = Math.max(0, (img.naturalHeight * scale() - stageSize()) / 2)
  return {
    x: Math.min(limitX, Math.max(-limitX, next.x)),
    y: Math.min(limitY, Math.max(-limitY, next.y)),
  }
}

const imageStyle = computed(() => {
  const img = image.value
  if (!img) return undefined
  return {
    width: `${img.naturalWidth * scale()}px`,
    height: `${img.naturalHeight * scale()}px`,
    transform: `translate(calc(-50% + ${offset.value.x}px), calc(-50% + ${offset.value.y}px))`,
  }
})

function release() {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  sourceUrl.value = null
  image.value = null
}

watch(
  () => props.file,
  (file) => {
    release()
    failed.value = false
    zoom.value = 1
    offset.value = { x: 0, y: 0 }
    if (!file) return
    const url = URL.createObjectURL(file)
    sourceUrl.value = url
    const img = new Image()
    img.onload = () => {
      if (sourceUrl.value === url) image.value = img
    }
    img.onerror = () => {
      failed.value = true
    }
    img.src = url
  },
  { immediate: true },
)

watch(zoom, () => {
  offset.value = clamp(offset.value)
})

function onPointerDown(e: PointerEvent) {
  drag = { pointerId: e.pointerId, x: e.clientX, y: e.clientY }
  stage.value?.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!drag || drag.pointerId !== e.pointerId) return
  offset.value = clamp({ x: offset.value.x + e.clientX - drag.x, y: offset.value.y + e.clientY - drag.y })
  drag = { pointerId: e.pointerId, x: e.clientX, y: e.clientY }
}

function onPointerUp() {
  drag = null
}

function onWheel(e: WheelEvent) {
  zoom.value = Math.min(MAX_ZOOM, Math.max(1, zoom.value - e.deltaY * 0.002))
}

function confirm() {
  const img = image.value
  const size = stageSize()
  if (!img || !props.file || size === 0) return
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_PX
  canvas.height = OUTPUT_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const ratio = OUTPUT_PX / size
  const width = img.naturalWidth * scale() * ratio
  const height = img.naturalHeight * scale() * ratio
  ctx.drawImage(
    img,
    OUTPUT_PX / 2 + offset.value.x * ratio - width / 2,
    OUTPUT_PX / 2 + offset.value.y * ratio - height / 2,
    width,
    height,
  )
  const name = props.file.name.replace(/\.[^.]+$/, '') + '.png'
  canvas.toBlob((blob) => {
    if (blob) emit('confirm', new File([blob], name, { type: 'image/png' }))
  }, 'image/png')
}

onUnmounted(release)
</script>

<template>
  <BaseModal :open="file !== null" title="Crop image" max-width="400px" @close="emit('close')">
    <div class="crop">
      <div
        ref="stage"
        class="crop__stage"
        @pointerdown.prevent="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel.prevent="onWheel"
      >
        <img v-if="image && sourceUrl" class="crop__image" :src="sourceUrl" :style="imageStyle" alt="" draggable="false" />
        <p v-else-if="failed" class="crop__failed">That image could not be read.</p>
      </div>
      <input
        v-model.number="zoom"
        class="crop__zoom"
        type="range"
        min="1"
        :max="MAX_ZOOM"
        step="0.01"
        aria-label="Zoom"
        :disabled="!image"
      />
    </div>

    <template #footer>
      <BaseButton @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="primary" :disabled="!image" @click="confirm">Use image</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.crop {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.crop__stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-avatar);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.crop__stage:active {
  cursor: grabbing;
}

.crop__image {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}

.crop__failed {
  margin: 0;
  padding: var(--space-lg);
  font-size: var(--text-caption);
  text-align: center;
  color: var(--error);
}

.crop__zoom {
  width: 100%;
  accent-color: var(--page-accent, var(--accent));
}
</style>
