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
  gap: var(--space-xs) var(--space-sm);
  margin-top: var(--space-xs);
}

.issue-notes__ref {
  max-width: 100%;
  padding: 0;
  font-weight: 600;
  color: inherit;
  background: transparent;
  border: none;
  text-decoration: underline;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.issue-notes__ref:hover {
  color: var(--text-primary);
}
</style>
