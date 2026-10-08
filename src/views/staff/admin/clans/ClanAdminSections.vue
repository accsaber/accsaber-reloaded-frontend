<script setup lang="ts">
import AdminTable from '@/components/admin/AdminTable.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type {
  ClanAllianceResponse,
  ClanItemResponse,
  ClanLevelResponse,
  ClanRivalResponse,
  ClanSeasonResponse,
  ClanStandingEventResponse,
  ClanStandingResponse,
  ClanWarResponse,
  ClanXpGrantResponse,
} from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { MissionResponse } from '@/types/api/missions'
import {
  CLAN_ITEM_SOURCE_LABEL,
  CLAN_ROLE_LABEL,
  CLAN_STANDING_SOURCE_LABEL,
  CLAN_XP_SOURCE_LABEL,
  formatSignedStanding,
  formatStanding,
  unlockLines,
  warModeLine,
  warResultFor,
} from '@/utils/clans'
import { formatFullDate, formatRelativeDate } from '@/utils/formatters'
import { computed } from 'vue'

const props = defineProps<{
  clanId: string
  members: PlayerRef[]
  level: ClanLevelResponse
  xp: ClanXpGrantResponse[]
  items: ClanItemResponse[]
  alliances: ClanAllianceResponse[]
  rivals: ClanRivalResponse[]
  missions: MissionResponse[]
  wars: ClanWarResponse[]
  seasons: ClanSeasonResponse[]
  season: string
  standing: ClanStandingResponse | null
  standingEvents: ClanStandingEventResponse[]
  standingLoading: boolean
}>()

const emit = defineEmits<{
  'update:season': [season: string]
}>()

const seasonOptions = computed(() => [
  { value: '', label: 'Current season' },
  ...props.seasons.map((s) => ({ value: s.slug, label: s.name })),
])

const unlocks = computed(() => unlockLines(props.level.unlocked))

function opponent(war: ClanWarResponse) {
  return war.attacker.clan.id === props.clanId ? war.defender.clan : war.attacker.clan
}

function lastSeen(member: PlayerRef): string {
  const m = member.membership
  if (!m) return '-'
  if (m.online) return 'Online'
  return m.lastPlayedAt ? formatRelativeDate(m.lastPlayedAt) : 'Never'
}

function missionProgress(mission: MissionResponse): string {
  if (mission.targetValue === undefined) return '-'
  return `${Math.round(mission.progressValue ?? 0).toLocaleString()} / ${mission.targetValue.toLocaleString()}`
}
</script>

<template>
  <div class="sections">
    <section class="sections__block">
      <h3 class="sections__heading">Members</h3>
      <AdminTable :items="members" empty-message="No members">
        <template #head>
          <th>Player</th>
          <th style="width: 110px">Role</th>
          <th style="width: 130px">Joined</th>
          <th style="width: 120px">Last played</th>
          <th class="right" style="width: 90px">Strength</th>
          <th class="right" style="width: 110px">Season XP</th>
          <th class="right" style="width: 70px">Hits</th>
          <th class="right" style="width: 70px">Breaks</th>
        </template>
        <template #default="{ item: member }">
          <td><UserChip :user="member" link hide-clan /></td>
          <td>{{ member.membership ? CLAN_ROLE_LABEL[member.membership.role] : '-' }}</td>
          <td>{{ member.membership ? formatFullDate(member.membership.joinedAt) : '-' }}</td>
          <td>{{ lastSeen(member) }}</td>
          <td class="mono right">{{ Math.round((member.membership?.strengthShare ?? 0) * 100) }}%</td>
          <td class="mono right">{{ Math.round(member.membership?.seasonPlayXp ?? 0).toLocaleString() }}</td>
          <td class="mono right">{{ member.membership?.seasonHits ?? 0 }}</td>
          <td class="mono right">{{ member.membership?.seasonBreaks ?? 0 }}</td>
        </template>
      </AdminTable>
    </section>

    <section class="sections__block">
      <h3 class="sections__heading">Level and XP</h3>
      <p class="sections__line">
        Level {{ level.progress.level }}, {{ Math.round(level.progress.totalXp).toLocaleString() }} XP total,
        {{ Math.round(level.progress.progressPercent) }}% to the next level.
        <template v-if="level.rosterFactor !== undefined">Roster factor {{ level.rosterFactor.toFixed(2) }}.</template>
      </p>
      <p v-if="unlocks.length" class="sections__line">Unlocked: {{ unlocks.join(', ') }}</p>
      <AdminTable :items="xp" empty-message="No XP yet">
        <template #head>
          <th>Source</th>
          <th class="right" style="width: 100px">Raw</th>
          <th class="right" style="width: 100px">Factor</th>
          <th class="right" style="width: 100px">Granted</th>
          <th style="width: 130px">When</th>
        </template>
        <template #default="{ item: grant }">
          <td>{{ CLAN_XP_SOURCE_LABEL[grant.source] }}</td>
          <td class="mono right">{{ Math.round(grant.rawAmount).toLocaleString() }}</td>
          <td class="mono right">{{ grant.rosterFactor.toFixed(2) }}</td>
          <td class="mono right">{{ Math.round(grant.amount).toLocaleString() }}</td>
          <td>{{ formatRelativeDate(grant.createdAt) }}</td>
        </template>
      </AdminTable>
    </section>

    <section class="sections__block">
      <div class="sections__row">
        <h3 class="sections__heading">Standing</h3>
        <BaseSelect :model-value="season" :options="seasonOptions" @update:model-value="emit('update:season', $event)" />
      </div>
      <p v-if="standingLoading" class="sections__empty">Loading...</p>
      <template v-else>
        <p v-if="standing" class="sections__line">
          Rank #{{ standing.rank }} with {{ formatStanding(standing.standing) }}
          ({{ formatStanding(standing.baseStanding) }} base, {{ formatSignedStanding(standing.earned) }} earned).
        </p>
        <p v-else class="sections__empty">No Standing for this season.</p>
        <AdminTable v-if="standing" :items="standingEvents" empty-message="No Standing events">
          <template #head>
            <th>Source</th>
            <th class="right" style="width: 120px">Amount</th>
            <th style="width: 130px">When</th>
          </template>
          <template #default="{ item: event }">
            <td>{{ CLAN_STANDING_SOURCE_LABEL[event.source] }}</td>
            <td class="mono right">{{ formatSignedStanding(event.amount) }}</td>
            <td>{{ formatRelativeDate(event.createdAt) }}</td>
          </template>
        </AdminTable>
      </template>
    </section>

    <section class="sections__block">
      <h3 class="sections__heading">Wars</h3>
      <AdminTable :items="wars" empty-message="No wars">
        <template #head>
          <th>Against</th>
          <th style="width: 200px">Mode</th>
          <th style="width: 140px">Result</th>
          <th style="width: 130px">Declared</th>
        </template>
        <template #default="{ item: war }">
          <td>
            <RouterLink class="sections__link" :to="{ name: 'clan-war', params: { warId: war.id } }">
              <ClanTag :clan="opponent(war)" size="sm" /> {{ opponent(war).name }}
            </RouterLink>
          </td>
          <td>{{ warModeLine(war) }}</td>
          <td>{{ warResultFor(war, clanId) }}</td>
          <td>{{ formatRelativeDate(war.declaredAt) }}</td>
        </template>
      </AdminTable>
    </section>

    <div class="sections__grid">
      <section class="sections__block">
        <h3 class="sections__heading">Missions</h3>
        <p v-if="!missions.length" class="sections__empty">No missions this week.</p>
        <ul v-else class="sections__list">
          <li v-for="mission in missions" :key="mission.id">
            <span>{{ mission.name }}</span>
            <span class="sections__sub">{{ mission.status ?? '-' }}, {{ missionProgress(mission) }}</span>
          </li>
        </ul>
      </section>

      <section class="sections__block">
        <h3 class="sections__heading">Items</h3>
        <p v-if="!items.length" class="sections__empty">No items.</p>
        <ul v-else class="sections__list">
          <li v-for="owned in items" :key="owned.item.id">
            <span>{{ owned.item.name }}<template v-if="owned.equipped"> (equipped)</template></span>
            <span class="sections__sub">{{ CLAN_ITEM_SOURCE_LABEL[owned.source] }}, {{ formatFullDate(owned.acquiredAt) }}</span>
          </li>
        </ul>
      </section>

      <section class="sections__block">
        <h3 class="sections__heading">Alliances</h3>
        <p v-if="!alliances.length" class="sections__empty">No alliances.</p>
        <ul v-else class="sections__list">
          <li v-for="alliance in alliances" :key="alliance.id">
            <span><ClanTag :clan="alliance.ally" size="sm" /> {{ alliance.ally.name }}</span>
            <span class="sections__sub">
              {{ alliance.status }}<template v-if="alliance.trust">, trust {{ alliance.trust.level }}</template>
            </span>
          </li>
        </ul>
      </section>

      <section class="sections__block">
        <h3 class="sections__heading">Rivals</h3>
        <p v-if="!rivals.length" class="sections__empty">No rivals.</p>
        <ul v-else class="sections__list">
          <li v-for="rival in rivals" :key="rival.clan.id">
            <span><ClanTag :clan="rival.clan" size="sm" /> {{ rival.clan.name }}</span>
            <span class="sections__sub">{{ rival.incoming ? 'They declared' : 'This clan declared' }} {{ formatRelativeDate(rival.since) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.sections__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.sections__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.sections__row :deep(.base-select) {
  width: 200px;
}

.sections__heading {
  margin: 0;
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
}

.sections__line {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.sections__empty {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.sections__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-xl);
}

.sections__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-body);
  color: var(--text-primary);
}

.sections__list li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--bg-overlay);
}

.sections__sub {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-align: right;
}

.sections__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-primary);
  text-decoration: none;
}

.sections__link:hover {
  color: var(--page-accent, var(--accent));
}
</style>
