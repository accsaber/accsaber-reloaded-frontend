<script setup lang="ts">
import ImageUploader from '@/components/common/ImageUploader.vue'
import { resolveSize } from '@/utils/campaignLayout'
import CampaignColorField from '../CampaignColorField.vue'
import CampaignEditorToggle from '../CampaignEditorToggle.vue'
import CampaignLabelPositionPicker from '../CampaignLabelPositionPicker.vue'
import CampaignTrayIcon from '../CampaignTrayIcon.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const { access, vertices, meta, nodes, assets } = useCampaignEditorContext()
const { editable } = access
const { selectedDifficulty } = vertices
const { defaultColorHex } = meta
const { formNode, commitNodeField, resetNodeColor, selectNodeLabelPosition } = nodes
const { isMilestone, setMilestone, commitMilestoneLabel } = nodes
const { uploadCheckpointAvatar, removeCheckpointAvatar } = assets
</script>

<template>
  <fieldset class="campaign-editor__section" :disabled="!editable">
    <CampaignEditorToggle
      :model-value="isMilestone"
      label="Milestone"
      @update:model-value="setMilestone"
    >
      <template #glyph>
        <CampaignTrayIcon name="award" :size="26" />
      </template>
    </CampaignEditorToggle>
    <template v-if="isMilestone">
      <label class="campaign-editor__field">
        <span>Label</span>
        <input
          v-model="formNode.checkpointLabel"
          type="text"
          placeholder="e.g. Rookie"
          @blur="commitMilestoneLabel()"
        />
      </label>
      <div class="campaign-editor__field">
        <span>Label position</span>
        <CampaignLabelPositionPicker
          :model-value="formNode.checkpointLabelPosition"
          @select="selectNodeLabelPosition"
        />
      </div>
      <div class="campaign-editor__avatar-upload">
        <ImageUploader
          label="Avatar"
          hint="Square, optional"
          aspect-ratio="1 / 1"
          :image-url="selectedDifficulty?.checkpointAvatarUrl || null"
          :disabled="!editable"
          :upload-handler="uploadCheckpointAvatar"
          :remove-handler="removeCheckpointAvatar"
        />
      </div>
      <div class="campaign-editor__field-row">
        <CampaignColorField
          v-model="formNode.checkpointColor"
          label="Band color"
          :fallback="defaultColorHex"
          @commit="commitNodeField('checkpointColor')"
          @reset="resetNodeColor('checkpointColor')"
        />
        <label class="campaign-editor__field">
          <span>Band size: {{ resolveSize(formNode.checkpointSize, 30) }}px</span>
          <input
            type="range"
            min="14"
            max="64"
            step="1"
            :value="resolveSize(formNode.checkpointSize, 30)"
            @input="formNode.checkpointSize = Number(($event.target as HTMLInputElement).value)"
            @change="commitNodeField('checkpointSize')"
          />
        </label>
      </div>
    </template>
  </fieldset>
</template>


<style scoped>
.campaign-editor__field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}
</style>
