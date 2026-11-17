<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import UserChip from '@/components/domain/UserChip.vue'
import UserPicker from '@/components/domain/UserPicker.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import type { DuplicateCandidateResponse, DuplicateLinkResponse } from '@/types/api/admin'
import type { PlayerRef } from '@/types/api/common'
import type { TableColumn, Tab } from '@/types/display'
import { formatCount, formatShortDate } from '@/utils/formatters'
import { computed, ref } from 'vue'

type View = 'detected' | 'linked' | 'merged'

const LOADING_ROWS = 8
const PLAYER_COLUMNS: TableColumn[] = [
  { key: 'primary', label: 'Keep', primary: true },
  { key: 'secondary', label: 'Merge Away', width: '300px' },
]
const COLUMNS: Record<View, TableColumn[]> = {
  detected: [
    ...PLAYER_COLUMNS,
    { key: 'identicalScores', label: 'Identical', align: 'right', mono: true, width: '110px', format: (v) => formatCount(v as number) },
    { key: 'primaryTotalScores', label: 'Keep Scores', align: 'right', mono: true, width: '130px', format: (v) => formatCount(v as number) },
    { key: 'secondaryTotalScores', label: 'Away Scores', align: 'right', mono: true, width: '130px', format: (v) => formatCount(v as number) },
    { key: 'actions', label: '', align: 'right', width: '120px', noLink: true },
  ],
  linked: [
    ...PLAYER_COLUMNS,
    { key: 'reason', label: 'Reason', width: '260px', format: (v) => (v as string | null) ?? '-' },
    { key: 'createdAt', label: 'Linked', width: '130px', format: (v) => formatShortDate(v as string) },
    { key: 'actions', label: '', align: 'right', width: '170px', noLink: true },
  ],
  merged: [
    ...PLAYER_COLUMNS,
    { key: 'reason', label: 'Reason', width: '260px', format: (v) => (v as string | null) ?? '-' },
    { key: 'mergedAt', label: 'Merged', width: '130px', format: (v) => formatShortDate(v as string | null, '-') },
    { key: 'actions', label: '', align: 'right', width: '120px', noLink: true },
  ],
}
const EMPTY: Record<View, string> = {
  detected: 'No duplicates detected',
  linked: 'No links waiting to merge',
  merged: 'No merged accounts',
}

const { confirmModal, ask } = useConfirmAction()

const view = ref<View>('detected')
const candidates = ref<DuplicateCandidateResponse[]>([])
const links = ref<DuplicateLinkResponse[]>([])
const loading = ref(true)
const error = ref('')
const busyKey = ref<string | null>(null)

const unmerged = computed(() => links.value.filter((link) => !link.merged))
const merged = computed(() => links.value.filter((link) => link.merged))

const tabs = computed<Tab[]>(() => [
  { key: 'detected', label: `Detected ${candidates.value.length}` },
  { key: 'linked', label: `Linked ${unmerged.value.length}` },
  { key: 'merged', label: `Merged ${merged.value.length}` },
])

const rows = computed<Record<string, unknown>[]>(() => {
  if (view.value === 'detected') {
    return candidates.value.map((entry) => ({ ...entry, id: `${entry.primary.id}-${entry.secondary.id}`, entry }))
  }
  return (view.value === 'linked' ? unmerged.value : merged.value).map((entry) => ({ ...entry, entry }))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { getDuplicateCandidates, getDuplicateLinks } = await import('@/api/admin/duplicates')
    const [foundCandidates, foundLinks] = await Promise.all([getDuplicateCandidates(), getDuplicateLinks()])
    candidates.value = foundCandidates
    links.value = foundLinks
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the duplicates').message
  } finally {
    loading.value = false
  }
}

void load()

function replaceLinks(updated: DuplicateLinkResponse[]) {
  const byId = new Map(updated.map((link) => [link.id, link]))
  links.value = links.value.map((link) => byId.get(link.id) ?? link)
}

async function linkCandidate(row: Record<string, unknown>) {
  const candidate = row.entry as DuplicateCandidateResponse
  busyKey.value = row.id as string
  error.value = ''
  try {
    const { createDuplicateLink } = await import('@/api/admin/duplicates')
    const link = await createDuplicateLink({
      primaryUserId: candidate.primary.id,
      secondaryUserId: candidate.secondary.id,
      reason: `Auto-detected: ${candidate.identicalScores} identical scores`,
    })
    links.value = [link, ...links.value]
    candidates.value = candidates.value.filter((c) => c !== candidate)
  } catch (err) {
    error.value = parseApiError(err, 'Could not link these accounts').message
  } finally {
    busyKey.value = null
  }
}

function askMerge(link: DuplicateLinkResponse) {
  ask({
    title: 'Merge Accounts',
    message: `Merge ${link.secondary.name} into ${link.primary.name}? Their scores are combined under ${link.primary.name}.`,
    confirmLabel: 'Merge',
    run: async () => {
      const { mergeDuplicate } = await import('@/api/admin/duplicates')
      replaceLinks([await mergeDuplicate({ primaryUserId: link.primary.id, secondaryUserId: link.secondary.id, reason: link.reason ?? undefined })])
    },
  })
}

function askMergeAll() {
  ask({
    title: 'Merge Every Link',
    message: `Merge all ${unmerged.value.length} linked pairs? The recalculation runs once at the end.`,
    confirmLabel: 'Merge All',
    run: async () => {
      const { mergeAllUnmerged } = await import('@/api/admin/duplicates')
      replaceLinks(await mergeAllUnmerged())
    },
  })
}

function askUnmerge(link: DuplicateLinkResponse) {
  ask({
    title: 'Unmerge Accounts',
    message: `Unmerge ${link.secondary.name} from ${link.primary.name}?`,
    confirmLabel: 'Unmerge',
    run: async () => {
      const { unmergeDuplicate } = await import('@/api/admin/duplicates')
      replaceLinks([await unmergeDuplicate(link.id)])
    },
  })
}

function askRemove(link: DuplicateLinkResponse) {
  ask({
    title: 'Remove Link',
    message: `Remove the link between ${link.primary.name} and ${link.secondary.name}?`,
    confirmLabel: 'Remove',
    destructive: true,
    run: async () => {
      const { deleteDuplicateLink } = await import('@/api/admin/duplicates')
      await deleteDuplicateLink(link.id)
      links.value = links.value.filter((l) => l.id !== link.id)
    },
  })
}

const linking = ref(false)
const keepId = ref<string | null>(null)
const awayId = ref<string | null>(null)
const reason = ref('')
const linkBusy = ref(false)
const linkError = ref('')

function openLink() {
  keepId.value = null
  awayId.value = null
  reason.value = ''
  linkError.value = ''
  linking.value = true
}

async function createLink() {
  if (!keepId.value || !awayId.value) return
  linkBusy.value = true
  linkError.value = ''
  try {
    const { createDuplicateLink } = await import('@/api/admin/duplicates')
    const link = await createDuplicateLink({ primaryUserId: keepId.value, secondaryUserId: awayId.value, reason: reason.value || undefined })
    links.value = [link, ...links.value]
    linking.value = false
    view.value = 'linked'
  } catch (err) {
    linkError.value = parseApiError(err, 'Could not link these accounts').message
  } finally {
    linkBusy.value = false
  }
}
</script>

<template>
  <div class="duplicates">
    <div class="duplicates__controls">
      <BaseTabs v-model="view" variant="segmented" label="Duplicates" :tabs="tabs" />
      <span class="duplicates__right">
        <BaseButton v-if="view === 'linked' && unmerged.length" variant="primary" @click="askMergeAll">Merge All</BaseButton>
        <BaseButton :loading="loading" @click="load">Refresh</BaseButton>
        <BaseButton @click="openLink">Link Two Players</BaseButton>
      </span>
    </div>

    <p v-if="error" class="caption duplicates__error" role="alert">{{ error }}</p>

    <DataTable :key="view" :columns="COLUMNS[view]" :rows="rows" :loading="loading && !rows.length" :refreshing="loading && rows.length > 0"
      :loading-rows="LOADING_ROWS" :row-height="56" row-key="id" :empty-message="EMPTY[view]">
      <template v-for="side in ['primary', 'secondary']" :key="side" #[`cell-${side}`]="{ row }">
        <UserChip :user="(row[side] as PlayerRef)" size="sm" />
      </template>
      <template #cell-actions="{ row }">
        <span class="duplicates__actions">
          <BaseButton v-if="view === 'detected'" size="sm" variant="primary" :loading="busyKey === row.id" @click="linkCandidate(row)">
            Link
          </BaseButton>
          <template v-else-if="view === 'linked'">
            <BaseButton size="sm" variant="primary" @click="askMerge(row.entry as DuplicateLinkResponse)">Merge</BaseButton>
            <BaseButton size="sm" variant="destructive" @click="askRemove(row.entry as DuplicateLinkResponse)">Remove</BaseButton>
          </template>
          <BaseButton v-else size="sm" @click="askUnmerge(row.entry as DuplicateLinkResponse)">Unmerge</BaseButton>
        </span>
      </template>
    </DataTable>

    <BaseModal :open="linking" title="Link Two Players" @close="linking = false">
      <form class="duplicates__form" @submit.prevent="createLink">
        <span class="field-label">Keep</span>
        <UserPicker v-model="keepId" />
        <span class="field-label">Merge Away</span>
        <UserPicker v-model="awayId" />
        <BaseInput v-model="reason" label="Reason" />
        <p class="caption duplicates__form-error" role="alert">{{ linkError }}</p>
      </form>
      <template #footer>
        <BaseButton @click="linking = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="linkBusy" :disabled="!keepId || !awayId" @click="createLink">Link</BaseButton>
      </template>
    </BaseModal>

    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.duplicates {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.duplicates__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.duplicates__right {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-left: auto;
}

.duplicates__error {
  color: var(--error);
}

.duplicates__actions {
  display: inline-flex;
  gap: var(--space-xs);
}

.duplicates__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.duplicates__form-error {
  min-height: 1lh;
  color: var(--error);
}
</style>
