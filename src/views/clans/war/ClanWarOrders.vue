<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type {
  ClanWarOrder,
  ClanWarParticipantResponse,
  ClanWarResponse,
  ClanWarTargeting,
} from '@/types/api/clans'
import { OPPOSING_TEAM, warTeamOf } from '@/utils/clans'
import { computed, ref } from 'vue'
import WarSection from './WarSection.vue'

const TARGETING_NOTE: Record<ClanWarTargeting, string> = {
  follow: 'Following',
  auto: 'Auto, ignoring orders',
  manual: 'Manual, ignoring orders',
}

const props = defineProps<{
  war: ClanWarResponse
  participants: ClanWarParticipantResponse[]
  ownClanId: string
}>()

const emit = defineEmits<{
  saved: [row: ClanWarParticipantResponse]
}>()

const busy = ref<string | null>(null)
const error = ref<string | null>(null)
const choosing = ref<string | null>(null)

const duel = computed(() => props.war.ruleset === 'duel')
const tabs = computed(() => [
  { key: 'auto', label: 'Auto' },
  ...(duel.value ? [{ key: 'target', label: 'Target' }] : []),
  { key: 'halt', label: 'Halt' },
])
const fighters = computed(() => props.participants.filter((p) => p.clan.id === props.ownClanId && !p.leftAt))
const following = computed(() => fighters.value.filter((p) => p.orders?.targeting === 'follow'))
const enemyOptions = computed(() => {
  const team = warTeamOf(props.war, props.ownClanId)
  if (!team) return []
  return props.participants
    .filter((p) => !p.leftAt && warTeamOf(props.war, p.clan.id) === OPPOSING_TEAM[team])
    .map((p) => ({ value: p.player.id, label: p.player.name }))
})

function orderOf(fighter: ClanWarParticipantResponse): string {
  return choosing.value === fighter.player.id ? 'target' : (fighter.orders?.order ?? 'auto')
}

async function give(key: string, userIds: string[], order: ClanWarOrder, targetUserId?: string) {
  busy.value = key
  error.value = null
  try {
    const { giveClanWarOrder } = await import('@/api/clans')
    const rows = await Promise.all(
      userIds.map((userId) => giveClanWarOrder(props.war.id, { userId, order, targetUserId })),
    )
    rows.forEach((row) => emit('saved', row))
    choosing.value = null
  } catch (err) {
    error.value = parseApiError(err, 'Could not give that order.').message
  } finally {
    busy.value = null
  }
}

function setOrder(fighter: ClanWarParticipantResponse, order: string) {
  if (order === 'target') choosing.value = fighter.player.id
  else void give(fighter.player.id, [fighter.player.id], order as ClanWarOrder)
}

function everyone(order: ClanWarOrder) {
  const ids = following.value.filter((p) => p.orders?.order !== order).map((p) => p.player.id)
  if (ids.length) void give(`all-${order}`, ids, order)
}
</script>

<template>
  <WarSection v-if="fighters.length" title="Orders">
    <template #actions>
      <BaseButton size="sm" :loading="busy === 'all-auto'" :disabled="!!busy || !following.length" @click="everyone('auto')">
        Everyone auto
      </BaseButton>
      <BaseButton size="sm" :loading="busy === 'all-halt'" :disabled="!!busy || !following.length" @click="everyone('halt')">Halt everyone</BaseButton>
    </template>
    <p v-if="error" class="war-orders__error" role="alert">{{ error }}</p>
    <ul class="war-orders__list">
      <li v-for="fighter in fighters" :key="fighter.player.id" class="war-orders__row">
        <UserChip :user="fighter.player" size="sm" hide-clan />
        <span
          class="war-orders__mode"
          :class="{ 'war-orders__mode--ignoring': fighter.orders?.targeting !== 'follow' }"
        >
          {{ TARGETING_NOTE[fighter.orders?.targeting ?? 'follow'] }}
        </span>
        <span class="war-orders__control">
          <BaseTabs
            :model-value="orderOf(fighter)"
            :tabs="tabs"
            variant="segmented"
            :label="`Order for ${fighter.player.name}`"
            :disabled-keys="busy ? tabs.map((t) => t.key) : []"
            @update:model-value="setOrder(fighter, $event)"
          />
          <BaseSelect
            v-if="duel && orderOf(fighter) === 'target'"
            :model-value="fighter.orders?.order === 'target' ? (fighter.orders.target?.id ?? '') : ''"
            :options="enemyOptions"
            searchable
            placeholder="Pick an enemy..."
            @update:model-value="give(fighter.player.id, [fighter.player.id], 'target', $event)"
          />
        </span>
      </li>
    </ul>
  </WarSection>
</template>

<style scoped>
.war-orders__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.war-orders__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.war-orders__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-md);
  min-height: 48px;
  padding: var(--space-xs) var(--space-md);
}

.war-orders__row + .war-orders__row {
  border-top: 1px solid var(--bg-overlay);
}

.war-orders__mode {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-orders__mode--ignoring {
  font-weight: 600;
  color: var(--warning);
}

.war-orders__control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.war-orders__control :deep(.base-select) {
  width: 180px;
}

@media (max-width: 768px) {
  .war-orders__row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .war-orders__control {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
</style>
