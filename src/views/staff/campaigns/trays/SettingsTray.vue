<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import CampaignColorField from '../CampaignColorField.vue'
import CampaignEditorNote from '../CampaignEditorNote.vue'
import CampaignEditorToggle from '../CampaignEditorToggle.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const { access, meta, barriers } = useCampaignEditorContext()
const { editable } = access
const { formMeta, fieldErrors, setMetaFlag, commitBackgroundColor, resetBackgroundColor } = meta
const { completionModeOptions, completionModeBlocked, onCompletionModeChange } = meta
const { defaultColorHex } = meta
const { hasBarriers } = barriers
</script>

<template>
  <fieldset class="campaign-editor__section" :disabled="!editable">
    <div class="campaign-editor__field">
      <span>Completion mode</span>
      <BaseSelect
        :model-value="formMeta.completionMode"
        :options="completionModeOptions"
        @update:model-value="onCompletionModeChange"
      />
    </div>
    <CampaignEditorNote v-if="completionModeBlocked" tone="error">
      No node is flagged as an ending. Flag one first.
    </CampaignEditorNote>
    <CampaignEditorToggle
      :model-value="formMeta.progressionAgnostic"
      label="Progression agnostic"
      on-text="Any order"
      off-text="Follows connections"
      :disabled="hasBarriers"
      @update:model-value="setMetaFlag('progressionAgnostic', $event)"
    />
    <p v-if="hasBarriers" class="campaign-editor__hint">Remove the barriers first.</p>
    <CampaignEditorToggle
      :model-value="formMeta.playlistExportEnabled"
      label="Playlist export"
      @update:model-value="setMetaFlag('playlistExportEnabled', $event)"
    />
    <CampaignColorField
      v-model="formMeta.backgroundColor"
      label="Background color"
      text
      placeholder="#f5b800 · gold · rgb(…)"
      :fallback="defaultColorHex"
      :error="fieldErrors.backgroundColor"
      @commit="commitBackgroundColor"
      @reset="resetBackgroundColor"
    />
  </fieldset>
</template>
