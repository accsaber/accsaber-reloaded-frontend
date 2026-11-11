<script setup lang="ts">
import StatBlock from '@/components/common/StatBlock.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import SkillLevelPanel from '@/views/profile/SkillLevelPanel.vue'
import ProfileApCurveChart from '@/views/profile/ProfileApCurveChart.vue'
import ProfileStatsChart from '@/views/profile/ProfileStatsChart.vue'
import { useAppearance } from '@/composables/useAppearance'
import type {
  SkillResponse,
  UserAllStatisticsResponse,
  UserCategoryStatisticsResponse,
} from '@/types/api/users'
import type { CategoryCode } from '@/types/display'
import { CLAN_ROLE_LABEL } from '@/utils/clans'
import { TIME_RANGE_PARAMS, XP_SOURCES } from '@/utils/constants'
import { dedupeRequest } from '@/utils/dedupe'
import { formatCount, formatFixed, formatFullDate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  userId: string
  category: CategoryCode
  xpStats?: UserAllStatisticsResponse | null
}>()

const { hideReloadedProfileFeatures } = useAppearance()

const clanStats = computed(() => {
  const stats = props.xpStats?.clan
  if (!stats || hideReloadedProfileFeatures.value) return null
  const fought = stats.warsFought + stats.hits + stats.breaksDealt + stats.breaksSuffered > 0
  if (!stats.clan && !fought) return null
  const role = stats.role ? CLAN_ROLE_LABEL[stats.role] : 'Member'
  return {
    clan: stats.clan,
    role: stats.joinedAt ? `${role} since ${formatFullDate(stats.joinedAt)}` : role,
    cells: [
      { label: 'Wars Fought', value: stats.warsFought, decimals: 0 },
      { label: 'Wars Won', value: stats.warsWon, decimals: 0 },
      { label: 'Hits', value: stats.hits, decimals: 0 },
      { label: 'Breaks Dealt', value: stats.breaksDealt, decimals: 0 },
      { label: 'Breaks Suffered', value: stats.breaksSuffered, decimals: 0 },
      { label: 'Standing Moved', value: stats.standingMoved, decimals: 1 },
      { label: 'Contribution', value: stats.contribution, decimals: 1 },
      { label: 'War XP', value: stats.warXp, decimals: 0 },
    ],
  }
})

const allTimeData = ref<UserCategoryStatisticsResponse[]>([])
const skill = ref<SkillResponse | null>(null)
const skillLoading = ref(false)

function bestRank(ranks: number[]): number | null {
  const valid = ranks.filter((r) => r > 0)
  return valid.length ? Math.min(...valid) : null
}

const peakCells = computed(() => {
  const data = allTimeData.value
  if (data.length === 0) return []
  const rank = bestRank(data.map((s) => s.ranking))
  const countryRank = bestRank(data.map((s) => s.countryRanking))
  return [
    { label: 'Global Rank', value: rank != null ? `#${formatCount(rank)}` : '-' },
    { label: 'Country Rank', value: countryRank != null ? `#${formatCount(countryRank)}` : '-' },
    { label: 'AP', value: formatFixed(Math.max(...data.map((s) => s.ap)), 2) },
  ]
})

const xpSources = computed(() => {
  const stats = props.xpStats
  return stats ? XP_SOURCES.map((source) => ({ ...source, value: stats[source.total] })) : []
})

let historyRequest = 0
let skillRequest = 0

async function fetchAllTimeData() {
  const id = ++historyRequest
  const { getUserHistoricStatistics } = await import('@/api/users')
  const data = await dedupeRequest(`stats|${props.userId}|${props.category}|all`, () =>
    getUserHistoricStatistics(props.userId, { category: props.category, ...TIME_RANGE_PARAMS.all }),
  ).catch(() => [])
  if (id === historyRequest) allTimeData.value = data
}

async function fetchSkill() {
  const id = ++skillRequest
  skillLoading.value = true
  const { getUserSkill } = await import('@/api/users')
  const data = await getUserSkill(props.userId).catch(() => null)
  if (id !== skillRequest) return
  skill.value = data
  skillLoading.value = false
}

watch(
  [() => props.userId, () => props.category],
  () => { fetchAllTimeData() },
  { immediate: true },
)

watch(
  () => props.userId,
  () => { fetchSkill() },
  { immediate: true },
)
</script>

<template>
  <div class="statistics-tab">
    <div class="statistics-tab__main">
      <section class="statistics-tab__section">
        <h3 class="section-title">History</h3>
        <ProfileStatsChart :user-id="userId" :category="category" />
      </section>

      <section class="statistics-tab__section">
        <h3 class="section-title">AP Curve</h3>
        <ProfileApCurveChart :user-id="userId" />
      </section>
    </div>

    <div class="statistics-tab__side">
      <section v-if="skill || skillLoading" class="statistics-tab__section">
        <h3 class="section-title">Skill Level</h3>
        <SkillLevelPanel :skill="skill" :loading="skillLoading" />
      </section>

      <section v-if="xpStats" class="statistics-tab__section">
        <h3 class="section-title">{{ formatFixed(xpStats.totalXp, 0) }} XP</h3>
        <div class="xp-bar" role="img" aria-label="XP by source">
          <template v-for="source in xpSources" :key="source.label">
            <span v-if="source.value > 0" class="xp-bar__part"
              :style="{ flexGrow: source.value, background: source.color }" />
          </template>
        </div>
        <dl class="xp-legend">
          <div v-for="source in xpSources" :key="source.label" class="xp-legend__row">
            <dt :style="{ color: source.color }">{{ source.label }}</dt>
            <dd>{{ formatFixed(source.value, 0) }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="peakCells.length" class="statistics-tab__section">
        <h3 class="section-title">Peak</h3>
        <div class="statistics-tab__cells statistics-tab__cells--peak">
          <StatBlock v-for="cell in peakCells" :key="cell.label" :label="cell.label" :value="cell.value" />
        </div>
      </section>
    </div>

    <section v-if="clanStats" class="statistics-tab__section statistics-tab__clan">
      <h3 class="section-title">Clan</h3>
      <div v-if="clanStats.clan" class="clan-record">
        <ClanTag :clan="clanStats.clan" size="lg" effects />
        <span class="clan-record__name">{{ clanStats.clan.name }}</span>
        <span class="caption">{{ clanStats.role }}</span>
      </div>
      <div class="statistics-tab__cells statistics-tab__cells--clan">
        <StatBlock v-for="cell in clanStats.cells" :key="cell.label" :label="cell.label" :value="cell.value"
          :decimals="cell.decimals" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.statistics-tab {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  align-items: start;
  gap: var(--space-2xl);
}

.statistics-tab__main,
.statistics-tab__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
  min-width: 0;
}

.statistics-tab__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.statistics-tab__cells {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

.statistics-tab__cells--peak {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.statistics-tab__clan {
  grid-column: 1 / -1;
}

.statistics-tab__cells--clan {
  grid-template-columns: repeat(8, minmax(0, 1fr));
}

.statistics-tab__cells :deep(.stat-block) {
  padding: 0;
}

.xp-bar {
  display: flex;
  gap: 2px;
  height: var(--space-sm);
  border-radius: var(--radius-xs);
  overflow: hidden;
}

.xp-bar__part {
  flex-basis: 0;
  min-width: 2px;
}

.xp-legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  font-size: var(--text-body);
}

.xp-legend__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
}

.xp-legend dt {
  font-weight: 500;
}

.xp-legend dd {
  margin: 0;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.clan-record {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  font-size: var(--text-card-title);
}

.clan-record__name {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1023px) {
  .statistics-tab {
    grid-template-columns: minmax(0, 1fr);
  }

  .statistics-tab__cells--clan {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 599px) {
  .statistics-tab__cells--clan {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
