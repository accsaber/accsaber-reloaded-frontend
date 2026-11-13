<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'
import { PREREQ_TABS } from '../useCampaignNodes'

const { access, vertices, nodes } = useCampaignEditorContext()
const { editable } = access
const { selectedDifficulty } = vertices
const { setPrereqMode } = nodes
</script>

<template>
  <fieldset v-if="selectedDifficulty" class="campaign-editor__section" :disabled="!editable">
    <BaseTabs
      variant="segmented"
      label="Unlock when"
      :tabs="PREREQ_TABS"
      :model-value="selectedDifficulty.prerequisiteMode === 'AND' ? 'AND' : 'OR'"
      @update:model-value="setPrereqMode($event as 'AND' | 'OR')"
    />
  </fieldset>
</template>
