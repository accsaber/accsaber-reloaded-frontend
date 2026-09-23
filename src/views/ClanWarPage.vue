<script setup lang="ts">
import { parseApiError } from '@/api/client'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSharedNow } from '@/composables/useSharedNow'
import { useAuthStore } from '@/stores/auth'
import type { ClanWarDetailResponse, ClanWarHitResponse, ClanWarResponse } from '@/types/api/clans'
import { hasClanRole } from '@/utils/clans'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import { useClanFeed } from './clans/useClanFeed'
import { useOwnClan } from './clans/useOwnClan'
import ClanWarHeader from './clans/war/ClanWarHeader.vue'
import ClanWarHits from './clans/war/ClanWarHits.vue'
import ClanWarLoans from './clans/war/ClanWarLoans.vue'
import ClanWarPool from './clans/war/ClanWarPool.vue'
import ClanWarRoster from './clans/war/ClanWarRoster.vue'
import WarPicksModal from './clans/war/WarPicksModal.vue'

const ALLIANCE_SIZE = 50

const route = useRoute()
const auth = useAuthStore()
const now = useSharedNow()
const own = useOwnClan()

const warId = computed(() => String(route.params.warId ?? ''))
const detail = ref<ClanWarDetailResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const reloadKey = ref(0)
const lastHit = ref<ClanWarHitResponse | null>(null)
const alliedSides = ref<('attacker' | 'defender')[]>([])
const picksOpen = ref(false)
const retreatOpen = ref(false)
const retreating = ref(false)
const retreatError = ref<string | null>(null)

const war = computed(() => detail.value?.war ?? null)
const viewerSide = computed<'attacker' | 'defender' | null>(() => {
  const ownId = own.clan.value?.id
  if (!ownId || !war.value) return null
  if (war.value.attacker.clan.id === ownId) return 'attacker'
  if (war.value.defender.clan.id === ownId) return 'defender'
  return null
})
const canSubmitPicks = computed(
  () =>
    viewerSide.value === 'defender' &&
    war.value?.status === 'picking' &&
    !war.value.defender.picksSubmittedAt &&
    hasClanRole(own.role.value, 'officer'),
)
const canRetreat = computed(
  () =>
    viewerSide.value === 'attacker' &&
    war.value?.status !== 'ended' &&
    (war.value?.attacker.lead?.id === auth.userId || own.role.value === 'founder'),
)
const canLend = computed(() => viewerSide.value === null && !!own.clan.value && hasClanRole(own.role.value, 'commander'))
const attackerClanId = computed(() => war.value?.attacker.clan.id ?? null)
const breadcrumbs = computed<Crumb[]>(() => [
  { label: 'Clans', to: { name: 'clans' } },
  { label: 'Wars', to: { name: 'clan-wars' } },
  { label: war.value ? `${war.value.attacker.clan.tag} vs ${war.value.defender.clan.tag}` : 'War' },
])

usePageMeta({
  title: computed(() =>
    war.value ? `${war.value.attacker.clan.tag} vs ${war.value.defender.clan.tag} | AccSaber` : 'Clan war | AccSaber',
  ),
  description: 'A clan war on AccSaber.',
})

async function load() {
  loading.value = detail.value === null
  error.value = null
  try {
    const { getClanWar } = await import('@/api/clans')
    detail.value = await getClanWar(warId.value)
  } catch {
    detail.value = null
    error.value = 'War not found.'
  } finally {
    loading.value = false
  }
}

async function loadAlliedSides() {
  const ownId = own.clan.value?.id
  if (!ownId || !war.value || viewerSide.value !== null) {
    alliedSides.value = []
    return
  }
  try {
    const { getClanAlliances } = await import('@/api/clans')
    const allies = (await getClanAlliances(ownId, { page: 0, size: ALLIANCE_SIZE })).content
      .filter((a) => a.status === 'active')
      .map((a) => a.ally.id)
    alliedSides.value = (['attacker', 'defender'] as const).filter((role) => allies.includes(war.value![role].clan.id))
  } catch {
    alliedSides.value = []
  }
}

function applyWar(next: ClanWarResponse) {
  if (!detail.value || next.id !== detail.value.war.id) return
  const statusChanged = next.status !== detail.value.war.status
  detail.value.war = next
  if (statusChanged) {
    reloadKey.value += 1
    void load()
  }
}

useClanFeed(attackerClanId, {
  onWar: applyWar,
  onHit: (id, hit) => {
    if (id === warId.value) lastHit.value = hit
  },
})

function onPicksSubmitted(next: ClanWarDetailResponse) {
  picksOpen.value = false
  detail.value = next
  reloadKey.value += 1
}

async function retreat() {
  retreating.value = true
  retreatError.value = null
  try {
    const { updateClanWar } = await import('@/api/clans')
    const ended = await updateClanWar(warId.value, { status: 'ended' })
    retreatOpen.value = false
    applyWar(ended)
  } catch (err) {
    retreatError.value = parseApiError(err, 'Could not retreat.').message
  } finally {
    retreating.value = false
  }
}

watch(
  warId,
  async () => {
    detail.value = null
    lastHit.value = null
    await Promise.all([load(), own.load()])
    await loadAlliedSides()
  },
  { immediate: true },
)

watch(() => auth.userId, () => own.load().then(loadAlliedSides))
</script>

<template>
  <div class="war-page">
    <Breadcrumbs :crumbs="breadcrumbs" />
    <template v-if="loading">
      <SkeletonLoader variant="card" height="220px" />
      <SkeletonLoader variant="text" :lines="4" />
    </template>

    <EmptyState v-else-if="error || !war || !detail" :message="error ?? 'War not found.'" />

    <template v-else>
      <ClanWarHeader :war="war" :now="now" :can-retreat="canRetreat" @retreat="retreatOpen = true" />

      <ClanWarPool
        :war="war"
        :pool="detail.pool"
        :viewer-side="viewerSide"
        :can-submit-picks="canSubmitPicks"
        :signed-in="auth.isLoggedIn"
        @submit-picks="picksOpen = true"
      />

      <ClanWarRoster :war="war" :last-hit="lastHit" :reload-key="reloadKey" />

      <ClanWarHits :war-id="war.id" :incoming="lastHit" :reload-key="reloadKey" :now="now" />

      <ClanWarLoans
        :war="war"
        :viewer-id="auth.userId"
        :own-clan-id="own.clan.value?.id ?? null"
        :can-lend="canLend"
        :allied-sides="alliedSides"
        :reload-key="reloadKey"
      />

      <WarPicksModal :open="picksOpen" :war="war" @close="picksOpen = false" @submitted="onPicksSubmitted" />

      <ConfirmModal
        :open="retreatOpen"
        title="Retreat"
        message="The war ends now. Standing that already moved stays where it went."
        confirm-label="Retreat"
        destructive
        :loading="retreating"
        :error="retreatError"
        @confirm="retreat"
        @close="retreatOpen = false"
      />
    </template>
  </div>
</template>

<style scoped>
.war-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding-top: var(--space-md);
}
</style>
