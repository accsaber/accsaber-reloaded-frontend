<script setup lang="ts">
import type { CampaignBackgroundPlacementInput } from '@/types/api/admin'
import type { CampaignBackgroundPlacement } from '@/types/api/campaigns'
import {
  backgroundReferenceSpan,
  clampBackgroundOffset,
  clampBackgroundSize,
  contentToGrid,
  gridToContent,
  pinnedBackgroundRect,
  suggestBackgroundPlacement,
  type BackgroundFrame,
  type ContentRect,
} from '@/utils/campaignLayout'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  imageUrl: string
  placement: CampaignBackgroundPlacement | null
  frame?: BackgroundFrame | null
  gridLock?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{ commit: [placement: CampaignBackgroundPlacementInput] }>()

const FALLBACK_UNIT = 48

const fallbackFrame = computed<BackgroundFrame>(() => {
  const span = backgroundReferenceSpan(FALLBACK_UNIT) * 1.3
  const height = (span * 9) / 16
  const rect = { x: -span / 2, y: -height / 2, width: span, height }
  return { view: rect, content: rect, unit: FALLBACK_UNIT }
})

const frame = computed<BackgroundFrame>(() => props.frame ?? fallbackFrame.value)

const NEUTRAL: CampaignBackgroundPlacement = { size: 100, x: 0, y: 0 }

const draft = ref<CampaignBackgroundPlacement>({ ...(props.placement ?? NEUTRAL) })

watch(
  () => props.placement,
  (next) => {
    if (next) draft.value = { ...next }
  },
)

const isStatic = computed(() => props.placement != null)

const imageAspect = ref(16 / 9)

const preview = ref<HTMLElement | null>(null)
const boxAspect = ref(16 / 9)
let boxObserver: ResizeObserver | null = null

onMounted(() => {
  const el = preview.value
  if (!el || typeof ResizeObserver === 'undefined') return
  boxObserver = new ResizeObserver(() => {
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      boxAspect.value = el.clientWidth / el.clientHeight
    }
  })
  boxObserver.observe(el)
})

onUnmounted(() => {
  boxObserver?.disconnect()
  boxObserver = null
})

const view = computed<ContentRect>(() => {
  const base = frame.value.view
  const width = Math.max(base.width, base.height * boxAspect.value)
  const height = width / boxAspect.value
  return { x: -width / 2, y: -height / 2, width, height }
})

const imageStyle = computed(() => {
  const box = view.value
  const rect = pinnedBackgroundRect(draft.value, imageAspect.value, frame.value.unit)
  return {
    backgroundImage: `url(${props.imageUrl})`,
    left: `${((rect.x - box.x) / box.width) * 100}%`,
    top: `${((rect.y - box.y) / box.height) * 100}%`,
    width: `${(rect.width / box.width) * 100}%`,
    height: `${(rect.height / box.height) * 100}%`,
  }
})

const coverStyle = computed(() => ({ backgroundImage: `url(${props.imageUrl})` }))

function onProbeLoad(event: Event) {
  const img = event.target as HTMLImageElement
  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    imageAspect.value = img.naturalWidth / img.naturalHeight
  }
}

function setField(field: keyof CampaignBackgroundPlacement, raw: string) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return
  draft.value = {
    ...draft.value,
    [field]: field === 'size' ? clampBackgroundSize(parsed) : clampBackgroundOffset(parsed),
  }
}

function commit() {
  emit('commit', { ...draft.value })
}

function onFieldChange(field: keyof CampaignBackgroundPlacement, event: Event) {
  setField(field, (event.target as HTMLInputElement).value)
  commit()
}

interface DragState {
  pointerX: number
  pointerY: number
  originCx: number
  originCy: number
  width: number
  height: number
}

let drag: DragState | null = null

function onPointerDown(event: PointerEvent) {
  if (!isStatic.value || props.disabled || event.button !== 0) return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const origin = gridToContent(draft.value.x, draft.value.y, frame.value.unit)
  target.setPointerCapture(event.pointerId)
  drag = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    originCx: origin.cx,
    originCy: origin.cy,
    width: rect.width,
    height: rect.height,
  }
}

function onPointerMove(event: PointerEvent) {
  if (!drag || drag.width <= 0 || drag.height <= 0) return
  const box = view.value
  const dx = ((event.clientX - drag.pointerX) / drag.width) * box.width
  const dy = ((event.clientY - drag.pointerY) / drag.height) * box.height
  const { positionX, positionY } = contentToGrid(
    drag.originCx + dx,
    drag.originCy + dy,
    frame.value.unit,
    props.gridLock !== event.altKey,
  )
  draft.value = {
    ...draft.value,
    x: clampBackgroundOffset(positionX),
    y: clampBackgroundOffset(positionY),
  }
}

function onPointerUp(event: PointerEvent) {
  if (!drag) return
  drag = null
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  commit()
}

const fields = computed(() => [
  { key: 'size' as const, label: 'Scale', value: draft.value.size },
  { key: 'x' as const, label: 'Col', value: draft.value.x },
  { key: 'y' as const, label: 'Row', value: draft.value.y },
])

function pin() {
  const suggested = suggestBackgroundPlacement(
    frame.value.content,
    imageAspect.value,
    frame.value.unit,
  )
  draft.value = { ...suggested }
  emit('commit', suggested)
}

function unpin() {
  emit('commit', {})
}
</script>

<template>
  <div class="placer">
    <img class="placer__probe" :src="imageUrl" alt="" aria-hidden="true" @load="onProbeLoad" />

    <div
      ref="preview"
      class="placer__preview"
      :class="{ 'placer__preview--draggable': isStatic && !disabled }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div v-if="isStatic" class="placer__image" :style="imageStyle" />
      <div v-else class="placer__image placer__image--cover" :style="coverStyle" />
      <span v-if="isStatic" class="placer__origin" aria-hidden="true" />
      <span v-if="isStatic && !disabled" class="placer__grab-hint" aria-hidden="true">
        drag to reposition
      </span>
    </div>

    <template v-if="isStatic">
      <label class="placer__scale">
        <span class="placer__label">Scale {{ draft.size }}%</span>
        <input
          type="range"
          min="10"
          max="600"
          step="1"
          :value="Math.min(600, draft.size)"
          :disabled="disabled"
          @input="setField('size', ($event.target as HTMLInputElement).value)"
          @change="commit"
        />
      </label>

      <div class="placer__fields">
        <label v-for="f in fields" :key="f.key" class="placer__field">
          <span class="placer__label">{{ f.label }}</span>
          <input
            type="number"
            :min="f.key === 'size' ? 1 : -1000"
            max="1000"
            step="any"
            :value="f.value"
            :disabled="disabled"
            @change="onFieldChange(f.key, $event)"
          />
        </label>
      </div>

      <p class="placer__hint">
        Pinned to the map, so it stays put while you pan and while nodes move. Col and row are the
        same grid cells nodes sit on, decimals included. 100% scale spans 20 columns.
      </p>
      <button type="button" class="placer__action" :disabled="disabled" @click="unpin">
        Unpin, fill the canvas again
      </button>
    </template>

    <template v-else>
      <p class="placer__hint">
        Fills the canvas and follows the view as you pan. Pin it to lock it to the map instead.
      </p>
      <button type="button" class="placer__action" :disabled="disabled" @click="pin">
        Pin placement
      </button>
    </template>
  </div>
</template>

<style scoped>
.placer {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.placer__probe {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.placer__preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 240px;
  background-color: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: 3px;
  overflow: hidden;
  touch-action: none;
}

.placer__origin {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 9px;
  height: 9px;
  transform: translate(-50%, -50%);
  background:
    linear-gradient(var(--text-tertiary), var(--text-tertiary)) center / 1px 100% no-repeat,
    linear-gradient(var(--text-tertiary), var(--text-tertiary)) center / 100% 1px no-repeat;
  opacity: 0.7;
  pointer-events: none;
}

.placer__image {
  position: absolute;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  pointer-events: none;
}

.placer__image--cover {
  inset: 0;
  background-size: cover;
  background-position: center;
}

.placer__preview--draggable {
  cursor: grab;
}

.placer__preview--draggable:active {
  cursor: grabbing;
}

.placer__grab-hint {
  position: absolute;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  padding: 2px 8px;
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-base) 78%, transparent);
  border-radius: 2px;
  pointer-events: none;
}

.placer__label {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.placer__scale {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.placer__scale input {
  width: 100%;
  padding: 0;
  background: transparent;
  border: none;
  accent-color: var(--page-accent);
}

.placer__fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.placer__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.placer__field input {
  width: 100%;
  min-width: 0;
  padding: 7px 8px;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-primary);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: 3px;
  outline: none;
  transition: border-color 120ms ease;
}

.placer__field input:focus {
  border-color: var(--page-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--page-accent) 20%, transparent);
}

.placer__hint {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  line-height: 1.4;
}

.placer__action {
  align-self: flex-start;
  padding: 7px 12px;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: 3px;
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease;
}

.placer__action:hover:not(:disabled) {
  color: var(--page-accent);
  border-color: var(--page-accent);
}

.placer__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
