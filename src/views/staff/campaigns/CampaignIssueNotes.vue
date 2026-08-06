<script setup lang="ts">
import CampaignEditorNote from './CampaignEditorNote.vue'
import type { CampaignAuditIssue } from '@/utils/campaignAudit'

withDefaults(defineProps<{ issues: CampaignAuditIssue[]; tone?: 'warning' | 'error' }>(), {
  tone: 'warning',
})

defineEmits<{ select: [id: string] }>()
</script>

<template>
  <CampaignEditorNote v-for="issue in issues" :key="issue.key" :tone="tone">
    {{ issue.message }}
    <span v-if="issue.refs.length > 0" class="issue-notes__refs">
      <button
        v-for="vertex in issue.refs"
        :key="vertex.id"
        type="button"
        class="issue-notes__ref"
        @click="$emit('select', vertex.id)"
      >
        {{ vertex.label }}
      </button>
    </span>
  </CampaignEditorNote>
</template>

<style scoped>
.issue-notes__refs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.issue-notes__ref {
  max-width: 100%;
  padding: 2px 6px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: inherit;
  background: transparent;
  border: 1px solid color-mix(in srgb, currentColor 40%, transparent);
  border-radius: 2px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 120ms ease;
}

.issue-notes__ref:hover {
  background: color-mix(in srgb, currentColor 14%, transparent);
}
</style>
