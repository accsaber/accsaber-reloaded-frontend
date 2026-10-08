<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSharedNow } from '@/composables/useSharedNow'
import { useAuthStore } from '@/stores/auth'
import type { ClanLevelStepResponse, ClanRole, ClanWarDetailResponse, ClanWarResponse, UpdateClanRequest } from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { Tab } from '@/types/display'
import { CLAN_ROLE_LABEL, clanColorVars, hasClanRole, lockedRankSlots } from '@/utils/clans'
import { isUuid } from '@/utils/mapRoute'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import ClanEditModal from './clans/ClanEditModal.vue'
import ClanHeader from './clans/ClanHeader.vue'
import ClanHeaderActions from './clans/ClanHeaderActions.vue'
import ClanNowStrip from './clans/ClanNowStrip.vue'
import ClanRosterTab from './clans/ClanRosterTab.vue'
import { loadClanLevels } from './clans/clanLevels'
import { useClanChat } from './clans/useClanChat'
import { useClanFeed } from './clans/useClanFeed'
import { useClanPage } from './clans/useClanPage'
import { useCurrentClanSeason } from './clans/useCurrentClanSeason'

type ClanTab =
  | 'roster'
  | 'chat'
  | 'wars'
  | 'missions'
  | 'diplomacy'
  | 'level'
  | 'standing'
  | 'cosmetics'
  | 'requests'
  | 'audit'

const ClanLevelTab = defineAsyncComponent(() => import('./clans/ClanLevelTab.vue'))
const ClanStandingTab = defineAsyncComponent(() => import('./clans/ClanStandingTab.vue'))
const ClanCosmeticsTab = defineAsyncComponent(() => import('./clans/ClanCosmeticsTab.vue'))
const ClanRequestsTab = defineAsyncComponent(() => import('./clans/ClanRequestsTab.vue'))
const ClanAuditTab = defineAsyncComponent(() => import('./clans/ClanAuditTab.vue'))
const ClanChatTab = defineAsyncComponent(() => import('./clans/ClanChatTab.vue'))
const ClanDiplomacyTab = defineAsyncComponent(() => import('./clans/ClanDiplomacyTab.vue'))
const ClanMissionsTab = defineAsyncComponent(() => import('./clans/ClanMissionsTab.vue'))
const ClanWarsTab = defineAsyncComponent(() => import('./clans/ClanWarsTab.vue'))
const DeclareWarModal = defineAsyncComponent(() => import('./clans/war/DeclareWarModal.vue'))

interface PendingConfirm {
  title: string
  message: string
  confirmLabel: string
  destructive: boolean
  typedConfirmation?: string
  blocked?: boolean
  run: () => Promise<void>
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const slugOrId = computed(() => String(route.params.slugOrId ?? ''))

const {
  clan,
  standing,
  members,
  loading,
  rosterLoading,
  error,
  viewerRole,
  viewerClanId,
  ownRole,
  setOnline,
  pendingRequest,
  load,
  reset,
  refreshViewer,
} = useClanPage(slugOrId)

const TAB_ACCENT = 'var(--clan-accent)'

const tabs = computed<Tab[]>(() => {
  const list: Tab[] = [{ key: 'roster', label: 'Roster', accentColor: TAB_ACCENT }]
  if (viewerRole.value) list.push({ key: 'chat', label: 'Chat', accentColor: TAB_ACCENT })
  list.push(
    { key: 'wars', label: 'Wars', accentColor: TAB_ACCENT },
    { key: 'level', label: 'Level', accentColor: TAB_ACCENT },
    { key: 'standing', label: 'Standing', accentColor: TAB_ACCENT },
    { key: 'missions', label: 'Missions', accentColor: TAB_ACCENT },
    { key: 'diplomacy', label: 'Diplomacy', accentColor: TAB_ACCENT },
  )
  return list
})

const manageTabs = computed<Tab[]>(() => {
  if (!viewerRole.value) return []
  const list: Tab[] = [{ key: 'cosmetics', label: 'Cosmetics' }]
  if (hasClanRole(viewerRole.value, 'officer')) list.push({ key: 'requests', label: 'Requests' })
  list.push({ key: 'audit', label: 'Audit' })
  return list
})

const activeTab = computed<ClanTab>(() => {
  const requested = route.query.tab
  return [...tabs.value, ...manageTabs.value].some((t) => t.key === requested) ? (requested as ClanTab) : 'roster'
})
const levelSteps = ref<ClanLevelStepResponse[]>([])
const lockedSlots = computed(() => (clan.value ? lockedRankSlots(levelSteps.value, clan.value.level.level) : []))

watch(
  () => activeTab.value === 'roster',
  async (onRoster) => {
    if (!onRoster || levelSteps.value.length) return
    try {
      levelSteps.value = await loadClanLevels()
    } catch {
      levelSteps.value = []
    }
  },
  { immediate: true },
)

const activeManage = computed(() => manageTabs.value.find((t) => t.key === activeTab.value) ?? null)
const manageOpen = ref(false)

function pickManage(tab: string) {
  manageOpen.value = false
  setTab(tab)
}

const isFounder = computed(() => hasClanRole(viewerRole.value, 'founder'))
const breadcrumbs = computed<Crumb[]>(() => [
  { label: 'Clans', to: { name: 'clans' } },
  { label: clan.value?.clan.name ?? 'Clan' },
])
const viewerInOtherClan = computed(() => !!viewerClanId.value && viewerClanId.value !== clan.value?.clan.id)

const chatClanId = computed(() => clan.value?.clan.id ?? null)
const isMember = computed(() => viewerRole.value !== null)
const { chat, notices, status: chatStatus } = useClanChat(chatClanId, isMember, {
  onPresence: setOnline,
  onRejected: () => {
    void Promise.all([reload(), refreshViewer()])
  },
})

const now = useSharedNow()
const latestWar = ref<ClanWarResponse | null>(null)
const recentWar = ref<ClanWarResponse | null>(null)
useClanFeed(chatClanId, {
  onWar: (war) => {
    latestWar.value = war
    recentWar.value = war
  },
})

async function loadRecentWar(clanId: string | null) {
  recentWar.value = null
  if (!clanId) return
  try {
    const { getClanWars } = await import('@/api/clans')
    recentWar.value = (await getClanWars({ clanId, page: 0, size: 1 })).content[0] ?? null
  } catch {
    recentWar.value = null
  }
}

watch(chatClanId, loadRecentWar, { immediate: true })

const declareOpen = ref(false)
const { running: seasonRunning } = useCurrentClanSeason()

function onDeclared(detail: ClanWarDetailResponse) {
  declareOpen.value = false
  router.push({ name: 'clan-war', params: { warId: detail.war.id } })
}

const busy = ref(false)
const actionError = ref<string | null>(null)
const actionNotice = ref<string | null>(null)
const confirm = ref<PendingConfirm | null>(null)
const confirmError = ref<string | null>(null)
const editOpen = ref(false)
const editError = ref<string | null>(null)
const editFieldErrors = ref<Record<string, string>>({})

usePageMeta({
  title: computed(() => (clan.value ? `[${clan.value.clan.tag}] ${clan.value.clan.name} | AccSaber` : 'Clan | AccSaber')),
  description: computed(() => clan.value?.description ?? 'An AccSaber clan.'),
})

function setTab(tab: string) {
  router.replace({ query: { tab } })
}

async function reload() {
  const fetched = await load()
  if (!fetched) {
    await router.push({ name: 'clans' })
    return
  }
  if (fetched.clan.slug !== slugOrId.value) {
    await router.replace({ params: { slugOrId: fetched.clan.slug }, query: route.query })
  }
}

async function runAction(action: () => Promise<void>, fallback: string) {
  busy.value = true
  actionError.value = null
  actionNotice.value = null
  try {
    await action()
  } catch (err) {
    actionError.value = parseApiError(err, fallback).message
  } finally {
    busy.value = false
  }
}

function requestJoin() {
  return runAction(async () => {
    const { createClanJoinRequest } = await import('@/api/clans')
    await createClanJoinRequest(clan.value!.clan.id, {})
    await refreshViewer()
  }, 'Could not send the request.')
}

function resolveRequest(status: 'accepted' | 'declined' | 'cancelled') {
  const request = pendingRequest.value
  if (!request) return
  return runAction(async () => {
    const { resolveClanJoinRequest } = await import('@/api/clans')
    await resolveClanJoinRequest(request.id, { status })
    await refreshViewer()
    if (status === 'accepted') await reload()
  }, 'Could not answer that.')
}

function ask(pending: PendingConfirm) {
  confirmError.value = null
  confirm.value = pending
}

async function runConfirm() {
  const pending = confirm.value
  if (!pending) return
  busy.value = true
  confirmError.value = null
  try {
    await pending.run()
    confirm.value = null
  } catch (err) {
    confirmError.value = parseApiError(err, 'That did not go through.').message
  } finally {
    busy.value = false
  }
}

function askLeave() {
  const id = clan.value!.clan.id
  const others = members.value.length > 1
  const founderBlocked = isFounder.value && others
  ask({
    title: 'Leave clan',
    message: founderBlocked
      ? 'A Founder cannot walk out while anyone else is still in the clan, so hand it to another member first.'
      : others
        ? 'You can join another clan 14 days after you joined this one.'
        : 'You are the last member, so leaving shuts the clan down for good.',
    confirmLabel: 'Leave clan',
    destructive: true,
    blocked: founderBlocked,
    run: async () => {
      const { removeClanMember } = await import('@/api/clans')
      await removeClanMember(id, auth.userId!)
      await refreshViewer()
      await reload()
    },
  })
}

function askDisband() {
  const target = clan.value!.clan
  ask({
    title: 'Disband clan',
    message: 'The clan, its roster and its Standing are gone for good, and every member is left clanless.',
    confirmLabel: 'Disband',
    destructive: true,
    typedConfirmation: target.tag,
    run: async () => {
      const { disbandClan } = await import('@/api/clans')
      await disbandClan(target.id)
      await refreshViewer()
      await router.push({ name: 'clans' })
    },
  })
}

function askKick(member: PlayerRef) {
  const id = clan.value!.clan.id
  ask({
    title: `Kick ${member.name}`,
    message: `${member.name} is out of the clan right away, and their join cooldown is cleared because it was not their call.`,
    confirmLabel: 'Kick',
    destructive: true,
    run: async () => {
      const { removeClanMember } = await import('@/api/clans')
      await removeClanMember(id, member.id)
      await reload()
    },
  })
}

function askTransfer(member: PlayerRef) {
  const id = clan.value!.clan.id
  ask({
    title: 'Transfer founder',
    message: `${member.name} becomes Founder and you give up the rank, so only they can hand it back.`,
    confirmLabel: 'Transfer',
    destructive: true,
    run: async () => {
      const { transferClanFounder } = await import('@/api/clans')
      await transferClanFounder(id, { userId: member.id })
      await reload()
    },
  })
}

function actAsOwnClan(action: 'ally' | 'rival') {
  const ownClanId = viewerClanId.value
  const target = clan.value!.clan
  if (!ownClanId) return
  return runAction(
    async () => {
      const api = await import('@/api/clans')
      if (action === 'ally') await api.proposeClanAlliance(ownClanId, { clanId: target.id })
      else await api.declareClanRival(ownClanId, { clanId: target.id })
      actionNotice.value = action === 'ally' ? `Alliance proposed to ${target.name}.` : `${target.name} is now a rival.`
    },
    action === 'ally' ? 'Could not propose that alliance.' : 'Could not call that rival.',
  )
}

function changeRole(member: PlayerRef, role: ClanRole) {
  const id = clan.value!.clan.id
  return runAction(async () => {
    const { updateClanMember } = await import('@/api/clans')
    await updateClanMember(id, member.id, { role })
    await reload()
  }, `Could not make ${member.name} ${CLAN_ROLE_LABEL[role].toLowerCase()}.`)
}

function claimClan() {
  const id = clan.value!.clan.id
  return runAction(async () => {
    const { transferClanFounder } = await import('@/api/clans')
    await transferClanFounder(id, { userId: auth.userId! })
    await reload()
  }, 'Could not claim the clan.')
}

async function saveProfile(request: UpdateClanRequest) {
  busy.value = true
  editError.value = null
  editFieldErrors.value = {}
  try {
    const { updateClan } = await import('@/api/clans')
    await updateClan(clan.value!.clan.id, request)
    editOpen.value = false
    await reload()
  } catch (err) {
    const parsed = parseApiError(err, 'Could not save the clan.')
    const errors: Record<string, string> = {}
    for (const fe of parsed.fieldErrors) errors[fe.field] = fe.message
    editFieldErrors.value = errors
    if (parsed.fieldErrors.length === 0) editError.value = parsed.message
  } finally {
    busy.value = false
  }
}

async function uploadIcon(file: File) {
  const { uploadClanIcon } = await import('@/api/cdn')
  clan.value = await uploadClanIcon(clan.value!.clan.id, file)
}

async function removeIcon() {
  const { deleteClanIcon } = await import('@/api/cdn')
  clan.value = await deleteClanIcon(clan.value!.clan.id)
}

async function onMembershipChanged() {
  await Promise.all([reload(), refreshViewer()])
}

watch(
  slugOrId,
  async (key) => {
    if (!key) return
    if (clan.value && (key === clan.value.clan.slug || key === clan.value.clan.id)) return
    reset()
    const fetched = await load()
    if (fetched && isUuid(key) && fetched.clan.slug) {
      await router.replace({ params: { slugOrId: fetched.clan.slug }, query: route.query })
    }
  },
  { immediate: true },
)

watch(() => auth.isLoggedIn, () => { if (clan.value) void load() })
</script>

<template>
  <div class="clan-page clan-colors" :style="clan ? clanColorVars(clan.clan) : undefined">
    <template v-if="loading">
      <SkeletonLoader variant="card" height="260px" />
      <SkeletonLoader variant="text" :lines="4" />
    </template>

    <EmptyState v-else-if="error || !clan" :message="error ?? 'Clan not found.'" />

    <template v-else>
      <ClanHeader :clan="clan" :standing="standing">
        <template #top>
          <Breadcrumbs :crumbs="breadcrumbs" />
        </template>
        <template #actions>
          <ClanHeaderActions
            :signed-in="auth.isLoggedIn"
            :viewer-role="viewerRole"
            :own-role="ownRole"
            :viewer-in-other-clan="viewerInOtherClan"
            :accepting-requests="clan.acceptingRequests"
            :pending-request="pendingRequest"
            :busy="busy"
            :season-running="seasonRunning"
            :error="actionError"
            @request="requestJoin"
            @resolve="resolveRequest"
            @edit="editOpen = true"
            @leave="askLeave"
            @disband="askDisband"
            @propose-alliance="actAsOwnClan('ally')"
            @call-rival="actAsOwnClan('rival')"
            @declare-war="declareOpen = true"
          />
          <p v-if="actionNotice" class="clan-page__notice" role="status">{{ actionNotice }}</p>
        </template>
      </ClanHeader>

      <ClanNowStrip :clan-id="clan.clan.id" :war="recentWar" :level="clan.level" :now="now" :show-level="activeTab !== 'level'" />

      <div class="clan-page__tabs">
        <BaseTabs :tabs="tabs" :model-value="activeTab" @update:model-value="setTab" />
        <BaseDropdown
          v-if="manageTabs.length"
          :open="manageOpen"
          position="bottom-right"
          @update:open="manageOpen = $event"
        >
          <template #trigger>
            <button
              type="button"
              class="clan-page__manage"
              :class="{ 'clan-page__manage--active': activeManage }"
              :aria-expanded="manageOpen"
            >
              {{ activeManage?.label ?? 'Manage' }}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </template>
          <div class="clan-page__manage-menu" role="menu">
            <button
              v-for="tab in manageTabs"
              :key="tab.key"
              type="button"
              class="clan-page__manage-item"
              role="menuitem"
              @click="pickManage(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
        </BaseDropdown>
      </div>

      <ClanRosterTab
        v-if="activeTab === 'roster'"
        :members="members"
        :locked-slots="lockedSlots"
        :loading="rosterLoading && members.length === 0"
        :viewer-role="viewerRole"
        :viewer-id="auth.userId"
        @change-role="changeRole"
        @kick="askKick"
        @transfer="askTransfer"
        @claim="claimClan"
      />
      <ClanChatTab v-else-if="activeTab === 'chat'" :chat="chat" :notices="notices" :status="chatStatus" />
      <ClanWarsTab v-else-if="activeTab === 'wars'" :clan="clan" :viewer-role="viewerRole" :latest-war="latestWar" :season-running="seasonRunning" />
      <ClanMissionsTab v-else-if="activeTab === 'missions'" :clan="clan" :is-member="isMember" />
      <ClanDiplomacyTab v-else-if="activeTab === 'diplomacy'" :clan="clan" :viewer-role="viewerRole" />
      <ClanLevelTab v-else-if="activeTab === 'level'" :clan="clan" />
      <ClanStandingTab v-else-if="activeTab === 'standing'" :clan="clan" />
      <ClanCosmeticsTab
        v-else-if="activeTab === 'cosmetics'"
        :clan="clan"
        :can-customize="isFounder"
        @changed="reload"
      />
      <ClanRequestsTab v-else-if="activeTab === 'requests'" :clan="clan" @changed="onMembershipChanged" />
      <ClanAuditTab v-else-if="activeTab === 'audit'" :clan="clan" />

      <DeclareWarModal
        v-if="viewerClanId && viewerInOtherClan"
        :open="declareOpen"
        :own-clan-id="viewerClanId"
        :preselected="clan.clan"
        @close="declareOpen = false"
        @declared="onDeclared"
      />

      <ClanEditModal
        :open="editOpen"
        :clan="clan"
        :saving="busy"
        :error="editError"
        :field-errors="editFieldErrors"
        :upload-icon="uploadIcon"
        :remove-icon="removeIcon"
        @save="saveProfile"
        @close="editOpen = false"
      />

      <ConfirmModal
        :open="confirm !== null"
        :title="confirm?.title ?? ''"
        :message="confirm?.message ?? ''"
        :confirm-label="confirm?.confirmLabel ?? ''"
        :destructive="confirm?.destructive"
        :typed-confirmation="confirm?.typedConfirmation"
        :blocked="confirm?.blocked"
        :loading="busy"
        :error="confirmError"
        @confirm="runConfirm"
        @close="confirm = null"
      />
    </template>
  </div>
</template>

<style scoped>
.clan-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

.clan-page__tabs {
  display: flex;
  align-items: flex-end;
  border-bottom: 1px solid var(--bg-overlay);
}

.clan-page__tabs :deep(.base-tabs) {
  flex: 1;
  flex-wrap: nowrap;
  min-width: 0;
  overflow-x: auto;
  border-bottom: none;
  scrollbar-width: none;
}

.clan-page__tabs :deep(.base-tabs__tab) {
  white-space: nowrap;
}

.clan-page__manage {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  font: inherit;
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}

.clan-page__manage:hover {
  color: var(--text-primary);
}

.clan-page__manage--active {
  font-weight: 600;
  color: var(--clan-accent);
}

.clan-page__manage--active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 3px;
  background: var(--clan-accent);
}

.clan-page__manage-menu {
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: var(--space-xs);
}

.clan-page__manage-item {
  padding: var(--space-sm) var(--space-md);
  font: inherit;
  font-size: var(--text-body);
  text-align: left;
  color: var(--text-primary);
  background: transparent;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.clan-page__manage-item:hover {
  background: var(--bg-overlay);
}

.clan-page__notice {
  margin: var(--space-xs) 0 0;
  font-size: var(--text-caption);
  text-align: right;
  color: var(--text-secondary);
}
</style>
