<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type {
  ClanWarAidResponse,
  ClanResponse,
  ClanWarAidStatus,
  ClanWarResponse,
  ClanWarTeam,
} from '@/types/api/clans'
import { CLAN_WAR_TEAM_LABEL, WAR_TEAMS, warLeadFallen } from '@/utils/clans'
import { computed, ref, watch } from 'vue'
import ClanAidList from '../ClanAidList.vue'
import ClanPicker from '../ClanPicker.vue'
import WarSection from './WarSection.vue'

const PAGE_SIZE = 50
const ALLY_SIZE = 100

const props = defineProps<{
  war: ClanWarResponse
  ownClanId: string | null
  canAct: boolean
  ownPacifist: boolean
  reloadKey: number
}>()

const emit = defineEmits<{
  war: [war: ClanWarResponse]
}>()

const aids = ref<ClanWarAidResponse[]>([])
const loading = ref(true)
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)
const asking = ref(false)
const leaveOpen = ref(false)
const leaveError = ref<string | null>(null)

const open = computed(() => props.war.status !== 'ended' && props.war.ruleset === 'duel')
const ownSide = computed(() =>
  WAR_TEAMS.flatMap((team) => props.war[team].sides).find((s) => s.clan.id === props.ownClanId && !s.leftAt) ?? null,
)
const isLead = computed(() => !!ownSide.value && props.war[ownSide.value.team].lead.id === props.ownClanId)
const allyIds = ref<Set<string>>(new Set())
const fallenTeams = computed(() => WAR_TEAMS.filter((team) => warLeadFallen(props.war[team])))
const offerTeams = computed(() =>
  WAR_TEAMS.filter((team) => !fallenTeams.value.includes(team) && allyIds.value.has(props.war[team].lead.id)),
)
const canAsk = computed(
  () => open.value && props.canAct && isLead.value && !fallenTeams.value.includes(ownSide.value!.team),
)
const canLeave = computed(() => open.value && props.canAct && !!ownSide.value && !isLead.value)
const mayOffer = computed(
  () => open.value && props.canAct && !!props.ownClanId && !ownSide.value && !props.ownPacifist,
)
const canOffer = computed(() => mayOffer.value && offerTeams.value.length > 0)
const warClanIds = computed(() => WAR_TEAMS.flatMap((team) => props.war[team].sides.map((s) => s.clan.id)))

async function fetchAids() {
  if (!open.value) {
    aids.value = []
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const { getClanWarAid } = await import('@/api/clans')
    aids.value = (await getClanWarAid({ warId: props.war.id, status: 'pending', page: 0, size: PAGE_SIZE })).content
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the requests.').message
  } finally {
    loading.value = false
  }
}

async function run(id: string, action: () => Promise<unknown>, fallback: string) {
  busyId.value = id
  error.value = null
  try {
    await action()
    await fetchAids()
  } catch (err) {
    error.value = parseApiError(err, fallback).message
  } finally {
    busyId.value = null
  }
}

function ask(clan: ClanResponse) {
  return run('ask', async () => {
    const { requestClanWarAid } = await import('@/api/clans')
    await requestClanWarAid(props.war.id, { clanId: clan.clan.id })
    asking.value = false
  }, 'Could not ask that clan.')
}

function offer(team: ClanWarTeam) {
  return run(`offer-${team}`, async () => {
    const { offerClanWarAid } = await import('@/api/clans')
    await offerClanWarAid(props.war.id, { team })
  }, 'Could not send that offer.')
}

function resolve(aid: ClanWarAidResponse, status: ClanWarAidStatus) {
  return run(aid.id, async () => {
    const { resolveClanWarAid } = await import('@/api/clans')
    await resolveClanWarAid(aid.id, { status })
  }, 'Could not answer that.')
}

async function leave() {
  busyId.value = 'leave'
  leaveError.value = null
  try {
    const { updateClanWarSide } = await import('@/api/clans')
    const next = await updateClanWarSide(props.war.id, props.ownClanId!, { left: true })
    leaveOpen.value = false
    emit('war', next)
  } catch (err) {
    leaveError.value = parseApiError(err, 'Could not leave the war.').message
  } finally {
    busyId.value = null
  }
}

async function fetchAllies(clanId: string | null) {
  allyIds.value = new Set()
  if (!clanId) return
  const { getClanAlliances } = await import('@/api/clans')
  const page = await getClanAlliances(clanId, { page: 0, size: ALLY_SIZE }).catch(() => null)
  if (page && clanId === props.ownClanId && mayOffer.value) allyIds.value = new Set(page.content.map((a) => a.ally.id))
}

watch([() => props.war.id, () => props.reloadKey], fetchAids, { immediate: true })
watch(() => (mayOffer.value ? props.ownClanId : null), fetchAllies, { immediate: true })
</script>

<template>
  <WarSection v-if="canAsk || canLeave || canOffer || aids.length" title="Allies" fixed>
    <template #actions>
      <BaseButton v-if="canAsk && !asking" size="sm" @click="asking = true">Ask an ally</BaseButton>
      <template v-if="canOffer">
        <BaseButton
          v-for="team in offerTeams"
          :key="team"
          size="sm"
          :loading="busyId === `offer-${team}`"
          :disabled="!!busyId"
          @click="offer(team)"
        >
          Help {{ CLAN_WAR_TEAM_LABEL[team].toLowerCase() }}
        </BaseButton>
      </template>
      <BaseButton v-if="canLeave" variant="destructive" size="sm" @click="leaveOpen = true">Leave the war</BaseButton>
    </template>

    <div v-if="asking" class="war-aid__form">
      <ClanPicker
        :exclude-ids="warClanIds"
        :disabled="busyId === 'ask'"
        placeholder="Search an ally..."
        @select="ask"
      />
      <BaseButton size="sm" :disabled="busyId === 'ask'" @click="asking = false">Cancel</BaseButton>
    </div>

    <p v-if="error" class="war-aid__error" role="alert">{{ error }}</p>

    <div v-if="loading && !aids.length" class="war-aid__skeleton">
      <SkeletonLoader v-for="i in 2" :key="i" variant="table-row" />
    </div>
    <ClanAidList
      v-else-if="aids.length"
      :aids="aids"
      :busy-id="busyId"
      :own-clan-id="ownClanId"
      :can-act="canAct"
      :fallen-teams="fallenTeams"
      @resolve="resolve"
    />

    <ConfirmModal
      :open="leaveOpen"
      title="Leave the war"
      message="What is left of your stake goes to the other team."
      confirm-label="Leave"
      destructive
      :loading="busyId === 'leave'"
      :error="leaveError"
      @confirm="leave"
      @close="leaveOpen = false"
    />
  </WarSection>
</template>

<style scoped>
.war-aid__form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.war-aid__form > :first-child {
  flex: 1;
  min-width: 220px;
}

.war-aid__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.war-aid__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
