<script setup lang="ts">
import { useCampaignEditorContext } from '../campaignEditorContext'

const { access, vertices, nodes } = useCampaignEditorContext()
const { editable } = access
const { selectedDifficulty } = vertices
const { setPrereqMode } = nodes
</script>

<template>
  <fieldset v-if="selectedDifficulty" class="campaign-editor__section" :disabled="!editable">
    <div class="campaign-editor__prereq-mode" role="radiogroup" aria-label="Unlock when">
      <div class="campaign-editor__prereq-mode-toggle">
        <button
          type="button"
          role="radio"
          :aria-checked="selectedDifficulty.prerequisiteMode !== 'AND'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active':
              selectedDifficulty.prerequisiteMode !== 'AND',
          }"
          @click="setPrereqMode('OR')"
        >
          any clears
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="selectedDifficulty.prerequisiteMode === 'AND'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active':
              selectedDifficulty.prerequisiteMode === 'AND',
          }"
          @click="setPrereqMode('AND')"
        >
          all clear
        </button>
      </div>
    </div>
  </fieldset>
</template>


<style scoped>
.campaign-editor__prereq-mode {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
</style>
