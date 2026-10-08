<script setup lang="ts">
import { parseApiError } from '@/api/client'
import AdminTable from '@/components/admin/AdminTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanStandingResponse } from '@/types/api/clans'
import { formatSignedStanding, formatStanding } from '@/utils/clans'
import { ref, watch } from 'vue'

const props = defineProps<{ seasonId: string }>()

const rows = ref<ClanStandingResponse[]>([])
const page = ref(1)
const totalPages = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const { getClanSeasonStandings } = await import('@/api/clans')
    const res = await getClanSeasonStandings(props.seasonId, { page: page.value - 1, size: 20 })
    rows.value = res.content
    totalPages.value = res.totalPages
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the standings.').message
  } finally {
    loading.value = false
  }
}

watch(page, load, { immediate: true })
</script>

<template>
  <div class="standings">
    <p v-if="error" class="standings__error" role="alert">{{ error }}</p>
    <AdminTable :items="rows" :loading="loading" :loading-rows="4" empty-message="No clans ranked yet">
      <template #head>
        <th style="width: 60px">Rank</th>
        <th>Clan</th>
        <th class="right" style="width: 110px">Standing</th>
        <th class="right" style="width: 110px">Base</th>
        <th class="right" style="width: 110px">Earned</th>
      </template>
      <template #default="{ item: row }">
        <td class="mono">#{{ row.rank }}</td>
        <td><span class="standings__clan"><ClanTag :clan="row.clan" size="sm" /> {{ row.clan.name }}</span></td>
        <td class="mono right">{{ formatStanding(row.standing) }}</td>
        <td class="mono right">{{ formatStanding(row.baseStanding) }}</td>
        <td class="mono right">{{ formatSignedStanding(row.earned) }}</td>
      </template>
    </AdminTable>
    <PaginationControls :page="page" :total-pages="totalPages" @update:page="(p: number) => { page = p }" />
  </div>
</template>

<style scoped>
.standings {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.standings__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.standings__clan {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}
</style>
