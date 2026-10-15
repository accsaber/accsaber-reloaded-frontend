<script setup lang="ts">
import ImageUploader from '@/components/common/ImageUploader.vue'
import { resolveSize } from '@/utils/campaignLayout'
import CampaignColorField from '../CampaignColorField.vue'
import CampaignEditorTile from '../CampaignEditorTile.vue'
import CampaignShapeGlyph from '../CampaignShapeGlyph.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'
import { SHAPE_TILES, SIZE_TILES } from '../useCampaignNodes'

const { access, vertices, meta, nodes, assets } = useCampaignEditorContext()
const { editable } = access
const { selectedDifficulty } = vertices
const { defaultColorHex } = meta
const { formNode, commitNodeField, resetNodeColor, selectBorderShape, selectNodeSize } = nodes
const { selectNodeBorderLayer } = nodes
const { uploadNodeBorder, removeNodeBorder } = assets
</script>

<template>
  <fieldset class="campaign-editor__section" :disabled="!editable">
    <div class="campaign-editor__field">
      <span>Border shape</span>
      <div class="campaign-editor__shape-row">
        <CampaignEditorTile
          v-for="t in SHAPE_TILES"
          :key="t.label"
          :active="formNode.borderShape === t.value"
          :label="t.label"
          @select="selectBorderShape(t.value)"
        >
          <CampaignShapeGlyph :shape="t.value" />
        </CampaignEditorTile>
      </div>
    </div>
    <div class="campaign-editor__field">
      <span>Node size: {{ resolveSize(formNode.size, 48) }}px</span>
      <div class="campaign-editor__shape-row">
        <CampaignEditorTile
          v-for="t in SIZE_TILES"
          :key="t.value"
          :active="resolveSize(formNode.size, 48) === t.value"
          :label="`${t.label} (${t.value}px)`"
          @select="selectNodeSize(t.value)"
        >
          <CampaignShapeGlyph shape="hex" :radius="t.glyph" />
        </CampaignEditorTile>
      </div>
      <input
        type="range"
        min="24"
        max="96"
        step="1"
        :value="resolveSize(formNode.size, 48)"
        @input="formNode.size = Number(($event.target as HTMLInputElement).value)"
        @change="commitNodeField('size')"
      />
    </div>
    <CampaignColorField
      v-model="formNode.borderColor"
      label="Border color"
      :fallback="defaultColorHex"
      @commit="commitNodeField('borderColor')"
      @reset="resetNodeColor('borderColor')"
    />
    <div class="campaign-editor__avatar-upload">
      <ImageUploader
        label="Border art"
        hint="Frame or GIF"
        aspect-ratio="1 / 1"
        :image-url="selectedDifficulty?.nodeBorderUrl || null"
        :disabled="!editable"
        :upload-handler="uploadNodeBorder"
        :remove-handler="removeNodeBorder"
      />
    </div>
    <div v-if="selectedDifficulty?.nodeBorderUrl" class="campaign-editor__field">
      <span>Border layer</span>
      <div class="campaign-editor__prereq-mode-toggle" role="radiogroup" aria-label="Border layer">
        <button
          type="button"
          role="radio"
          :aria-checked="formNode.nodeBorderLayer !== 'BELOW'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active': formNode.nodeBorderLayer !== 'BELOW',
          }"
          @click="selectNodeBorderLayer('ABOVE')"
        >
          over cover
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="formNode.nodeBorderLayer === 'BELOW'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active': formNode.nodeBorderLayer === 'BELOW',
          }"
          @click="selectNodeBorderLayer('BELOW')"
        >
          behind cover
        </button>
      </div>
    </div>
  </fieldset>
</template>
