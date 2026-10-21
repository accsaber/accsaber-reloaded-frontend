<script setup lang="ts">
import { parseApiError } from '@/api/client'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useNow } from '@/composables/useNow'
import { useAuthStore } from '@/stores/auth'
import type {
  ClanWarDetailResponse,
  ClanWarHitResponse,
  ClanWarParticipantResponse,
  ClanWarResponse,
  ClanWarRewardsResponse,
  ClanWarStrikeRulesResponse,
} from '@/types/api/clans'
import { hasClanRole, isWarRosterOpen, warLeadSide, warTeamOf } from '@/utils/clans'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import { useClanFeed } from './clans/useClanFeed'
import { useOwnClan } from './clans/useOwnClan'
import ClanWarAid from './clans/war/ClanWarAid.vue'
import ClanWarFighters from './clans/war/ClanWarFighters.vue'
import ClanWarHits from './clans/war/ClanWarHits.vue'
import ClanWarHud from './clans/war/ClanWarHud.vue'
import ClanWarPool from './clans/war/ClanWarPool.vue'
import ClanWarRewards from './clans/war/ClanWarRewards.vue'
import ClanWarTimeline from './clans/war/ClanWarTimeline.vue'
import { hitDamage, hitsToBreak } from './clans/war/warStrike'
import WarPicksModal from './clans/war/WarPicksModal.vue'

const FIGHTERS_SIZE = 100

const route = useRoute()
const auth = useAuthStore()
const now = useNow()
const own = useOwnClan(() => true)

const warId = computed(() => String(route.params.warId ?? ''))
const detail = ref<ClanWarDetailResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const reloadKey = ref(0)
const lastHit = ref<ClanWarHitResponse | null>(null)
const participants = ref<ClanWarParticipantResponse[] | null>(null)
const participantsError = ref<string | null>(null)
const participantsMapId = ref('')
const whatIfMapId = ref('')
const rewards = ref<ClanWarRewardsResponse | null>(null)
const rewardsError = ref<string | null>(null)
let rewardsRequest = 0
let participantsRequest = 0
const picking = ref(false)
const pickError = ref<string | null>(null)
const picksOpen = ref(false)
const retreatOpen = ref(false)
const retreating = ref(false)
const retreatError = ref<string | null>(null)

const war = computed(() => detail.value?.war ?? null)
const fighting = computed(() => war.value?.status === 'active' || war.value?.status === 'ended')
const rosterShown = computed(() => !!war.value && (isWarRosterOpen(war.value) || war.value.status === 'ended'))
const ownClanId = computed(() => own.clan.value?.id ?? null)

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
const viewerTeam = computed(() => (war.value && ownClanId.value ? warTeamOf(war.value, ownClanId.value) : null))
const attackLeadId = computed(() => war.value?.attack.lead.id ?? null)
const matchup = computed(() => (war.value ? `${war.value.attack.lead.tag} vs ${war.value.defend.lead.tag}` : null))
const breadcrumbs = computed<Crumb[]>(() => [
  { label: 'Clans', to: { name: 'clans' } },
  { label: 'Wars', to: { name: 'clan-wars' } },
  { label: matchup.value ?? 'War' },
])

usePageMeta({
  title: computed(() => (matchup.value ? `${matchup.value} | AccSaber` : 'Clan war | AccSaber')),
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
  const mapDifficultyId = whatIfMapId.value
  participantsError.value = null
  try {
    const { getClanWarParticipants } = await import('@/api/clans')
    const page = await getClanWarParticipants(warId.value, {
      page: 0,
      size: FIGHTERS_SIZE,
      mapDifficultyId: mapDifficultyId || undefined,
    })
    if (request !== participantsRequest) return
    participants.value = page.content
    participantsMapId.value = mapDifficultyId
  } catch (err) {
    if (request !== participantsRequest) return
    participants.value = []
    participantsError.value = parseApiError(err, 'Could not load the fighters.').message
  }
}

function trackStrike(victim: ClanWarParticipantResponse, hit: ClanWarHitResponse, rules: ClanWarStrikeRulesResponse) {
  const preview = victim.strikePreview
  if (!preview) return
  if (hit.broke) {
    victim.strikePreview = null
    return
  }
  if (!hit.chip && hit.victimCycle === victim.guardCycle) {
    preview.hitsThisCycle += 1
    preview.damage = hitDamage(rules, preview.hitsThisCycle, preview.disparity)
  }
  preview.hitsToBreak = hitsToBreak(rules, victim.guard, preview.hitsThisCycle, preview.disparity)
  if (!preview.onMap || hit.attacker.id !== auth.userId || hit.difficulty.id !== participantsMapId.value) return
  if (!hit.chip) preview.onMap.hitUsed = true
  if (preview.onMap.targetScore != null) preview.onMap.chipUsed = true
}

function applyHit(hit: ClanWarHitResponse) {
  lastHit.value = hit
  const victim = participants.value?.find((p) => p.player.id === hit.victim.id)
  if (victim) {
    victim.guard = hit.guardAfter
    if (hit.broke) victim.breaksSuffered += 1
    if (detail.value) trackStrike(victim, hit, detail.value.strikeRules)
  }
  const clanId = participants.value?.find((p) => p.player.id === hit.attacker.id)?.clan.id ?? hit.attacker.clan?.id
  if (!clanId) return
  detail.value?.timeline.push({
    at: hit.createdAt,
    clanId,
    damage: hit.damage,
    hits: 1,
    breaks: hit.broke ? 1 : 0,
    standingMoved: hit.standingMoved,
  })
}

function applyWar(next: ClanWarResponse) {
  if (!detail.value || next.id !== detail.value.war.id) return
  const statusChanged = next.status !== detail.value.war.status
  detail.value.war = next
  reloadKey.value += 1
  void loadParticipants()
  if (!statusChanged) return
  void load()
  void loadRewards()
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

async function pickTarget(userId: string | null) {
  picking.value = true
  pickError.value = null
  try {
    const { chooseClanWarTarget } = await import('@/api/clans')
    const chosen = await chooseClanWarTarget(warId.value, { userId })
    const self = participants.value?.find((p) => p.player.id === chosen.player.id)
    if (self) self.target = chosen.target
  } catch (err) {
    pickError.value = parseApiError(err, 'Could not pick that target.').message
  } finally {
    picking.value = false
  }
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
  () => {
    detail.value = null
    lastHit.value = null
    participants.value = null
    whatIfMapId.value = ''
    rewards.value = null
    void load()
    void loadRewards()
  },
  { immediate: true },
)

watch([warId, whatIfMapId, () => auth.userId], loadParticipants, { immediate: true })
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
      <ClanWarHud :war="war" :now="now" :can-retreat="canRetreat" :viewer-team="viewerTeam" @retreat="retreatOpen = true" />

      <ClanWarPool
        :war="war"
        :pool="detail.pool"
        :can-submit-picks="canSubmitPicks"
        :signed-in="auth.isLoggedIn"
        @submit-picks="picksOpen = true"
      />

      <ClanWarRewards :war="war" :rewards="rewards" :error="rewardsError" :viewer-id="auth.userId" />

      <ClanWarFighters
        v-if="rosterShown"
        :war="war"
        :rules="detail.strikeRules"
        :participants="participants"
        :error="participantsError ?? pickError"
        :viewer-id="auth.userId"
        :picking="picking"
        :pool="detail.pool"
        :loaded-map-id="participantsMapId"
        v-model:map-id="whatIfMapId"
        @pick="pickTarget"
      />

      <template v-if="fighting">
        <ClanWarTimeline :war="war" :points="detail.timeline" />
        <ClanWarHits
          :war="war"
          :participants="participants"
          :incoming="lastHit"
          :now="now"
        />
      </template>

      <ClanWarAid
        :war="war"
        :own-clan-id="ownClanId"
        :can-act="hasClanRole(own.role.value, 'commander')"
        :own-pacifist="own.pacifist.value"
        :reload-key="reloadKey"
        @war="applyWar"
      />

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
</style>
