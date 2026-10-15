<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import CampaignEditorTile from '../CampaignEditorTile.vue'
import CampaignShapeGlyph from '../CampaignShapeGlyph.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'
import { SHAPE_TILES, SIZE_TILES } from '../useCampaignNodes'

const { doc, access, selection, nodes } = useCampaignEditorContext()
const { actionPending } = doc
const { editable } = access
const { selectedCount } = selection
const { applyBulkSize, applyBulkShape, removeSelectedNodes } = nodes
</script>

<template>
  <fieldset class="campaign-editor__section" :disabled="!editable">
    <p class="campaign-editor__hint">{{ selectedCount }} selected</p>
    <div class="campaign-editor__field">
      <span>Node size</span>
      <div class="campaign-editor__shape-row">
        <CampaignEditorTile
          v-for="t in SIZE_TILES"
          :key="t.value"
          :label="`${t.label} (${t.value}px)`"
          @select="applyBulkSize(t.value)"
        >
          <CampaignShapeGlyph shape="hex" :radius="t.glyph" />
        </CampaignEditorTile>
      </div>
    </div>
    <div class="campaign-editor__field">
      <span>Border shape</span>
      <div class="campaign-editor__shape-row">
        <CampaignEditorTile
          v-for="t in SHAPE_TILES"
          :key="t.label"
          :label="t.label"
          @select="applyBulkShape(t.value)"
        >
          <CampaignShapeGlyph :shape="t.value" />
        </CampaignEditorTile>
      </div>
    </div>
    <BaseButton
      size="sm"
      variant="destructive"
      :loading="actionPending"
      @click="removeSelectedNodes"
    >
      Remove {{ selectedCount }} nodes
    </BaseButton>
  </fieldset>
</template>
