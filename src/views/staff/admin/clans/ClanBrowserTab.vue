<script setup lang="ts">
import { parseApiError } from '@/api/client'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import { useQueryParams } from '@/composables/useQueryParams'
import type { ClanResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import { formatStanding } from '@/utils/clans'
import { computed, defineAsyncComponent, ref, watch } from 'vue'

const ClanAdminDetail = defineAsyncComponent(() => import('./ClanAdminDetail.vue'))

const PAGE_SIZE = 20
const COLUMNS: TableColumn[] = [
  { key: 'clan', label: 'Clan', primary: true },
  { key: 'level', label: 'Level', align: 'right', mono: true, width: '100px' },
  { key: 'members', label: 'Members', align: 'right', mono: true, width: '120px' },
  { key: 'standing', label: 'Standing', align: 'right', mono: true, width: '140px' },
]

const { queryRef } = useQueryParams()

const openClanId = queryRef('clan')
const search = queryRef('q')
const page = ref(1)
const totalPages = ref(0)
const clans = ref<ClanResponse[]>([])
const loading = ref(true)
const error = ref('')

const rows = computed<Record<string, unknown>[]>(() =>
  clans.value.map((row) => ({
    id: row.clan.id,
    clan: row.clan,
    level: row.level.level,
    members: `${row.memberCount}/${row.memberCap}`,
    standing: formatStanding(row.standing),
  })),
)

let requestId = 0

async function fetchClans() {
  const id = ++requestId
  loading.value = true
  error.value = ''
  try {
    const { getClans } = await import('@/api/clans')
    const res = await getClans({ page: page.value - 1, size: PAGE_SIZE, search: search.value.trim() || undefined })
    if (id !== requestId) return
    clans.value = res.content
    totalPages.value = res.totalPages
  } catch (err) {
    if (id === requestId) error.value = parseApiError(err, 'Could not load the clans').message
  } finally {
    if (id === requestId) loading.value = false
  }
}

function onDisbanded() {
  openClanId.value = ''
  void fetchClans()
}

watch(search, () => {
  if (page.value === 1) void fetchClans()
  else page.value = 1
})
watch(page, fetchClans, { immediate: true })
</script>

<template>
  <ClanAdminDetail v-if="openClanId" :clan-id="openClanId" @back="openClanId = ''" @disbanded="onDisbanded" />
  <div v-else class="browser">
    <SearchBox v-model="search" placeholder="Search name or tag" />
    <p v-if="error" class="caption browser__error" role="alert">{{ error }}</p>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading && !clans.length" :refreshing="loading && clans.length > 0"
      :loading-rows="PAGE_SIZE" :row-height="56" row-key="id" row-clickable empty-message="No clans match"
      @row-click="(row) => (openClanId = row.id as string)">
      <template #cell-clan="{ row }">
        <span class="browser__clan">
          <ClanIcon :clan="(row.clan as ClanResponse['clan'])" :size="28" />
          <ClanTag :clan="(row.clan as ClanResponse['clan'])" size="sm" />
          <span class="browser__name">{{ (row.clan as ClanResponse['clan']).name }}</span>
        </span>
      </template>
    </DataTable>

    <div class="browser__pages">
      <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="page = $event" />
    </div>
  </div>
</template>

<style scoped>
.browser {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.browser__error {
  color: var(--error);
}

.browser__clan {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.browser__name {
  font-weight: 600;
  color: var(--text-primary);
}

.browser__pages {
  min-height: var(--control-h);
}
</style>
