<script setup lang="ts">
import { parseApiError } from '@/api/client'
import AdminTable from '@/components/admin/AdminTable.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import type { ClanResponse } from '@/types/api/clans'
import { formatStanding } from '@/utils/clans'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const ClanAdminDetail = defineAsyncComponent(() => import('./ClanAdminDetail.vue'))

const PAGE_SIZE = 20

const route = useRoute()
const router = useRouter()

const searchInput = ref('')
const search = useDebouncedRef(searchInput, 300)
const page = ref(1)
const totalPages = ref(0)
const clans = ref<ClanResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const openClanId = computed(() => (typeof route.query.clan === 'string' ? route.query.clan : null))

function setOpenClan(clanId: string | null) {
  const query = { ...route.query }
  delete query.clan
  router.replace({ query: clanId ? { ...query, clan: clanId } : query })
}

async function fetchClans() {
  loading.value = true
  error.value = null
  try {
    const { getClans } = await import('@/api/clans')
    const res = await getClans({ page: page.value - 1, size: PAGE_SIZE, search: search.value.trim() || undefined })
    clans.value = res.content
    totalPages.value = res.totalPages
  } catch (err) {
    error.value = parseApiError(err, 'Could not load clans.').message
  } finally {
    loading.value = false
  }
}

function onDisbanded() {
  setOpenClan(null)
  void fetchClans()
}

watch(search, () => {
  page.value = 1
  void fetchClans()
}, { immediate: true })
watch(page, fetchClans)
</script>

<template>
  <ClanAdminDetail v-if="openClanId" :clan-id="openClanId" @back="setOpenClan(null)" @disbanded="onDisbanded" />
  <div v-else class="browser">
    <div class="browser__header">
      <div>
        <h2 class="browser__title">Clans</h2>
        <p class="browser__meta">Open a clan to see everything about it, moderate it or disband it.</p>
      </div>
      <BaseInput v-model="searchInput" placeholder="Search by name or tag" class="browser__search" />
    </div>

    <p v-if="error" class="browser__error" role="alert">{{ error }}</p>

    <AdminTable :items="clans" :loading="loading" :loading-rows="6" empty-message="No clans match">
      <template #head>
        <th>Clan</th>
        <th class="right" style="width: 80px">Level</th>
        <th class="right" style="width: 100px">Members</th>
        <th class="right" style="width: 120px">Standing</th>
      </template>
      <template #default="{ item: row }">
        <td>
          <button type="button" class="browser__clan" @click="setOpenClan(row.clan.id)">
            <ClanIcon :clan="row.clan" :size="28" />
            <ClanTag :clan="row.clan" size="sm" />
            <span class="browser__name">{{ row.clan.name }}</span>
          </button>
        </td>
        <td class="mono right">{{ row.level.level }}</td>
        <td class="mono right">{{ row.memberCount }}/{{ row.memberCap }}</td>
        <td class="mono right">{{ formatStanding(row.standing) }}</td>
      </template>
    </AdminTable>

    <PaginationControls :page="page" :total-pages="totalPages" @update:page="(p: number) => { page = p }" />
  </div>
</template>

<style scoped>
.browser {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.browser__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.browser__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.browser__meta {
  margin: 2px 0 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.browser__search {
  width: 260px;
}

.browser__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.browser__clan {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0;
  font: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
}

.browser__name {
  font-weight: 600;
  color: var(--text-primary);
}

.browser__clan:hover .browser__name {
  color: var(--page-accent, var(--accent));
}
</style>
