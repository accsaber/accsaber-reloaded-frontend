<script setup lang="ts">
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ItemResponse } from '@/types/api/items'
import { computed } from 'vue'

export interface ClanProfileDraft {
  name: string
  tag: string
  description: string
  tagColor: string
}

const draft = defineModel<ClanProfileDraft>({ required: true })

const props = defineProps<{
  fieldErrors: Record<string, string>
  iconUrl?: string | null
  uploadIcon?: (file: File) => Promise<void>
  removeIcon?: () => Promise<void>
  equipped?: ItemResponse[]
  disabled?: boolean
}>()

const neutral = getComputedStyle(document.documentElement).getPropertyValue('--bg-overlay').trim()
const swatch = computed(() => draft.value.tagColor || neutral)
const tagPreview = computed(() => ({
  slug: '',
  name: draft.value.name,
  tag: draft.value.tag || 'TAG',
  tagColor: draft.value.tagColor || null,
  equipped: props.equipped ?? [],
}))

function setColor(e: Event) {
  draft.value = { ...draft.value, tagColor: (e.target as HTMLInputElement).value.toLowerCase() }
}

function setTag(value: string | number) {
  draft.value = { ...draft.value, tag: String(value).replace(/[^a-z0-9]/gi, '').slice(0, 5).toUpperCase() }
}
</script>

<template>
  <div class="clan-form">
    <ImageUploader
      v-if="uploadIcon"
      class="clan-form__icon"
      label="Icon"
      aspect-ratio="1 / 1"
      crop
      :image-url="iconUrl ?? null"
      :disabled="disabled"
      :upload-handler="uploadIcon"
      :remove-handler="removeIcon"
    />
    <BaseInput
      :model-value="draft.name"
      label="Name"
      placeholder="The Best Clan"
      maxlength="32"
      :disabled="disabled"
      :error="fieldErrors.name"
      @update:model-value="draft = { ...draft, name: String($event) }"
    />
    <BaseInput
      :model-value="draft.tag"
      label="Tag"
      placeholder="TBC"
      maxlength="5"
      autocapitalize="characters"
      autocomplete="off"
      :disabled="disabled"
      :error="fieldErrors.tag"
      class="clan-form__tag"
      @update:model-value="setTag"
    />
    <div class="clan-form__color">
      <span class="clan-form__label">Tag colour</span>
      <div class="clan-form__color-row">
        <input type="color" aria-label="Tag colour" :value="swatch" :disabled="disabled" @input="setColor" />
        <span class="clan-form__preview"><ClanTag :clan="tagPreview" preview /></span>
        <BaseButton
          v-if="draft.tagColor"
          size="sm"
          :disabled="disabled"
          @click="draft = { ...draft, tagColor: '' }"
        >
          Clear
        </BaseButton>
      </div>
      <p v-if="fieldErrors.tagColor" class="clan-form__error" role="alert">{{ fieldErrors.tagColor }}</p>
    </div>
    <BaseTextarea
      :model-value="draft.description"
      label="Description"
      :maxlength="500"
      :rows="4"
      :disabled="disabled"
      :error="fieldErrors.description"
      @update:model-value="draft = { ...draft, description: $event }"
    />
  </div>
</template>

<style scoped>
.clan-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.clan-form__icon {
  width: 128px;
}

.clan-form__tag {
  max-width: 160px;
}

.clan-form__color {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.clan-form__label {
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.clan-form__color-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.clan-form__color-row input {
  width: 48px;
  height: 32px;
  padding: 0;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  cursor: pointer;
}

.clan-form__preview {
  font-size: var(--text-section-heading);
}

.clan-form__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.clan-form__tag :deep(.base-input__field) {
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
