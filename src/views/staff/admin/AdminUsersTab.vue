<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LeaderboardResponse } from '@/types/api/users'
import AdminTable from '@/components/admin/AdminTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useCategoryStore } from '@/stores/categories'
import { playerProfileHref } from '@/utils/subdomain'

const categoryStore = useCategoryStore()

const searchInput = ref('')
const search = useDebouncedRef(searchInput, 300)
const page = ref(1)
const size = 50

const users = ref<LeaderboardResponse[]>([])
const totalPages = ref(0)
const totalElements = ref(0)
const loading = ref(false)
const actionLoading = ref<Record<string, boolean>>({})
const bannedSet = ref(new Set<string>())

function getOverallCategoryId(): string | undefined {
  return categoryStore.byCode.get('overall')?.id
}

async function fetchUsers() {
  const categoryId = getOverallCategoryId()
  if (!categoryId) return
  loading.value = true
  try {
    const { getLeaderboard } = await import('@/api/leaderboards')
    const res = await getLeaderboard(categoryId, {
      page: page.value - 1,
      size,
      search: search.value || undefined,
      sort: 'ranking,ASC',
    })
    users.value = res.content
    totalPages.value = res.totalPages
    totalElements.value = res.totalElements
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  page.value = 1
  fetchUsers()
})

watch(page, () => {
  fetchUsers()
})

watch(() => categoryStore.loaded, (loaded) => {
  if (loaded) fetchUsers()
}, { immediate: true })

async function banUser(user: LeaderboardResponse) {
  actionLoading.value[user.userId] = true
  try {
    const { banUser: api } = await import('@/api/admin/users')
    await api(user.userId)
    bannedSet.value.add(user.userId)
  } finally {
    delete actionLoading.value[user.userId]
  }
}

async function unbanUser(user: LeaderboardResponse) {
  actionLoading.value[user.userId] = true
  try {
    const { unbanUser: api } = await import('@/api/admin/users')
    await api(user.userId)
    bannedSet.value.delete(user.userId)
  } finally {
    delete actionLoading.value[user.userId]
  }
}
</script>

<template>
  <div class="tab">
    <div class="tab__header">
      <div>
        <h2 class="tab__title">Users</h2>
        <p class="tab__meta">{{ totalElements.toLocaleString() }} players</p>
      </div>
      <BaseInput v-model="searchInput" placeholder="Search by name…" style="width: 260px" />
    </div>

    <AdminTable :items="users" :loading="loading" :loading-rows="size" empty-message="No users found">
      <template #head>
        <th class="mono right" style="width: 60px">#</th>
        <th style="width: 240px">Player</th>
        <th style="width: 80px">Country</th>
        <th class="mono right" style="width: 100px">AP</th>
        <th class="mono right" style="width: 100px">Avg Acc</th>
        <th class="mono right" style="width: 80px">Plays</th>
        <th class="right">Actions</th>
      </template>
      <template #default="{ item }">
        <td class="mono muted right">{{ item.ranking }}</td>
        <td>
          <div class="player-cell">
            <img :src="item.avatarUrl" class="avatar" :alt="item.userName" loading="lazy" />
            <span>{{ item.userName }}</span>
            <span v-if="bannedSet.has(item.userId)" class="banned-badge">banned</span>
          </div>
        </td>
        <td>
          <div class="country-cell">
            <CountryFlag :country="item.country" />
            <span class="country-code">{{ item.country }}</span>
          </div>
        </td>
        <td class="mono right">{{ item.ap.toFixed(2) }}</td>
        <td class="mono right">{{ (item.averageAcc * 100).toFixed(2) }}%</td>
        <td class="mono right muted">{{ item.rankedPlays }}</td>
        <td class="right tight">
          <div class="actions">
            <BaseButton
              v-if="!bannedSet.has(item.userId)"
              size="sm"
              variant="destructive"
              :loading="actionLoading[item.userId]"
              @click="banUser(item)"
            >
              Ban
            </BaseButton>
            <BaseButton
              v-else
              size="sm"
              :loading="actionLoading[item.userId]"
              @click="unbanUser(item)"
            >
              Unban
            </BaseButton>
            <BaseButton size="sm" :href="playerProfileHref(item.userId)">Profile</BaseButton>
          </div>
        </td>
      </template>
    </AdminTable>

    <PaginationControls :page="page" :total-pages="totalPages" @update:page="(p: number) => { page = p }" />
  </div>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-lg); }

.tab__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.tab__title { font-size: var(--text-section-heading); font-weight: 600; color: var(--text-primary); margin: 0; }
.tab__meta { font-size: var(--text-caption); color: var(--text-secondary); margin: 2px 0 0; }

.player-cell { display: flex; align-items: center; gap: var(--space-sm); }

.avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  flex-shrink: 0;
}

.banned-badge {
  font-size: var(--text-caption);
  font-family: var(--font-mono);
  color: var(--error);
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
  border-radius: var(--radius-pill);
  padding: 1px 6px;
}

.country-cell { display: flex; align-items: center; gap: 6px; }
.country-code { font-size: var(--text-caption); color: var(--text-secondary); }

.actions { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-sm); }
</style>
