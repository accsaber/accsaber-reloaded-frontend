<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanAuditEntryResponse, ClanResponse } from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { auditDetailLines, CLAN_AUDIT_LABEL } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const PAGE_SIZE = 50

const props = defineProps<{ clan: ClanResponse }>()

const route = useRoute()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: PAGE_SIZE,
  secondarySort: null,
})

const pageData = ref<Page<ClanAuditEntryResponse> | null>(null)
const loading = ref(true)

const entries = computed(() => pageData.value?.content ?? [])
const totalPages = computed(() => pageData.value?.totalPages ?? 0)

async function fetchAudit() {
  loading.value = true
  try {
    const { getClanAudit } = await import('@/api/clans')
    pageData.value = await getClanAudit(props.clan.clan.id, { page: paginationParams.value.page, size: PAGE_SIZE })
  } catch {
    pageData.value = null
  } finally {
    loading.value = false
  }
}

watch(() => route.query.page, fetchAudit, { immediate: true })
</script>

<template>
  <section class="audit">
    <div v-if="loading" class="audit__skeleton">
      <SkeletonLoader v-for="i in 6" :key="i" variant="table-row" />
    </div>

    <EmptyState v-else-if="entries.length === 0" message="Nothing logged yet." />

    <ol v-else class="audit__list">
      <li v-for="entry in entries" :key="entry.id" class="audit__row">
        <span class="audit__action">{{ CLAN_AUDIT_LABEL[entry.action] }}</span>
        <span class="audit__people">
          <UserChip v-if="entry.actor" :user="entry.actor" size="sm" link />
          <span v-else class="audit__staff">Staff</span>
          <template v-if="entry.target">
            <svg class="audit__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
            <UserChip :user="entry.target" size="sm" link />
          </template>
        </span>
        <span class="audit__details">
          <span v-for="line in auditDetailLines(entry)" :key="line">{{ line }}</span>
        </span>
        <time class="audit__when" :datetime="entry.createdAt">{{ formatRelativeDate(entry.createdAt) }}</time>
      </li>
    </ol>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
  </section>
</template>

<style scoped>
.audit {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.audit__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.audit__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.audit__row {
  display: grid;
  grid-template-columns: 180px minmax(0, 1.2fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-md);
  min-height: 48px;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.audit__row:last-child {
  border-bottom: none;
}

.audit__row:nth-child(even) {
  background: var(--bg-elevated);
}

.audit__action {
  font-weight: 600;
  color: var(--text-primary);
}

.audit__people {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.audit__arrow {
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.audit__staff {
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.audit__details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.audit__when {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

@media (max-width: 767px) {
  .audit__row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .audit__people,
  .audit__details {
    grid-column: 1 / -1;
  }
}
</style>
