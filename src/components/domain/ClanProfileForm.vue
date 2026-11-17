<script setup lang="ts">
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import ClanColorField from '@/components/domain/ClanColorField.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ItemResponse } from '@/types/api/items'
import { CLAN_COLOR_FIELDS, cleanClanTag, type ClanProfileDraft } from '@/utils/clans'
import { computed } from 'vue'

const draft = defineModel<ClanProfileDraft>({ required: true })

const props = defineProps<{
  fieldErrors: Record<string, string>
  iconUrl?: string | null
  uploadIcon?: (file: File) => Promise<void>
  removeIcon?: () => Promise<void>
  bannerUrl?: string | null
  uploadBanner?: (file: File) => Promise<void>
  removeBanner?: () => Promise<void>
  equipped?: ItemResponse[]
  disabled?: boolean
}>()

const tagPreview = computed(() => ({
  slug: '',
  name: draft.value.name,
  tag: draft.value.tag || 'TAG',
  tagColor: draft.value.tagColor || null,
  equipped: props.equipped ?? [],
}))
</script>

<template>
  <div class="clan-form">
    <ImageUploader
      v-if="uploadBanner"
      label="Banner"
      aspect-ratio="4 / 1"
      crop
      :image-url="bannerUrl ?? null"
      :disabled="disabled"
      :upload-handler="uploadBanner"
      :remove-handler="removeBanner"
    />
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
      @update:model-value="draft = { ...draft, tag: cleanClanTag($event) }"
    />
    <ClanColorField
      v-for="field in CLAN_COLOR_FIELDS"
      :key="field.key"
      :model-value="draft[field.key]"
      :label="field.label"
      :disabled="disabled"
      :error="fieldErrors[field.key]"
      @update:model-value="draft = { ...draft, [field.key]: $event }"
    >
      <span v-if="field.key === 'tagColor'" class="clan-form__preview"><ClanTag :clan="tagPreview" preview /></span>
    </ClanColorField>
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

.clan-form__preview {
  font-size: var(--text-section-heading);
}

.clan-form__tag :deep(.base-input__field) {
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
