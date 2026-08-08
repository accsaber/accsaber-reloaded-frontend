<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import DataTable from '@/components/common/DataTable.vue'
import BadgePill from '@/components/domain/BadgePill.vue'
import type { QuestReleaseResponse } from '@/types/api/quest'
import type { TableColumn } from '@/types/display'
import { formatFullDate, formatRelativeDate } from '@/utils/formatters'
import { computed } from 'vue'

const props = defineProps<{
  releases: QuestReleaseResponse[]
  loading: boolean
  listError: string | null
  feedback: { variant: 'error' | 'success'; text: string } | null
  signedIn: boolean
  generatingTag: string | null
}>()

defineEmits<{
  generate: [tag: string]
  'sign-in': []
}>()

const COLUMNS: TableColumn[] = [
  { key: 'tag', label: 'Mod version', mono: true },
  { key: 'gameVersion', label: 'Beat Saber', mono: true },
  { key: 'publishedAt', label: 'Released' },
  { key: 'action', label: '', align: 'right' },
]

const rows = computed<Record<string, unknown>[]>(() => props.releases.map((r) => ({ ...r })))

function rowClass(row: Record<string, unknown>) {
  return row.prerelease ? 'quest-releases__row--pre' : undefined
}
</script>

<template>
  <div class="quest-releases">
    <BaseBanner variant="error" role="alert" :dismissible="false">
      <template #icon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </template>
      Do not share this file. It carries your private AccSaber session, so anyone who has it can
      submit scores as you.
    </BaseBanner>

    <BaseBanner v-if="!signedIn" variant="info" :dismissible="false">
      Sign in to generate a download.
      <template #actions>
        <BaseButton size="sm" @click="$emit('sign-in')">Sign in</BaseButton>
      </template>
    </BaseBanner>

    <BaseBanner v-if="listError" variant="error" role="alert" :dismissible="false">
      {{ listError }}
    </BaseBanner>

    <BaseBanner v-if="feedback" :variant="feedback.variant"
      :role="feedback.variant === 'error' ? 'alert' : 'status'" :dismissible="false">
      {{ feedback.text }}
    </BaseBanner>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading" :loading-rows="3" row-key="tag"
      :row-class="rowClass" empty-message="No releases published yet - the Quest mod is coming soon.">
      <template #cell-tag="{ row }">
        <span class="quest-releases__tag">
          {{ row.tag }}
          <BadgePill v-if="row.latest" label="LATEST" color="var(--page-accent)" />
          <BadgePill v-if="row.prerelease" label="PRE-RELEASE" color="var(--warning)" />
        </span>
      </template>

      <template #cell-gameVersion="{ value }">
        {{ value ?? '-' }}
      </template>

      <template #cell-publishedAt="{ value }">
        <span :title="formatFullDate(value as string)">
          {{ formatRelativeDate(value as string) }}
        </span>
      </template>

      <template #cell-action="{ row }">
        <BaseButton size="sm" variant="primary" :disabled="!signedIn || generatingTag !== null"
          :loading="generatingTag === row.tag" @click="$emit('generate', row.tag as string)">
          Generate
        </BaseButton>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.quest-releases {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.quest-releases :deep(.banner) {
  max-width: none;
  margin: 0;
}

.quest-releases :deep(.quest-releases__row--pre) {
  color: var(--text-secondary);
}

.quest-releases__tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}
</style>
