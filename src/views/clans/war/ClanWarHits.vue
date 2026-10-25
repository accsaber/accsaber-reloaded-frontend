<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { buildMapRoute } from '@/utils/mapRoute'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { pickCoverUrl } from '@/utils/media'
import type { ClanWarHitResponse, ClanWarParticipantResponse, ClanWarResponse } from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { formatStanding, WAR_TEAMS, warClan, warSideStyles, warTeamOf } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { useQueryParams } from '@/composables/useQueryParams'
import { computed, ref, watch } from 'vue'
import { formatDamage } from './warStrike'
import WarSection from './WarSection.vue'

const PAGE_SIZE = 50

const props = defineProps<{
  war: ClanWarResponse
  participants: ClanWarParticipantResponse[] | null
  incoming: ClanWarHitResponse | null
  now: number
}>()

type DamageKind = 'hits' | 'chips'

const KIND_TABS = [
  { key: '', label: 'All' },
  { key: 'hits', label: 'Hits' },
  { key: 'chips', label: 'Chips' },
]

const { queryRef } = useQueryParams()
const page = ref(1)
const player = queryRef('fighter')
const damageKind = queryRef<DamageKind>('damage')
const clan = queryRef('clan')
let hitsRequest = 0
const hits = ref<Page<ClanWarHitResponse> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const pending = ref<ClanWarHitResponse[]>([])

const styles = computed(() => warSideStyles(props.war))
const clanOf = computed(() => new Map((props.participants ?? []).map((p) => [p.player.id, warClan(props.war, p.clanId)])))
const playerOptions = computed(() => [
  { value: '', label: 'Every fighter' },
  ...(props.participants ?? []).map((p) => ({ value: p.player.id, label: p.player.name })),
])
const clanOptions = computed(() => [
  { value: '', label: 'Every clan' },
  ...WAR_TEAMS.flatMap((team) => props.war[team].sides).map((side) => ({ value: side.clan.id, label: side.clan.name })),
])
const filtered = computed(() => !!player.value || !!damageKind.value || !!clan.value)

function actingClan(hit: ClanWarHitResponse) {
  return clanOf.value.get(hit.attacker.id) ?? null
}

function rowStyle(hit: ClanWarHitResponse) {
  const clanId = actingClan(hit)?.id
  return styles.value[(clanId && warTeamOf(props.war, clanId)) || 'attack']
}

function breakTitle(hit: ClanWarHitResponse): string | undefined {
  return hit.xpAwarded == null ? undefined : `${Math.round(hit.xpAwarded)} XP`
}

const VERB = { hit: 'hit', chip: 'chipped', break: 'broke' }

function kind(hit: ClanWarHitResponse): keyof typeof VERB {
  if (hit.broke) return 'break'
  return hit.chip ? 'chip' : 'hit'
}

function detail(hit: ClanWarHitResponse): string {
  if (hit.broke) return `−${formatStanding(hit.standingMoved)} Standing, safe until they play or their timer runs out`
  return `${formatDamage(hit.guardAfter)} guard left`
}

function involves(hit: ClanWarHitResponse): boolean {
  if (player.value && hit.attacker.id !== player.value && hit.victim.id !== player.value) return false
  if (damageKind.value && hit.chip !== (damageKind.value === 'chips')) return false
  if (!clan.value) return true
  return [hit.attacker, hit.victim].some((p) => clanOf.value.get(p.id)?.id === clan.value)
}

async function fetchHits() {
  const request = ++hitsRequest
  loading.value = true
  error.value = null
  try {
    const { getClanWarHits } = await import('@/api/clans')
    const next = await getClanWarHits(props.war.id, {
      page: page.value - 1,
      size: PAGE_SIZE,
      userId: player.value || undefined,
      chip: damageKind.value ? damageKind.value === 'chips' : undefined,
      clanId: clan.value || undefined,
    })
    if (request !== hitsRequest) return
    hits.value = next
    pending.value = []
  } catch (err) {
    if (request === hitsRequest) error.value = parseApiError(err, 'Could not load the damage.').message
  } finally {
    if (request === hitsRequest) loading.value = false
  }
}

watch(
  () => props.incoming,
  (hit) => {
    if (!hit || !hits.value || page.value !== 1 || !involves(hit)) return
    if (hits.value.content.some((h) => h.id === hit.id) || pending.value.some((h) => h.id === hit.id)) return
    pending.value.unshift(hit)
  },
)

function showPending() {
  if (!hits.value) return
  hits.value.content = [...pending.value, ...hits.value.content].slice(0, PAGE_SIZE)
  pending.value = []
}

watch([player, damageKind, clan], () => {
  if (page.value === 1) void fetchHits()
  else page.value = 1
})

watch([page, () => props.war.id], fetchHits, { immediate: true })
</script>

<template>
  <WarSection title="Battle log">
    <template #actions>
      <span class="war-hits__filters">
        <BaseTabs v-model="damageKind" :tabs="KIND_TABS" variant="segmented" label="Damage type" />
        <BaseSelect v-model="clan" class="war-hits__filter" :options="clanOptions" placeholder="Every clan" />
        <BaseSelect
          v-if="participants?.length"
          v-model="player"
          class="war-hits__filter"
          :options="playerOptions"
          searchable
          placeholder="Every fighter"
        />
      </span>
    </template>
    <p v-if="error" class="war-hits__error" role="alert">{{ error }}</p>
    <BaseButton v-if="pending.length" class="war-hits__new" size="sm" @click="showPending">
      {{ pending.length }} new {{ pending.length === 1 ? 'hit' : 'hits' }}
    </BaseButton>

    <div v-if="loading && !hits" class="war-hits__list">
      <SkeletonLoader v-for="i in 4" :key="i" variant="table-row" />
    </div>
    <p v-else-if="!hits?.content.length" class="war-hits__empty">{{ filtered ? 'Nothing matches these filters.' : 'No damage yet.' }}</p>
    <ul v-else class="war-hits__list">
      <li
        v-for="hit in hits.content"
        :key="hit.id"
        class="war-hits__row clan-colors"
        :class="`war-hits__row--${kind(hit)}`"
        :style="rowStyle(hit)"
      >
        <span class="war-hits__clan">
          <ClanTag v-if="actingClan(hit)" :clan="actingClan(hit)!" size="sm" />
        </span>
        <span class="war-hits__who">
          <UserChip :user="hit.attacker" size="xs" link tooltip hide-clan />
          <span class="war-hits__verb">{{ VERB[kind(hit)] }}</span>
          <UserChip :user="hit.victim" size="xs" compact link tooltip hide-clan />
          <template v-if="!hit.broke">
            <span class="war-hits__verb">for</span>
            <span class="war-hits__damage">{{ formatDamage(hit.damage) }}</span>
          </template>
        </span>
        <RouterLink class="war-hits__map" :to="buildMapRoute(hit.map)">
          <img class="war-hits__cover" :src="pickCoverUrl(hit.map)" alt="" loading="lazy" decoding="async" />
          <span class="war-hits__song">{{ hit.map.songName }}</span>
          <span v-if="hit.missingScore" class="war-hits__flag">no score</span>
        </RouterLink>
        <span class="war-hits__result" :title="breakTitle(hit)">{{ detail(hit) }}</span>
        <span class="war-hits__when">{{ formatRelativeDate(hit.createdAt, now) }}</span>
      </li>
    </ul>

    <PaginationControls
      v-if="(hits?.totalPages ?? 0) > 1"
      :page="page"
      :total-pages="hits!.totalPages"
      @update:page="page = $event"
    />
  </WarSection>
</template>

<style scoped>
.war-hits__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.war-hits__filter {
  width: 200px;
}

.war-hits__error {
  margin: 0;
  font-size: var(--text-body);
  color: var(--error);
}

.war-hits__empty {
  margin: 0;
  font-size: var(--text-body);
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
  grid-template-columns: 72px minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1.4fr) 8ch;
  gap: var(--space-md);
  align-items: center;
  min-height: 40px;
  padding: var(--space-xs) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
  font-size: var(--text-body);
}

.war-hits__row:last-child {
  border-bottom: none;
}

.war-hits__row:nth-child(even) {
  background: var(--bg-elevated);
}

.war-hits__clan {
  display: flex;
  min-width: 0;
  overflow: hidden;
}

.war-hits__who {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.war-hits__verb {
  flex-shrink: 0;
  color: var(--text-secondary);
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
  border-radius: var(--radius-xs);
}

.war-hits__song {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.war-hits__flag {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.war-hits__damage {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--war-side);
}

.war-hits__result,
.war-hits__when {
  font-family: var(--font-mono);
  text-align: right;
  white-space: nowrap;
  color: var(--text-secondary);
}

.war-hits__result {
  white-space: normal;
}

.war-hits__row--break .war-hits__result {
  font-weight: 600;
  color: var(--war-side);
}

.war-hits__row--chip .war-hits__damage {
  font-weight: 400;
  color: var(--warning);
}

.war-hits__new {
  align-self: flex-start;
}

@media (max-width: 720px) {
  .war-hits__row {
    grid-template-columns: 72px minmax(0, 1fr);
    height: auto;
    padding: var(--space-sm) var(--space-md);
  }

  .war-hits__map,
  .war-hits__when {
    display: none;
  }

  .war-hits__result {
    grid-column: 2;
    text-align: left;
    white-space: normal;
  }

  .war-hits__filter {
    width: 100%;
  }
}
</style>
