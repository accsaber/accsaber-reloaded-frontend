<script setup lang="ts">
import { getCdnLimits, type CdnLimits } from '@/api/cdn'
import { onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  imageUrl: string | null
  label: string
  hint?: string
  aspectRatio?: string
  disabled?: boolean
  uploadHandler: (file: File) => Promise<void>
  removeHandler?: () => Promise<void>
}>(), {
  hint: '',
  aspectRatio: '16 / 9',
  disabled: false,
})

const limits = ref<CdnLimits | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const err = ref<string | null>(null)

onMounted(async () => {
  try {
    limits.value = await getCdnLimits()
  } catch {
    /* limits will validate server-side on upload */
  }
})

function trigger() {
  if (props.disabled || busy.value) return
  fileInput.value?.click()
}

function validate(file: File): string | null {
  if (limits.value) {
    if (file.size > limits.value.maxUploadBytes) {
      const mb = (limits.value.maxUploadBytes / 1_048_576).toFixed(1)
      return `File is too large. Max ${mb} MB.`
    }
    if (!limits.value.allowedMimeTypes.includes(file.type)) {
      return `Unsupported format. Use ${limits.value.allowedMimeTypes
        .map((m) => m.replace('image/', ''))
        .join(', ')}.`
    }
  }
  return null
}

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const issue = validate(file)
  if (issue) {
    err.value = issue
    return
  }
  busy.value = true
  err.value = null
  try {
    await props.uploadHandler(file)
  } catch (e) {
    err.value = (e as Error).message || 'Upload failed.'
  } finally {
    busy.value = false
  }
}

async function onRemove() {
  if (!props.removeHandler || props.disabled || busy.value) return
  busy.value = true
  err.value = null
  try {
    await props.removeHandler()
  } catch (e) {
    err.value = (e as Error).message || 'Failed to remove image.'
  } finally {
    busy.value = false
  }
}

const acceptList = 'image/avif,image/gif,image/jpeg,image/png,image/webp'
</script>

<template>
  <div class="image-uploader" :class="{ 'image-uploader--disabled': disabled }">
    <div class="image-uploader__head">
      <span class="image-uploader__label">{{ label }}</span>
      <small v-if="hint" class="image-uploader__hint">{{ hint }}</small>
    </div>

    <div class="image-uploader__preview" :style="{ aspectRatio }">
      <img v-if="imageUrl" :src="imageUrl" :alt="label" loading="lazy" />
      <div v-else class="image-uploader__empty">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span>No image</span>
      </div>
      <div v-if="busy" class="image-uploader__overlay" aria-hidden="true">
        <div class="image-uploader__spinner" />
      </div>
    </div>

    <div class="image-uploader__actions">
      <button type="button" class="image-uploader__btn" :disabled="disabled || busy"
        @click="trigger">
        {{ imageUrl ? 'Replace' : 'Upload' }}
      </button>
      <button v-if="imageUrl && removeHandler" type="button"
        class="image-uploader__btn image-uploader__btn--destructive"
        :disabled="disabled || busy" @click="onRemove">
        Remove
      </button>
    </div>

    <p v-if="err" class="image-uploader__error" role="alert">{{ err }}</p>

    <input ref="fileInput" type="file" class="image-uploader__file"
      :accept="acceptList" @change="onPick" />
  </div>
</template>

<style scoped>
.image-uploader {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-uploader--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.image-uploader__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.image-uploader__label {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.image-uploader__hint {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  color: var(--text-tertiary);
}

.image-uploader__preview {
  position: relative;
  width: 100%;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: 3px;
  overflow: hidden;
  color: var(--text-tertiary);
}

.image-uploader__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-uploader__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.image-uploader__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--bg-base) 70%, transparent);
}

.image-uploader__spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--bg-overlay);
  border-top-color: var(--page-accent, var(--accent));
  border-radius: 50%;
  animation: image-uploader-spin 800ms linear infinite;
}

@keyframes image-uploader-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .image-uploader__spinner {
    animation: none;
  }
}

.image-uploader__actions {
  display: flex;
  gap: 6px;
}

.image-uploader__btn {
  padding: 6px 12px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-primary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: 3px;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.image-uploader__btn:hover:not(:disabled) {
  border-color: var(--text-tertiary);
}

.image-uploader__btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.image-uploader__btn--destructive {
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 40%, var(--bg-overlay));
}

.image-uploader__btn--destructive:hover:not(:disabled) {
  border-color: var(--error);
}

.image-uploader__file {
  display: none;
}

.image-uploader__error {
  margin: 0;
  padding: 6px 8px;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--error);
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
  border-radius: 3px;
}
</style>
