<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import RewardAmountTile from '@/components/domain/RewardAmountTile.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanWarResponse, ClanWarRewardsResponse } from '@/types/api/clans'
import { formatClanXp, formatSignedStanding } from '@/utils/clans'
import { computed } from 'vue'
import WarRewardItems from './WarRewardItems.vue'
import WarSection from './WarSection.vue'

const props = defineProps<{
  war: ClanWarResponse
  rewards: ClanWarRewardsResponse | null
  error: string | null
  viewerId: string | null
}>()

const groups = computed(() => {
  const rewards = props.rewards
  if (!rewards) return []
  return rewards.clans.map((row) => ({ ...row, players: rewards.players.filter((p) => p.clan.id === row.clan.id) }))
})
</script>

<template>
  <WarSection v-if="war.status !== 'ended'" title="Winning rewards">
    <p v-if="error" class="war-rewards__error" role="alert">{{ error }}</p>
    <SkeletonLoader v-else-if="!rewards" variant="text" :lines="2" />
    <div v-else class="war-rewards__win">
      <RewardAmountTile v-if="rewards.winStanding" :amount="rewards.winStanding" label="Standing" :size="56" />
      <RewardAmountTile v-if="rewards.winClanXp" :amount="rewards.winClanXp" label="Clan XP" :size="56" />
      <WarRewardItems :items="rewards.pool" reach />
    </div>
  </WarSection>

  <WarSection v-else title="Rewards">
    <p v-if="error" class="war-rewards__error" role="alert">{{ error }}</p>
    <SkeletonLoader v-else-if="!rewards" variant="table-row" />
    <ul v-else class="war-rewards__clans">
      <li v-for="group in groups" :key="group.clan.id">
        <ul class="war-rewards__list">
          <li class="war-rewards__row war-rewards__row--clan">
            <span class="war-rewards__who"><ClanTag :clan="group.clan" size="sm" /></span>
            <span class="war-rewards__xp">
              +{{ formatClanXp(group.clanXp) }} clan XP
              <span
                v-if="Math.round(group.standing)"
                :class="group.standing > 0 ? 'war-rewards__standing--gain' : 'war-rewards__standing--loss'"
              >
                {{ formatSignedStanding(group.standing) }} Standing
              </span>
            </span>
            <WarRewardItems :items="group.items" />
          </li>
          <li
            v-for="row in group.players"
            :key="row.player.id"
            class="war-rewards__row"
            :class="{ 'war-rewards__row--viewer': row.player.id === viewerId }"
          >
            <span class="war-rewards__who">
              <UserChip :user="row.player" size="sm" link tooltip hide-clan />
            </span>
            <span class="war-rewards__xp">+{{ formatClanXp(row.xp) }} XP</span>
            <WarRewardItems :items="row.items" />
          </li>
        </ul>
      </li>
    </ul>
  </WarSection>
</template>

<style scoped>
.war-rewards__win {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md);
}

.war-rewards__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.war-rewards__clans {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin: 0;
  padding: 0;
  list-style: none;
}

.war-rewards__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.war-rewards__row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) 16ch minmax(0, 1fr);
  align-items: center;
  gap: var(--space-md);
  min-height: 48px;
  padding: var(--space-xs) var(--space-md);
}

.war-rewards__row:nth-child(odd) {
  background: var(--bg-elevated);
}

.war-rewards__row--clan {
  border-bottom: 1px solid var(--bg-overlay);
}

.war-rewards__row--viewer {
  box-shadow: inset 0 0 0 1px var(--text-secondary);
  font-weight: 600;
}

.war-rewards__who {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.war-rewards__xp {
  display: flex;
  flex-direction: column;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
}

.war-rewards__standing--gain {
  color: var(--success);
}

.war-rewards__standing--loss {
  color: var(--error);
}

@media (max-width: 640px) {
  .war-rewards__row {
    grid-template-columns: minmax(0, 1fr) auto;
    padding: var(--space-sm) var(--space-md);
  }

  .war-rewards__row > :last-child {
    grid-column: 1 / -1;
  }
}
</style>
