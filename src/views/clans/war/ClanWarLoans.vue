<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type { ClanMemberResponse, ClanWarLoanResponse, ClanWarLoanStatus, ClanWarResponse } from '@/types/api/clans'
import { computed, ref, watch } from 'vue'
import ClanLoanList from '../ClanLoanList.vue'

const PAGE_SIZE = 50

const props = defineProps<{
  war: ClanWarResponse
  viewerId: string | null
  ownClanId: string | null
  canLend: boolean
  alliedSides: ('attacker' | 'defender')[]
  reloadKey: number
}>()

const loans = ref<ClanWarLoanResponse[]>([])
const loading = ref(true)
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)
const lending = ref(false)
const members = ref<ClanMemberResponse[]>([])
const memberId = ref('')
const sideKey = ref<'attacker' | 'defender'>('attacker')

const open = computed(() => props.war.status !== 'ended')
const showLend = computed(() => open.value && props.canLend && props.alliedSides.length > 0)
const sideOptions = computed(() =>
  props.alliedSides.map((role) => ({ value: role, label: `${props.war[role].clan.tag} (${role})` })),
)
const memberOptions = computed(() => members.value.map((m) => ({ value: m.player.id, label: m.player.name })))

function canCancel(loan: ClanWarLoanResponse): boolean {
  return props.canLend && loan.lendingClan.id === props.ownClanId
}

async function fetchLoans() {
  loading.value = true
  error.value = null
  try {
    const { getClanWarLoans } = await import('@/api/clans')
    const [pending, accepted] = await Promise.all([
      getClanWarLoans(props.war.id, { page: 0, size: PAGE_SIZE, status: 'pending' }),
      getClanWarLoans(props.war.id, { page: 0, size: PAGE_SIZE, status: 'accepted' }),
    ])
    loans.value = [...pending.content, ...accepted.content]
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the loans.').message
  } finally {
    loading.value = false
  }
}

async function openLend() {
  lending.value = true
  sideKey.value = props.alliedSides[0] ?? 'attacker'
  memberId.value = ''
  if (members.value.length || !props.ownClanId) return
  try {
    const { getClanMembers } = await import('@/api/clans')
    members.value = (await getClanMembers(props.ownClanId, { page: 0, size: PAGE_SIZE })).content
  } catch {
    members.value = []
  }
}

async function offer() {
  if (!memberId.value) return
  busyId.value = 'offer'
  error.value = null
  try {
    const { offerClanWarLoan } = await import('@/api/clans')
    await offerClanWarLoan(props.war.id, { userId: memberId.value, clanId: props.war[sideKey.value].clan.id })
    lending.value = false
    await fetchLoans()
  } catch (err) {
    error.value = parseApiError(err, 'Could not offer that loan.').message
  } finally {
    busyId.value = null
  }
}

async function resolve(loan: ClanWarLoanResponse, status: ClanWarLoanStatus) {
  busyId.value = loan.id
  error.value = null
  try {
    const { resolveClanWarLoan } = await import('@/api/clans')
    await resolveClanWarLoan(loan.id, { status })
    await fetchLoans()
  } catch (err) {
    error.value = parseApiError(err, 'Could not answer that loan.').message
  } finally {
    busyId.value = null
  }
}

watch([() => props.war.id, () => props.reloadKey], fetchLoans, { immediate: true })
</script>

<template>
  <section class="war-loans">
    <header class="war-loans__head">
      <h2 class="war-loans__title">Loans</h2>
      <BaseButton v-if="showLend && !lending" size="sm" @click="openLend">Lend a player</BaseButton>
    </header>

    <form v-if="lending" class="war-loans__form" @submit.prevent="offer">
      <BaseSelect v-if="sideOptions.length > 1" v-model="sideKey" label="Lend into" :options="sideOptions" />
      <BaseSelect v-model="memberId" label="Player" placeholder="Pick a member" searchable :options="memberOptions" />
      <span class="war-loans__form-actions">
        <BaseButton size="sm" :disabled="busyId === 'offer'" @click="lending = false">Cancel</BaseButton>
        <BaseButton variant="primary" size="sm" :loading="busyId === 'offer'" :disabled="!memberId" @click="offer">
          Offer loan
        </BaseButton>
      </span>
    </form>

    <p v-if="error" class="war-loans__error" role="alert">{{ error }}</p>

    <div v-if="loading && !loans.length" class="war-loans__skeleton">
      <SkeletonLoader v-for="i in 2" :key="i" variant="table-row" />
    </div>
    <p v-else-if="!loans.length" class="war-loans__empty">No players lent into this war.</p>
    <ClanLoanList v-else :loans="loans" :busy-id="busyId" :viewer-id="viewerId" :can-cancel="canCancel" @resolve="resolve" />
  </section>
</template>

<style scoped>
.war-loans {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.war-loans__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.war-loans__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 700;
  color: var(--text-primary);
}

.war-loans__form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.war-loans__form-actions {
  display: flex;
  gap: var(--space-xs);
}

.war-loans__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.war-loans__empty {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-loans__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
