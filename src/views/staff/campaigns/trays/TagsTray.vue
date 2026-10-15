<script setup lang="ts">
import { useCampaignEditorContext } from '../campaignEditorContext'

const TAG_KINDS = ['CATEGORY', 'DIFFICULTY', 'THEME', 'GENRE']

const { access, meta } = useCampaignEditorContext()
const { editable } = access
const { tagsByKind, campaignTagIds, toggleTag } = meta
</script>

<template>
  <fieldset class="campaign-editor__section" :disabled="!editable">
    <div v-for="kind in TAG_KINDS" :key="kind" class="campaign-editor__tag-group">
      <span class="campaign-editor__tag-label">{{ kind.toLowerCase() }}</span>
      <div class="campaign-editor__tag-chips">
        <button
          v-for="t in tagsByKind.get(kind) ?? []"
          :key="t.id"
          type="button"
          class="campaign-editor__chip"
          :class="{ 'campaign-editor__chip--active': campaignTagIds.has(t.id) }"
          @click="toggleTag(t.id)"
        >
          {{ t.name }}
        </button>
      </div>
    </div>
  </fieldset>
</template>


<style scoped>
.campaign-editor__tag-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.campaign-editor__tag-label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--text-tertiary);
  text-transform: capitalize;
}
</style>
