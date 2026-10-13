<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type {
  ClanWarAidResponse,
  ClanWarAidStatus,
  ClanWarResponse,
  ClanWarTeam,
  PublicClanResponse,
} from '@/types/api/clans'
import { CLAN_WAR_TEAM_LABEL, WAR_TEAMS, warLeadFallen } from '@/utils/clans'
import { computed, ref, watch } from 'vue'
import ClanAidList from '../ClanAidList.vue'
import ClanPicker from '../ClanPicker.vue'

const PAGE_SIZE = 50

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
const fallenTeams = computed(() => WAR_TEAMS.filter((team) => warLeadFallen(props.war[team])))
const offerTeams = computed(() => WAR_TEAMS.filter((team) => !fallenTeams.value.includes(team)))
const canAsk = computed(
  () => open.value && props.canAct && isLead.value && !fallenTeams.value.includes(ownSide.value!.team),
)
const canLeave = computed(() => open.value && props.canAct && !!ownSide.value && !isLead.value)
const canOffer = computed(
  () =>
    open.value &&
    props.canAct &&
    !!props.ownClanId &&
    !ownSide.value &&
    !props.ownPacifist &&
    offerTeams.value.length > 0,
)
const warClanIds = computed(() => WAR_TEAMS.flatMap((team) => props.war[team].sides.map((s) => s.clan.id)))

async function fetchAids() {
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

function ask(clan: PublicClanResponse) {
  return run('ask', async () => {
    const { requestClanWarAid } = await import('@/api/clans')
    await requestClanWarAid(props.war.id, { clanId: clan.id })
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

watch([() => props.war.id, () => props.reloadKey], fetchAids, { immediate: true })
</script>

<template>
  <section v-if="canAsk || canLeave || canOffer || aids.length" class="war-aid">
    <header class="war-aid__head">
      <h2 class="war-aid__title">Allies</h2>
      <span class="war-aid__actions">
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
      </span>
    </header>

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
  </section>
</template>

<style scoped>
.war-aid {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.war-aid__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.war-aid__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 700;
  color: var(--text-primary);
}

.war-aid__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

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
