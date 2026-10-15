<script setup lang="ts">
import CampaignColorField from '../CampaignColorField.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const { access, meta, connections } = useCampaignEditorContext()
const { editable } = access
const { defaultColorHex } = meta
const { selectedEdge, formConnection, connectionColorError } = connections
const { commitConnectionColor, resetConnectionColor } = connections
</script>

<template>
  <fieldset v-if="selectedEdge" class="campaign-editor__section" :disabled="!editable">
    <CampaignColorField
      v-model="formConnection.color"
      label="Connection color"
      text
      placeholder="#f5b800 · gold"
      :maxlength="33"
      :fallback="defaultColorHex"
      :error="connectionColorError"
      @commit="commitConnectionColor"
      @reset="resetConnectionColor"
    />
  </fieldset>
</template>
