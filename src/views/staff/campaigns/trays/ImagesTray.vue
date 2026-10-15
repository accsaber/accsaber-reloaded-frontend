<script setup lang="ts">
import ImageUploader from '@/components/common/ImageUploader.vue'
import CampaignBackgroundPlacer from '../CampaignBackgroundPlacer.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const { doc, access, meta, vertices, assets } = useCampaignEditorContext()
const { campaign } = doc
const { editable } = access
const { commitBackgroundPlacement } = meta
const { canvasFrame, gridLock } = vertices
const { uploadBackground, removeBackground, uploadIcon, removeIcon } = assets
</script>

<template>
  <fieldset v-if="campaign" class="campaign-editor__section" :disabled="!editable">
    <div class="campaign-editor__image-row">
      <ImageUploader
        label="Background"
        hint="16:9 hero"
        :image-url="campaign.backgroundUrl"
        :disabled="!editable"
        :upload-handler="uploadBackground"
        :remove-handler="removeBackground"
      />
      <ImageUploader
        label="Icon"
        hint="Square card image"
        aspect-ratio="1 / 1"
        :image-url="campaign.iconUrl"
        :disabled="!editable"
        :upload-handler="uploadIcon"
        :remove-handler="removeIcon"
      />
    </div>
    <div v-if="campaign.backgroundUrl" class="campaign-editor__field">
      <span>Background placement</span>
      <CampaignBackgroundPlacer
        :image-url="campaign.backgroundUrl"
        :placement="campaign.background"
        :frame="canvasFrame"
        :grid-lock="gridLock"
        :disabled="!editable"
        @commit="commitBackgroundPlacement"
      />
    </div>
  </fieldset>
</template>


<style scoped>
.campaign-editor__image-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.campaign-editor__image-row :deep(.image-uploader) {
  width: 100%;
  max-width: 320px;
}

.campaign-editor__image-row :deep(.image-uploader:last-child) {
  max-width: 200px;
}
</style>
