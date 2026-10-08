<script setup lang="ts">
import { ApiError, parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type {
  ClanAllianceResponse,
  ClanItemResponse,
  ClanLevelResponse,
  ClanResponse,
  ClanRivalResponse,
  ClanSeasonResponse,
  ClanStandingEventResponse,
  ClanStandingResponse,
  ClanWarResponse,
  ClanXpGrantResponse,
} from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { MissionResponse } from '@/types/api/missions'
import { formatStanding } from '@/utils/clans'
import { formatFullDate } from '@/utils/formatters'
import { onMounted, ref } from 'vue'
import ClanAdminModerateModal from './ClanAdminModerateModal.vue'
import ClanAdminSections from './ClanAdminSections.vue'

interface DetailData {
  members: PlayerRef[]
  level: ClanLevelResponse
  xp: ClanXpGrantResponse[]
  items: ClanItemResponse[]
  alliances: ClanAllianceResponse[]
  rivals: ClanRivalResponse[]
  missions: MissionResponse[]
  wars: ClanWarResponse[]
  seasons: ClanSeasonResponse[]
}

const props = defineProps<{ clanId: string }>()

const emit = defineEmits<{
  back: []
  disbanded: []
}>()

const clan = ref<ClanResponse | null>(null)
const data = ref<DetailData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const season = ref('')
const standing = ref<ClanStandingResponse | null>(null)
const standingEvents = ref<ClanStandingEventResponse[]>([])
const standingLoading = ref(false)

const moderateOpen = ref(false)
const disbandOpen = ref(false)
const disbandReason = ref('')
const disbandBusy = ref(false)
const disbandError = ref<string | null>(null)

async function orNullOn404<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const api = await import('@/api/clans')
    const id = props.clanId
    const [overview, members, level, xp, items, alliances, rivals, missions, wars, seasons] = await Promise.all([
      api.getClan(id),
      api.getClanMembers(id, { page: 0, size: 100 }),
      api.getClanLevel(id),
      api.getClanXp(id, { page: 0, size: 20 }),
      api.getClanItems(id, { page: 0, size: 100 }),
      api.getClanAlliances(id, { page: 0, size: 50 }),
      api.getClanRivals(id, { page: 0, size: 50 }),
      api.getClanMissions(id, { page: 0, size: 20, current: true }),
      api.getClanWars({ clanId: id, page: 0, size: 20 }),
      api.getClanSeasons({ page: 0, size: 50 }),
      loadStanding(),
    ])
    clan.value = overview
    data.value = {
      members: members.content,
      level,
      xp: xp.content,
      items: items.content,
      alliances: alliances.content,
      rivals: rivals.content,
      missions: missions.content,
      wars: wars.content,
      seasons: seasons.content,
    }
  } catch (err) {
    error.value = parseApiError(err, 'Could not load that clan.').message
  } finally {
    loading.value = false
  }
}

async function loadStanding() {
  standingLoading.value = true
  try {
    const api = await import('@/api/clans')
    const params = { season: season.value || undefined }
    const [current, events] = await Promise.all([
      orNullOn404(api.getClanStanding(props.clanId, params)),
      orNullOn404(api.getClanStandingEvents(props.clanId, { ...params, page: 0, size: 20 })),
    ])
    standing.value = current
    standingEvents.value = events?.content ?? []
  } finally {
    standingLoading.value = false
  }
}

async function setSeason(value: string) {
  season.value = value
  try {
    await loadStanding()
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the Standing.').message
  }
}

function onModerated(saved: ClanResponse) {
  clan.value = saved
  moderateOpen.value = false
}

function openDisband() {
  disbandReason.value = ''
  disbandError.value = null
  disbandOpen.value = true
}

async function disband() {
  if (!clan.value || !disbandReason.value.trim()) return
  disbandBusy.value = true
  disbandError.value = null
  try {
    const { disbandClanByStaff } = await import('@/api/admin/clans')
    await disbandClanByStaff(clan.value.clan.id, disbandReason.value.trim())
    disbandOpen.value = false
    emit('disbanded')
  } catch (err) {
    disbandError.value = parseApiError(err, 'Could not disband that clan.').message
  } finally {
    disbandBusy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="detail">
    <BaseButton size="sm" class="detail__back" @click="emit('back')">Back to clans</BaseButton>

    <p v-if="error" class="detail__error" role="alert">{{ error }}</p>

    <div v-if="loading" class="detail__skeleton">
      <SkeletonLoader variant="avatar" />
      <SkeletonLoader v-for="i in 6" :key="i" variant="table-row" />
    </div>

    <template v-else-if="clan && data">
      <header class="detail__header">
        <div class="detail__identity">
          <ClanIcon :clan="clan.clan" :size="48" />
          <ClanTag :clan="clan.clan" />
          <h2 class="detail__name">{{ clan.clan.name }}</h2>
        </div>
        <div class="detail__actions">
          <BaseButton size="sm" @click="moderateOpen = true">Moderate</BaseButton>
          <BaseButton size="sm" variant="destructive" @click="openDisband">Disband</BaseButton>
        </div>
      </header>

      <dl class="detail__overview">
        <div><dt>Level</dt><dd class="mono">{{ clan.level.level }}</dd></div>
        <div><dt>Members</dt><dd class="mono">{{ clan.memberCount }}/{{ clan.memberCap }}</dd></div>
        <div><dt>Standing</dt><dd class="mono">{{ formatStanding(clan.standing) }}</dd></div>
        <div><dt>Founder</dt><dd><UserChip v-if="clan.founder" :user="clan.founder" link hide-clan /><template v-else>-</template></dd></div>
        <div><dt>Created</dt><dd>{{ formatFullDate(clan.createdAt) }}</dd></div>
        <div><dt>Join requests</dt><dd>{{ clan.acceptingRequests ? 'Open' : 'Closed' }}</dd></div>
        <div class="detail__wide"><dt>Description</dt><dd>{{ clan.description || '-' }}</dd></div>
      </dl>

      <ClanAdminSections
        v-bind="data"
        :clan-id="clan.clan.id"
        :season="season"
        :standing="standing"
        :standing-events="standingEvents"
        :standing-loading="standingLoading"
        @update:season="setSeason"
      />

      <ClanAdminModerateModal :open="moderateOpen" :clan="clan" @close="moderateOpen = false" @saved="onModerated" />

      <ConfirmModal
        :open="disbandOpen"
        :title="`Disband ${clan.clan.name}`"
        message="This ends every membership, alliance, mission and war the clan has. Every member gets a notification with your reason."
        confirm-label="Disband"
        destructive
        :typed-confirmation="clan.clan.tag"
        :disabled="!disbandReason.trim()"
        :loading="disbandBusy"
        :error="disbandError"
        @confirm="disband"
        @close="disbandOpen = false"
      >
        <div class="detail__reason">
          <BaseInput v-model="disbandReason" label="Reason" placeholder="Sent to every member" maxlength="500" />
        </div>
      </ConfirmModal>
    </template>
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.detail__back {
  align-self: flex-start;
}

.detail__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.detail__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.detail__identity {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.detail__name {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.detail__actions {
  display: flex;
  gap: var(--space-xs);
}

.detail__overview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-md);
  margin: 0;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.detail__overview dt {
  font-size: var(--text-caption);
  text-transform: uppercase;
  color: var(--text-secondary);
}

.detail__overview dd {
  margin: 2px 0 0;
  font-size: var(--text-body);
  color: var(--text-primary);
}

.detail__wide {
  grid-column: 1 / -1;
}

.detail__reason {
  margin-bottom: var(--space-md);
}
</style>
