<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useSharedNow } from '@/composables/useSharedNow'
import type { ClanMemberResponse, ClanResponse, ClanRole } from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { CLAN_ROLE_ORDER, CLAN_ROLE_PLURAL } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{ clan: ClanResponse }>()

const route = useRoute()
const now = useSharedNow()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'joinedAt',
  defaultOrder: 'asc',
  defaultSize: 50,
  secondarySort: null,
})

const pageData = ref<Page<ClanMemberResponse> | null>(null)
const loading = ref(true)

interface RoleGroup {
  role: ClanRole
  label: string
  members: ClanMemberResponse[]
}

const groups = computed<RoleGroup[]>(() => {
  const content = pageData.value?.content ?? []
  return CLAN_ROLE_ORDER.map((role) => ({
    role,
    label: CLAN_ROLE_PLURAL[role],
    members: content.filter((m) => m.role === role),
  })).filter((g) => g.members.length > 0)
})

const totalPages = computed(() => pageData.value?.totalPages ?? 0)

function lastPlayed(member: ClanMemberResponse): string {
  return member.lastPlayedAt ? `played ${formatRelativeDate(member.lastPlayedAt, now.value)}` : 'no plays yet'
}

async function fetchMembers() {
  loading.value = true
  try {
    const { getClanMembers } = await import('@/api/clans')
    pageData.value = await getClanMembers(props.clan.clan.id, { page: paginationParams.value.page, size: 50 })
  } catch {
    pageData.value = null
  } finally {
    loading.value = false
  }
}

watch(() => route.query.page, fetchMembers, { immediate: true })
</script>

<template>
  <section class="roster">
    <div v-if="loading" class="roster__skeleton">
      <SkeletonLoader v-for="i in 8" :key="i" variant="table-row" />
    </div>

    <EmptyState v-else-if="groups.length === 0" message="Nobody is in this clan yet." />

    <template v-else>
      <div v-for="group in groups" :key="group.role" class="roster__group">
        <h2 class="roster__heading">
          {{ group.label }}
          <span v-if="group.role !== 'founder'" class="roster__count">{{ group.members.length }}</span>
        </h2>
        <ul class="roster__list">
          <li v-for="member in group.members" :key="member.player.id" class="roster__row">
            <span
              class="roster__presence"
              :class="{ 'roster__presence--online': member.online }"
              :title="member.online ? 'Online' : 'Offline'"
              role="img"
              :aria-label="member.online ? 'Online' : 'Offline'"
            />
            <UserChip :user="member.player" link tooltip class="roster__player" />
            <span class="roster__played">{{ lastPlayed(member) }}</span>
          </li>
        </ul>
      </div>

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
    </template>
  </section>
</template>

<style scoped>
.roster {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.roster__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.roster__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.roster__heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin: 0;
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid var(--bg-overlay);
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.roster__count {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--text-tertiary);
}

.roster__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.roster__row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-md);
  min-height: 48px;
  padding: 0 var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.roster__row:nth-child(even) {
  background: var(--bg-elevated);
}

.roster__presence {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.roster__presence--online {
  background: var(--success);
}

.roster__played {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
