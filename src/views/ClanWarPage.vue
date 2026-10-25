<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useNow } from '@/composables/useNow'
import { usePageMeta } from '@/composables/usePageMeta'
import { useQueryParams } from '@/composables/useQueryParams'
import { prefersReducedMotion } from '@/composables/useReducedMotion'
import { useAuthStore } from '@/stores/auth'
import type {
  ClanWarDetailResponse,
  ClanWarHitResponse,
  ClanWarParticipantResponse,
  ClanWarResponse,
  ClanWarRewardsResponse,
  ClanWarTargeting,
} from '@/types/api/clans'
import {
  hasClanRole,
  isWarRosterOpen,
  OPPOSING_TEAM,
  warAim,
  warLeadFallen,
  warLeadSide,
  warTeamOf,
  warWipe,
} from '@/utils/clans'
import { formatDateTime, formatDuration } from '@/utils/formatters'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useClanFeed } from './clans/useClanFeed'
import { useOwnClan } from './clans/useOwnClan'
import ClanWarAid from './clans/war/ClanWarAid.vue'
import ClanWarFighters from './clans/war/ClanWarFighters.vue'
import ClanWarHits from './clans/war/ClanWarHits.vue'
import ClanWarPool from './clans/war/ClanWarPool.vue'
import ClanWarRewards from './clans/war/ClanWarRewards.vue'
import ClanWarTimeline from './clans/war/ClanWarTimeline.vue'
import { useWarMapBoards } from './clans/war/useWarMapBoards'
import WarPicksModal from './clans/war/WarPicksModal.vue'
import WarScorebug from './clans/war/WarScorebug.vue'
import WarTargetCard from './clans/war/WarTargetCard.vue'
import WarYouCard from './clans/war/WarYouCard.vue'
import { targetValue } from './clans/war/warStrike'

const FIGHTERS_SIZE = 100
const HOUR = 3_600_000

type WarTab = 'log' | 'rewards' | 'allies'

const route = useRoute()
const auth = useAuthStore()
const now = useNow()
const own = useOwnClan(() => true)
const { queryRef } = useQueryParams()
const tabQuery = queryRef<WarTab>('tab')

const warId = computed(() => String(route.params.warId ?? ''))
const detail = ref<ClanWarDetailResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const reloadKey = ref(0)
const lastHit = ref<ClanWarHitResponse | null>(null)
const announcement = ref('')
const participants = ref<ClanWarParticipantResponse[] | null>(null)
const participantsError = ref<string | null>(null)
const rewards = ref<ClanWarRewardsResponse | null>(null)
const rewardsError = ref<string | null>(null)
const previewId = ref<string | null>(null)
const previewHidden = ref(false)
let detailRequest = 0
let rewardsRequest = 0
let participantsRequest = 0
const picking = ref(false)
const pickError = ref<string | null>(null)
const picksOpen = ref(false)
const retreatOpen = ref(false)
const retreating = ref(false)
const retreatError = ref<string | null>(null)

const war = computed(() => detail.value?.war ?? null)
const ended = computed(() => war.value?.status === 'ended')
const rosterOpen = computed(() => !!war.value && isWarRosterOpen(war.value))
const rosterShown = computed(() => rosterOpen.value || ended.value)
const ownClanId = computed(() => own.clan.value?.id ?? null)
const viewer = computed(() => participants.value?.find((p) => p.player.id === auth.userId && !p.leftAt) ?? null)
const viewerTeam = computed(() => (war.value && ownClanId.value ? warTeamOf(war.value, ownClanId.value) : null))
const canOrder = computed(() => !!viewerTeam.value && hasClanRole(own.role.value, 'commander'))
const canAim = computed(() => !!viewer.value && rosterOpen.value && war.value?.ruleset === 'duel')
const aimId = computed(() => (viewer.value ? warAim(viewer.value).target?.id ?? null : null))

const enemies = computed(() => {
  const team = viewerTeam.value
  if (!war.value || !team) return []
  return (participants.value ?? []).filter((p) => !p.leftAt && warTeamOf(war.value!, p.clanId) === OPPOSING_TEAM[team])
})
const bestTarget = computed(() =>
  enemies.value.reduce<ClanWarParticipantResponse | null>(
    (top, p) => (targetValue(p) > (top ? targetValue(top) : 0) ? p : top),
    null,
  ),
)
const focused = computed(() => {
  const id = previewId.value ?? aimId.value
  return enemies.value.find((p) => p.player.id === id) ?? bestTarget.value
})
const focusId = computed(() => (rosterOpen.value && viewer.value ? (focused.value?.player.id ?? null) : null))

const wipe = computed(() => (war.value?.status === 'active' && detail.value ? warWipe(war.value, detail.value.strikeRules) : null))
const wipeIn = computed(() => (wipe.value && wipe.value.at > now.value ? formatDuration(wipe.value.at - now.value) : ''))
const boards = useWarMapBoards(() => warId.value)

const pushMapId = computed(() => {
  let best: string | null = null
  let gap = Number.POSITIVE_INFINITY
  for (const entry of detail.value?.pool ?? []) {
    const mine = entry.viewerScore
    const theirs = entry.targetScore
    if (!mine || !theirs || theirs.score <= mine.score) continue
    if (theirs.accuracy - mine.accuracy < gap) {
      gap = theirs.accuracy - mine.accuracy
      best = entry.difficulty.id
    }
  }
  return best
})

const canSubmitPicks = computed(
  () =>
    war.value?.defend.lead.id === ownClanId.value &&
    war.value.status === 'picking' &&
    !warLeadSide(war.value.defend)?.picksSubmittedAt &&
    hasClanRole(own.role.value, 'officer'),
)
const canRetreat = computed(
  () =>
    war.value?.attack.lead.id === ownClanId.value &&
    war.value.status !== 'ended' &&
    !war.value.retreatAt &&
    (warLeadSide(war.value.attack)?.lead?.id === auth.userId || own.role.value === 'founder'),
)
const attackLeadId = computed(() => war.value?.attack.lead.id ?? null)
const matchup = computed(() => (war.value ? `${war.value.attack.lead.tag} vs ${war.value.defend.lead.tag}` : null))
const breadcrumbs = computed<Crumb[]>(() => [
  { label: 'Clans', to: { name: 'clans' } },
  { label: 'Wars', to: { name: 'clan-wars' } },
  { label: matchup.value ?? 'War' },
])

const tabs = computed(() =>
  [
    war.value?.status === 'active' && { key: 'log', label: 'Battle log' },
    !ended.value && { key: 'rewards', label: 'Rewards' },
    { key: 'allies', label: 'Allies' },
  ].filter((tab): tab is { key: WarTab; label: string } => !!tab),
)
const activeTab = computed<WarTab>({
  get: () => tabs.value.find((t) => t.key === tabQuery.value)?.key ?? tabs.value[0].key,
  set: (key) => (tabQuery.value = key),
})

usePageMeta({
  title: computed(() => (matchup.value ? `${matchup.value} | AccSaber` : 'Clan war | AccSaber')),
  description: 'A clan war on AccSaber.',
})

async function load() {
  const request = ++detailRequest
  loading.value = detail.value === null
  error.value = null
  try {
    const { getClanWar } = await import('@/api/clans')
    const next = await getClanWar(warId.value, { focus: focusId.value ?? undefined })
    if (request === detailRequest) detail.value = next
  } catch {
    if (request !== detailRequest) return
    detail.value = null
    error.value = 'War not found.'
  } finally {
    if (request === detailRequest) loading.value = false
  }
}

async function loadRewards() {
  const request = ++rewardsRequest
  rewardsError.value = null
  try {
    const { getClanWarRewards } = await import('@/api/clans')
    const next = await getClanWarRewards(warId.value)
    if (request === rewardsRequest) rewards.value = next
  } catch (err) {
    if (request === rewardsRequest) rewardsError.value = parseApiError(err, 'Could not load the rewards.').message
  }
}

async function loadParticipants() {
  const request = ++participantsRequest
  participantsError.value = null
  try {
    const { getClanWarParticipants } = await import('@/api/clans')
    const page = await getClanWarParticipants(warId.value, { page: 0, size: FIGHTERS_SIZE })
    if (request === participantsRequest) participants.value = page.content
  } catch (err) {
    if (request !== participantsRequest) return
    participants.value = []
    participantsError.value = parseApiError(err, 'Could not load the fighters.').message
  }
}

function addToTimeline(hit: ClanWarHitResponse, clanId: string) {
  const timeline = detail.value?.timeline
  if (!timeline) return
  const hour = Math.floor(new Date(hit.createdAt).getTime() / HOUR) * HOUR
  const bucket = timeline.find((p) => p.clanId === clanId && new Date(p.at).getTime() === hour)
  if (bucket) {
    bucket.damage += hit.damage
    bucket.hits += 1
    bucket.breaks += hit.broke ? 1 : 0
    bucket.standingMoved += hit.standingMoved
    return
  }
  const breaks = hit.broke ? 1 : 0
  timeline.push({ at: new Date(hour).toISOString(), clanId, damage: hit.damage, hits: 1, breaks, standingMoved: hit.standingMoved })
}

function applyHit(hit: ClanWarHitResponse) {
  lastHit.value = hit
  if (hit.broke) announcement.value = `${hit.attacker.name} broke ${hit.victim.name}`
  const clanId = participants.value?.find((p) => p.player.id === hit.attacker.id)?.clanId
  if (clanId) addToTimeline(hit, clanId)
  void loadParticipants()
}

function applyWar(next: ClanWarResponse) {
  if (!detail.value || next.id !== detail.value.war.id) return
  const statusChanged = next.status !== detail.value.war.status
  detail.value.war = next
  reloadKey.value += 1
  void loadParticipants()
  void load()
  boards.invalidate()
  if (statusChanged) void loadRewards()
}

useClanFeed(attackLeadId, {
  onWar: applyWar,
  onHit: (id, hit) => {
    if (id === warId.value) applyHit(hit)
  },
})

function onPicksSubmitted(next: ClanWarDetailResponse) {
  picksOpen.value = false
  detail.value = next
  reloadKey.value += 1
}

function applyOrders(row: ClanWarParticipantResponse) {
  const fighter = participants.value?.find((p) => p.player.id === row.player.id)
  if (!fighter) return
  fighter.target = row.target
  fighter.orders = row.orders
}

async function setTargeting(targeting: ClanWarTargeting, userId?: string | null) {
  const request = warId.value
  picking.value = true
  pickError.value = null
  try {
    const { chooseClanWarTarget } = await import('@/api/clans')
    const chosen = await chooseClanWarTarget(request, { targeting, userId })
    if (request !== warId.value) return
    applyOrders(chosen)
    previewId.value = null
  } catch (err) {
    pickError.value = parseApiError(err, 'Could not change your targeting.').message
  } finally {
    picking.value = false
  }
}

function togglePreview(userId: string) {
  previewHidden.value = !previewHidden.value && userId === focusId.value
  previewId.value = userId
}

async function pushPbs() {
  if (!pushMapId.value) return
  boards.open(pushMapId.value)
  await nextTick()
  document
    .getElementById(`war-pool-${pushMapId.value}`)
    ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

async function retreat() {
  retreating.value = true
  retreatError.value = null
  try {
    const { updateClanWar } = await import('@/api/clans')
    const done = await updateClanWar(warId.value, { status: 'ended' })
    retreatOpen.value = false
    applyWar(done)
  } catch (err) {
    retreatError.value = parseApiError(err, 'Could not retreat.').message
  } finally {
    retreating.value = false
  }
}

watch(
  warId,
  () => {
    detail.value = null
    lastHit.value = null
    participants.value = null
    previewId.value = null
    rewards.value = null
    boards.reset()
    void load()
    void loadRewards()
  },
  { immediate: true },
)

watch(focusId, (next, prev) => {
  if (next !== prev && detail.value) void load()
})

watch([warId, () => auth.userId], loadParticipants, { immediate: true })
</script>

<template>
  <div class="war-page">
    <Breadcrumbs :crumbs="breadcrumbs" />
    <p class="war-page__live" aria-live="polite">{{ announcement }}</p>

    <template v-if="loading">
      <SkeletonLoader variant="card" height="180px" />
      <SkeletonLoader variant="text" :lines="4" />
    </template>

    <EmptyState v-else-if="error || !war || !detail" :message="error ?? 'War not found.'" />

    <template v-else>
      <WarScorebug :war="war" :now="now" :viewer-team="viewerTeam" hud>
        <template #team="{ team }">
          <span v-if="!ended && warLeadFallen(war[team])" class="war-page__team-line war-page__team-line--danger">
            {{ war[team].lead.name }} has fallen.
          </span>
        </template>
        <template #middle>
          <span v-if="wipe && wipeIn" class="war-page__team-line war-page__team-line--last-stand">
            Wiped! Everyone who was down is back in
            <HintTooltip variant="inline" :text="formatDateTime(wipe.at, true)"><template #trigger>{{ wipeIn }}</template></HintTooltip>
          </span>
          <BaseButton v-if="canRetreat" variant="destructive" size="sm" @click="retreatOpen = true">Retreat</BaseButton>
        </template>
      </WarScorebug>

      <ClanWarPool
        :war="war"
        :pool="detail.pool"
        :rules="detail.strikeRules"
        :viewer="viewer"
        :expanded="boards.expanded.value"
        :boards="boards.boards.value"
        :wipe="wipe"
        :can-submit-picks="canSubmitPicks"
        :signed-in="auth.isLoggedIn"
        @toggle="boards.toggle"
        @submit-picks="picksOpen = true"
      />

      <ClanWarRewards v-if="ended" :war="war" :rewards="rewards" :error="rewardsError" :viewer-id="auth.userId" />

      <template v-if="ended">
        <ClanWarTimeline :war="war" :points="detail.timeline" />
        <ClanWarHits :war="war" :participants="participants" :incoming="lastHit" :now="now" />
      </template>


      <template v-if="rosterOpen && viewer">
        <WarYouCard
          :war="war"
          :viewer="viewer"
          :own-clan="own.clan.value"
          :can-push="!!pushMapId"
          :saving="picking"
          :error="pickError"
          @targeting="setTargeting"
          @push="pushPbs"
        />
      </template>

      <ClanWarFighters
        v-if="rosterShown"
        :war="war"
        :rules="detail.strikeRules"
        :participants="participants"
        :error="participantsError"
        :viewer="ended ? null : viewer"
        :wipe="wipe"
        :focus-id="previewHidden ? null : focusId"
        :best-id="bestTarget?.player.id ?? null"
        :aim-id="aimId"
        :can-aim="canAim"
        :saving="picking"
        :own-clan-id="ownClanId"
        :can-order="canOrder && rosterOpen"
        :last-stand="ended ? undefined : detail.lastStand"
        @focus="togglePreview"
        @aim="setTargeting('manual', $event)"
        @saved="applyOrders"
      >
        <template v-if="rosterOpen && viewer" #detail="{ fighter }">
          <WarTargetCard
            :war="war"
            :rules="detail.strikeRules"
            :fighter="fighter"
            :pool="detail.pool"
            :aimed="fighter.player.id === aimId"
            :can-aim="canAim"
            :saving="picking"
            :viewer="viewer"
            :expanded="boards.expanded.value"
            :boards="boards.boards.value"
            :wipe="wipe"
            :now="now"
            @aim="setTargeting('manual', $event)"
            @toggle="boards.toggle"
          />
        </template>
      </ClanWarFighters>

      <div class="war-page__tabs">
        <BaseTabs v-model="activeTab" :tabs="tabs" label="War details" id-prefix="war" />
        <div :id="`war-panel-${activeTab}`" class="war-page__panel" role="tabpanel" :aria-labelledby="`war-tab-${activeTab}`">
          <template v-if="activeTab === 'log'">
            <ClanWarTimeline :war="war" :points="detail.timeline" />
            <ClanWarHits :war="war" :participants="participants" :incoming="lastHit" :now="now" />
          </template>
          <ClanWarRewards
            v-else-if="activeTab === 'rewards'"
            :war="war"
            :rewards="rewards"
            :error="rewardsError"
            :viewer-id="auth.userId"
          />
          <ClanWarAid
            v-else-if="activeTab === 'allies'"
            :war="war"
            :own-clan-id="ownClanId"
            :can-act="hasClanRole(own.role.value, 'commander')"
            :own-pacifist="own.pacifist.value"
            :reload-key="reloadKey"
            @war="applyWar"
          />
        </div>
      </div>

      <WarPicksModal :open="picksOpen" :war="war" :pool="detail.pool" @close="picksOpen = false" @submitted="onPicksSubmitted" />

      <ConfirmModal
        :open="retreatOpen"
        title="Retreat"
        :message="
          war?.status === 'active'
            ? 'The war ends in 24 hours. Until then your team cannot hit, but the defense can. This cannot be undone.'
            : 'The war ends now. Standing that already moved stays where it went.'
        "
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

.war-page__live {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.war-page__team-line {
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.war-page__team-line--last-stand {
  color: var(--warning);
}

.war-page__team-line--danger {
  color: var(--error);
}

.war-page__tabs {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.war-page__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
</style>
