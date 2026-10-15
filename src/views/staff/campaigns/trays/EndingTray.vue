<script setup lang="ts">
import { computed } from 'vue'
import CampaignEditorNote from '../CampaignEditorNote.vue'
import CampaignEditorToggle from '../CampaignEditorToggle.vue'
import CampaignTrayIcon from '../CampaignTrayIcon.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const { access, vertices, meta, nodes } = useCampaignEditorContext()
const { editable } = access
const { selectedDifficulty } = vertices
const { terminalNodeIds } = meta
const { isTerminalNode, lockedLastTerminal, setNodeTerminal } = nodes

const otherEndings = computed(() => {
  const ids = terminalNodeIds.value
  const selfId = selectedDifficulty.value?.id
  return selfId && ids.has(selfId) ? ids.size - 1 : ids.size
})
</script>

<template>
  <fieldset v-if="selectedDifficulty" class="campaign-editor__section" :disabled="!editable">
    <CampaignEditorToggle
      :model-value="isTerminalNode"
      label="Finishes the campaign"
      @update:model-value="setNodeTerminal"
    >
      <template #glyph>
        <CampaignTrayIcon name="flag" :size="26" />
      </template>
    </CampaignEditorToggle>

    <p v-if="otherEndings > 0" class="campaign-editor__hint">
      {{ otherEndings === 1 ? 'One other ending' : `${otherEndings} other endings` }}
    </p>
    <CampaignEditorNote v-if="lockedLastTerminal">
      Only ending on a live campaign. Flag another first.
    </CampaignEditorNote>
  </fieldset>
</template>
