<script setup lang="ts">
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanRuleset, ClanWarOrdersResponse, ClanWarTargeting } from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import { CLAN_WAR_TARGETING_LABEL } from '@/utils/clans'
import { computed } from 'vue'
import WarHaltBanner from './WarHaltBanner.vue'
import WarOptionTiles from './WarOptionTiles.vue'
import WarSection from './WarSection.vue'

const props = defineProps<{
  orders: ClanWarOrdersResponse
  ruleset: ClanRuleset
  pick: PlayerRef | null
  saving: boolean
  error: string | null
}>()

const emit = defineEmits<{
  targeting: [targeting: ClanWarTargeting]
}>()

const options = computed(() =>
  (Object.keys(CLAN_WAR_TARGETING_LABEL) as ClanWarTargeting[])
    .filter((key) => key !== 'manual' || props.ruleset === 'duel')
    .map((key) => ({ key, label: CLAN_WAR_TARGETING_LABEL[key] })),
)
const following = computed(() => props.orders.targeting === 'follow')
const sentAt = computed(() => (props.orders.order === 'target' ? props.orders.target : null))
</script>

<template>
  <WarSection title="Targeting">
    <WarOptionTiles
      class="war-targeting__tiles"
      :model-value="orders.targeting"
      :options="options"
      label="Targeting"
      :disabled="saving"
      @update:model-value="emit('targeting', $event as ClanWarTargeting)"
    />
    <WarHaltBanner v-if="following && orders.order === 'halt'" :saving="saving" @auto="emit('targeting', 'auto')" />
    <p v-else-if="following && sentAt" class="war-targeting__note">
      Your commanders sent you at <UserChip :user="sentAt" size="xs" compact hide-clan />
    </p>
    <p v-else-if="following" class="war-targeting__note">
      Your commanders haven't given you an order, your plays go auto.
    </p>
    <p v-else-if="orders.targeting === 'auto'" class="war-targeting__note">
      Your plays hit whoever they hurt most. Your commanders' orders don't apply.
    </p>
    <p v-else-if="orders.targeting === 'manual'" class="war-targeting__note">
      <template v-if="pick">Your pick: <UserChip :user="pick" size="xs" compact hide-clan /></template>
      <template v-else>Pick a target in the roster. Until then your plays go auto.</template>
    </p>
    <p v-if="error" class="war-targeting__error" role="alert">{{ error }}</p>
  </WarSection>
</template>

<style scoped>
.war-targeting__tiles {
  max-width: 560px;
}

.war-targeting__note,
.war-targeting__error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.war-targeting__error {
  font-size: var(--text-caption);
  color: var(--error);
}
</style>
