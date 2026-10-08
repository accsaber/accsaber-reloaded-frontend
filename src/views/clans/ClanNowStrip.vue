<script setup lang="ts">
import ClanBar from './ClanBar.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanWarResponse } from '@/types/api/clans'
import type { LevelResponse } from '@/types/api/users'
import { warResultFor } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed } from 'vue'
import WarScorebug from './war/WarScorebug.vue'

const props = defineProps<{
  clanId: string
  war: ClanWarResponse | null
  level: LevelResponse
  now: number
  showLevel: boolean
}>()

const openWar = computed(() => (props.war && props.war.status !== 'ended' ? props.war : null))
const lastWar = computed(() => (props.war?.status === 'ended' ? props.war : null))
const enemy = computed(() => {
  const war = lastWar.value
  if (!war) return null
  return war.attacker.clan.id === props.clanId ? war.defender.clan : war.attacker.clan
})
const progress = computed(() => Math.max(0, Math.min(100, props.level.progressPercent)))
const xpLeft = computed(() => Math.max(0, Math.round(props.level.xpForNextLevel - props.level.xpForCurrentLevel)))
</script>

<template>
  <section v-if="openWar || (lastWar && enemy) || showLevel" class="now-strip" aria-label="What the clan is doing">
    <WarScorebug v-if="openWar" :war="openWar" :now="now" />
    <RouterLink
      v-else-if="lastWar && enemy"
      class="now-strip__last"
      :to="{ name: 'clan-war', params: { warId: lastWar.id } }"
    >
      <span class="now-strip__result">{{ warResultFor(lastWar, clanId) }}</span>
      <span>the last war against</span>
      <ClanTag :clan="enemy" size="sm" />
      <span class="now-strip__when">{{ formatRelativeDate(lastWar.endedAt ?? lastWar.declaredAt, now) }}</span>
    </RouterLink>
    <div v-if="showLevel" class="now-strip__level">
      <span class="now-strip__level-text">
        <strong>{{ xpLeft.toLocaleString() }} XP</strong> to level {{ level.level + 1 }}
      </span>
      <ClanBar class="now-strip__bar" :value="progress" :max="100" />
    </div>
  </section>
</template>

<style scoped>
.now-strip {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.now-strip__last {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-body);
  color: var(--text-secondary);
  text-decoration: none;
}

.now-strip__last:hover .now-strip__result {
  text-decoration: underline;
}

.now-strip__result {
  font-weight: 600;
  color: var(--text-primary);
}

.now-strip__when {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.now-strip__level {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.now-strip__level-text {
  font-size: var(--text-body);
  color: var(--text-secondary);
  white-space: nowrap;
}

.now-strip__level-text strong {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-primary);
}

.now-strip__bar {
  flex: 1;
  max-width: 320px;
}
</style>
