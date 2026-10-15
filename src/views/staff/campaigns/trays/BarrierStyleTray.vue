<script setup lang="ts">
import { cssToken, resolveSize } from '@/utils/campaignLayout'
import { computed } from 'vue'
import CampaignColorField from '../CampaignColorField.vue'
import CampaignLabelPositionPicker from '../CampaignLabelPositionPicker.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const { access, vertices, barriers } = useCampaignEditorContext()
const { editable } = access
const { selectedBarrier } = vertices
const { formBarrier, commitBarrierField, resetBarrierColor, selectBarrierLabelPosition } = barriers

const defaultBarrierColor = computed(() => cssToken('--warning'))
</script>

<template>
  <fieldset v-if="selectedBarrier" class="campaign-editor__section" :disabled="!editable">
    <div class="campaign-editor__field">
      <span>Gate length: {{ resolveSize(formBarrier.size, 48) }}px</span>
      <input
        type="range"
        min="32"
        max="120"
        step="1"
        :value="resolveSize(formBarrier.size, 48)"
        @input="formBarrier.size = Number(($event.target as HTMLInputElement).value)"
        @change="commitBarrierField('size')"
      />
    </div>
    <CampaignColorField
      v-model="formBarrier.borderColor"
      label="Gate color"
      :fallback="defaultBarrierColor"
      @commit="commitBarrierField('borderColor')"
      @reset="resetBarrierColor"
    />
    <label class="campaign-editor__field">
      <span>Label <small>(optional)</small></span>
      <input
        v-model="formBarrier.checkpointLabel"
        type="text"
        placeholder="e.g. Section clear"
        @blur="commitBarrierField('checkpointLabel')"
      />
    </label>
    <div class="campaign-editor__field">
      <span>Label position</span>
      <CampaignLabelPositionPicker
        :model-value="formBarrier.checkpointLabelPosition"
        @select="selectBarrierLabelPosition"
      />
    </div>
  </fieldset>
</template>
