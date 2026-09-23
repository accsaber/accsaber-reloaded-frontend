<script setup lang="ts">
import { parseApiError } from '@/api/client'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { pickCoverUrl } from '@/composables/useAvatarFallback'
import type { ClanWarHitResponse } from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { formatStanding } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { ref, watch } from 'vue'

const PAGE_SIZE = 50
const GUARD_MAX = 100

const props = defineProps<{
  warId: string
  incoming: ClanWarHitResponse | null
  reloadKey: number
  now: number
}>()

const page = ref(1)
const hits = ref<Page<ClanWarHitResponse> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

function breakLine(hit: ClanWarHitResponse): string {
  const moved = `Guard broken, ${formatStanding(hit.standingMoved)} Standing moved`
  return hit.xpAwarded == null ? moved : `${moved}, ${Math.round(hit.xpAwarded)} XP`
}

async function fetchHits() {
  loading.value = true
  error.value = null
  try {
    const { getClanWarHits } = await import('@/api/clans')
    hits.value = await getClanWarHits(props.warId, { page: page.value - 1, size: PAGE_SIZE })
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the hits.').message
  } finally {
    loading.value = false
  }
}

watch(
  () => props.incoming,
  (hit) => {
    if (!hit || !hits.value || page.value !== 1) return
    if (hits.value.content.some((h) => h.id === hit.id)) return
    hits.value.content.unshift(hit)
    if (hits.value.content.length > PAGE_SIZE) hits.value.content.pop()
  },
)

watch([page, () => props.reloadKey, () => props.warId], fetchHits, { immediate: true })
</script>

<template>
  <section class="war-hits">
    <h2 class="war-hits__title">Hits</h2>
    <p v-if="error" class="war-hits__error" role="alert">{{ error }}</p>

    <div v-if="loading && !hits" class="war-hits__list">
      <SkeletonLoader v-for="i in 4" :key="i" variant="table-row" />
    </div>
    <p v-else-if="!hits?.content.length" class="war-hits__empty">No hits yet.</p>
    <ul v-else class="war-hits__list">
      <li v-for="hit in hits.content" :key="hit.id" class="war-hits__row" :class="{ 'war-hits__row--break': hit.broke }">
        <span class="war-hits__line">
          <UserChip :user="hit.attacker" size="xs" compact link />
          <span class="war-hits__verb">{{ hit.broke ? 'broke' : 'hit' }}</span>
          <UserChip :user="hit.victim" size="xs" compact link />
          <span class="war-hits__verb">on</span>
          <RouterLink class="war-hits__map" :to="{ name: 'map-detail', params: { mapId: hit.difficulty.mapId } }">
            <img class="war-hits__cover" :src="pickCoverUrl(hit.difficulty)" alt="" loading="lazy" decoding="async" />
            <span class="war-hits__song">{{ hit.difficulty.songName }}</span>
          </RouterLink>
          <span v-if="hit.missingScore" class="war-hits__flag">no score</span>
        </span>
        <span class="war-hits__numbers">
          <span class="war-hits__damage">-{{ hit.damage.toFixed(1) }}</span>
          <span class="war-hits__guard">guard {{ Math.round(hit.guardAfter) }}/{{ GUARD_MAX }}</span>
          <span class="war-hits__when">{{ formatRelativeDate(hit.createdAt, now) }}</span>
        </span>
        <span v-if="hit.broke" class="war-hits__break">{{ breakLine(hit) }}</span>
      </li>
    </ul>

    <PaginationControls
      v-if="(hits?.totalPages ?? 0) > 1"
      :page="page"
      :total-pages="hits!.totalPages"
      @update:page="page = $event"
    />
  </section>
</template>

<style scoped>
.war-hits {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.war-hits__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 700;
  color: var(--text-primary);
}

.war-hits__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.war-hits__empty {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-hits__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.war-hits__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-xs) var(--space-md);
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.war-hits__row:last-child {
  border-bottom: none;
}

.war-hits__row:nth-child(even) {
  background: var(--bg-elevated);
}

.war-hits__row--break {
  background: color-mix(in srgb, var(--error) 10%, var(--bg-surface));
}

.war-hits__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  font-size: var(--text-body);
}

.war-hits__verb {
  color: var(--text-secondary);
}

.war-hits__map {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  color: var(--text-primary);
  text-decoration: none;
}

.war-hits__map:hover {
  color: var(--page-accent, var(--accent));
}

.war-hits__cover {
  width: 20px;
  height: 20px;
  object-fit: cover;
  border-radius: 2px;
}

.war-hits__song {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.war-hits__flag {
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--warning);
}

.war-hits__numbers {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

.war-hits__damage {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--error);
}

.war-hits__break {
  grid-column: 1 / -1;
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--error);
}

@media (max-width: 640px) {
  .war-hits__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
