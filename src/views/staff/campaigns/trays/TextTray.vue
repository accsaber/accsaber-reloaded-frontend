<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import RichTextEditor from '@/components/common/RichTextEditor.vue'
import CampaignColorField from '../CampaignColorField.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'
import { TEXT_EFFECTS } from '../useCampaignTexts'

const FONT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'mono', label: 'Monospace' },
  { value: 'serif', label: 'Serif' },
]

const { access, vertices, meta, texts } = useCampaignEditorContext()
const { editable } = access
const { selectedText } = vertices
const { defaultColorHex } = meta
const { formText, commitTextField, onTextContentInput, resetTextColor } = texts
const { textEffectActive, toggleTextEffect } = texts

function setFont(value: string) {
  formText.value.font = value
  commitTextField('font')
}
</script>

<template>
  <fieldset v-if="selectedText" class="campaign-editor__section" :disabled="!editable">
    <div class="campaign-editor__field" @focusout="commitTextField('content')">
      <span>Content</span>
      <RichTextEditor
        :model-value="formText.content"
        :min-height="120"
        :max-height="240"
        aria-label="Text content"
        @update:model-value="onTextContentInput"
      />
    </div>
    <div class="campaign-editor__field">
      <span>Font</span>
      <BaseSelect :model-value="formText.font" :options="FONT_OPTIONS" @update:model-value="setFont" />
    </div>
    <label class="campaign-editor__field">
      <span>Scale: {{ formText.scale.toFixed(1) }}×</span>
      <input
        v-model.number="formText.scale"
        type="range"
        min="0.5"
        max="3"
        step="0.1"
        @change="commitTextField('scale')"
      />
    </label>
    <CampaignColorField
      v-model="formText.color"
      label="Color"
      :fallback="defaultColorHex"
      @commit="commitTextField('color')"
      @reset="resetTextColor"
    />
    <div class="campaign-editor__field">
      <span>Effects</span>
      <div class="campaign-editor__tag-chips">
        <button
          v-for="fx in TEXT_EFFECTS"
          :key="fx"
          type="button"
          class="campaign-editor__chip"
          :class="{ 'campaign-editor__chip--active': textEffectActive(fx) }"
          @click="toggleTextEffect(fx)"
        >
          {{ fx }}
        </button>
      </div>
    </div>
  </fieldset>
</template>
