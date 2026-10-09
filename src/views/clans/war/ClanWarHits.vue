<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseSelect from '@/components/common/BaseSelect.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { pickCoverUrl } from '@/composables/useAvatarFallback'
import type { ClanWarHitResponse, ClanWarParticipantResponse, ClanWarResponse } from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { formatStanding, warSideStyles } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'

const PAGE_SIZE = 50

const props = defineProps<{
  war: ClanWarResponse
  participants: ClanWarParticipantResponse[] | null
  incoming: ClanWarHitResponse | null
  reloadKey: number
  now: number
}>()

const page = ref(1)
const player = ref('')
const hits = ref<Page<ClanWarHitResponse> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const styles = computed(() => warSideStyles(props.war))
const sideOf = computed(() => new Map((props.participants ?? []).map((p) => [p.player.id, p.clan.id])))
const playerOptions = computed(() => [
  { value: '', label: 'Every fighter' },
  ...(props.participants ?? []).map((p) => ({ value: p.player.id, label: p.player.name })),
])

function rowStyle(hit: ClanWarHitResponse) {
  return sideOf.value.get(hit.attacker.id) === props.war.defender.clan.id ? styles.value.defender : styles.value.attacker
}

function breakTitle(hit: ClanWarHitResponse): string {
  const moved = `Guard broken, ${formatStanding(hit.standingMoved)} Standing moved`
  return hit.xpAwarded == null ? moved : `${moved}, ${Math.round(hit.xpAwarded)} XP`
}

function involves(hit: ClanWarHitResponse): boolean {
  return !player.value || hit.attacker.id === player.value || hit.victim.id === player.value
}

async function fetchHits() {
  loading.value = true
  error.value = null
  try {
    const { getClanWarHits } = await import('@/api/clans')
    hits.value = await getClanWarHits(props.war.id, {
      page: page.value - 1,
      size: PAGE_SIZE,
      userId: player.value || undefined,
    })
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the hits.').message
  } finally {
    loading.value = false
  }
}

watch(
  () => props.incoming,
  (hit) => {
    if (!hit || !hits.value || page.value !== 1 || !involves(hit)) return
    if (hits.value.content.some((h) => h.id === hit.id)) return
    hits.value.content.unshift(hit)
    if (hits.value.content.length > PAGE_SIZE) hits.value.content.pop()
  },
)

watch(player, () => {
  if (page.value === 1) void fetchHits()
  else page.value = 1
})

watch([page, () => props.reloadKey, () => props.war.id], fetchHits, { immediate: true })
</script>

<template>
  <section class="war-hits">
    <header class="war-hits__head">
      <h2 class="war-hits__title">Hits</h2>
      <BaseSelect
        v-if="participants?.length"
        v-model="player"
        class="war-hits__filter"
        :options="playerOptions"
        searchable
        placeholder="Every fighter"
      />
    </header>
    <p v-if="error" class="war-hits__error" role="alert">{{ error }}</p>

    <div v-if="loading && !hits" class="war-hits__list">
      <SkeletonLoader v-for="i in 4" :key="i" variant="table-row" />
    </div>
    <p v-else-if="!hits?.content.length" class="war-hits__empty">{{ player ? 'No hits for this fighter.' : 'No hits yet.' }}</p>
    <ul v-else class="war-hits__list">
      <li
        v-for="hit in hits.content"
        :key="hit.id"
        class="war-hits__row clan-colors"
        :class="{ 'war-hits__row--break': hit.broke }"
        :style="rowStyle(hit)"
      >
        <span class="war-hits__who">
          <UserChip :user="hit.attacker" size="xs" link hide-clan />
          <span class="war-hits__verb">{{ hit.broke ? 'broke' : 'hit' }}</span>
          <UserChip :user="hit.victim" size="xs" compact link hide-clan />
        </span>
        <RouterLink class="war-hits__map" :to="{ name: 'map-detail', params: { mapId: hit.difficulty.mapId } }">
          <img class="war-hits__cover" :src="pickCoverUrl(hit.difficulty)" alt="" loading="lazy" decoding="async" />
          <span class="war-hits__song">{{ hit.difficulty.songName }}</span>
          <span v-if="hit.missingScore" class="war-hits__flag">no score</span>
        </RouterLink>
        <span class="war-hits__damage">-{{ hit.damage.toFixed(1) }}</span>
        <span class="war-hits__result" :title="hit.broke ? breakTitle(hit) : undefined">
          {{ hit.broke ? `${formatStanding(hit.standingMoved)} Standing` : `guard ${Math.round(hit.guardAfter)}` }}
        </span>
        <span class="war-hits__when">{{ formatRelativeDate(hit.createdAt, now) }}</span>
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

.war-hits__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.war-hits__filter {
  width: 220px;
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
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) 7ch 13ch 7ch;
  gap: var(--space-md);
  align-items: center;
  height: 40px;
  padding: 0 var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
  font-size: var(--text-caption);
}

.war-hits__row:last-child {
  border-bottom: none;
}

.war-hits__row:nth-child(even) {
  background: var(--bg-elevated);
}

.war-hits__who {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.war-hits__verb {
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.war-hits__row--break .war-hits__verb {
  font-weight: 600;
  color: var(--war-side);
}

.war-hits__map {
  display: flex;
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
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  object-fit: cover;
  border-radius: 2px;
}

.war-hits__song {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.war-hits__flag {
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.war-hits__damage,
.war-hits__result,
.war-hits__when {
  font-family: var(--font-mono);
  text-align: right;
  white-space: nowrap;
  color: var(--text-secondary);
}

.war-hits__damage {
  font-weight: 600;
  color: var(--war-side);
}

.war-hits__row--break .war-hits__result {
  font-weight: 600;
  color: var(--war-side);
}

.war-hits__when {
  color: var(--text-tertiary);
}

@media (max-width: 720px) {
  .war-hits__row {
    grid-template-columns: minmax(0, 1fr) 7ch 13ch;
    height: auto;
    padding: var(--space-sm) var(--space-md);
  }

  .war-hits__map,
  .war-hits__when {
    display: none;
  }

  .war-hits__filter {
    width: 100%;
  }
}
</style>
