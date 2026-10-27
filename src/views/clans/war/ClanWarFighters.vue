<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type {
  ClanWarLastStandResponse,
  ClanWarOrder,
  ClanWarParticipantResponse,
  ClanWarResponse,
  ClanWarStrikeRulesResponse,
  ClanWarTeam,
} from '@/types/api/clans'
import type { SortDirection } from '@/types/display'
import { CLAN_WAR_TEAM_LABEL, formatStanding, guardBackAt, OPPOSING_TEAM, WAR_TEAMS, warSideStyles, warTeamOf, type WarWipe } from '@/utils/clans'
import { useNow } from '@/composables/useNow'
import { formatFixed, formatRelativeDate } from '@/utils/formatters'
import { computed, ref } from 'vue'
import WarGuard from './WarGuard.vue'
import WarSection from './WarSection.vue'
import { formatBounty, targetValue } from './warStrike'

type SortKey = 'standing' | 'hits' | 'bounty'

const props = defineProps<{
  war: ClanWarResponse
  rules: ClanWarStrikeRulesResponse
  participants: ClanWarParticipantResponse[] | null
  error: string | null
  viewer: ClanWarParticipantResponse | null
  wipe: WarWipe | null
  focusId: string | null
  aimId: string | null
  canAim: boolean
  saving: boolean
  ownClanId: string | null
  viewerTeam: ClanWarTeam | null
  canOrder: boolean
  bestId: string | null
  lastStand?: Record<ClanWarTeam, ClanWarLastStandResponse>
}>()

const emit = defineEmits<{
  focus: [userId: string]
  aim: [userId: string]
  saved: [row: ClanWarParticipantResponse]
}>()

const ORDER_TABS = computed(() => [
  { key: 'auto', label: 'Auto' },
  ...(props.war.ruleset === 'duel' ? [{ key: 'target', label: 'Target' }] : []),
  { key: 'halt', label: 'Halt' },
])

const now = useNow()
const LATER_TITLE = "What they'll be worth once they're back."

const sorts = ref<Partial<Record<ClanWarTeam, { key: SortKey; direction: SortDirection }>>>({})
const busy = ref<string | null>(null)
const orderError = ref<string | null>(null)
const choosing = ref<string | null>(null)

const styles = computed(() => warSideStyles(props.war))
const order = computed<ClanWarTeam[]>(() => (props.viewerTeam ? [OPPOSING_TEAM[props.viewerTeam], props.viewerTeam] : WAR_TEAMS))

function titleOf(team: ClanWarTeam): string {
  if (!props.viewerTeam) return CLAN_WAR_TEAM_LABEL[team]
  return team === props.viewerTeam ? 'Your team' : 'Enemies'
}

const FIRST_DIRECTION: Record<SortKey, SortDirection> = { standing: 'desc', hits: 'asc', bounty: 'desc' }

function value(fighter: ClanWarParticipantResponse, key: SortKey): number | null {
  if (key === 'bounty') return fighter.bounty
  if (key === 'standing') return standingOf(fighter)
  return fighter.strikePreview?.hitsToBreak ?? null
}

function byValue(key: SortKey, direction: SortDirection) {
  const sign = direction === 'asc' ? 1 : -1
  return (a: ClanWarParticipantResponse, b: ClanWarParticipantResponse) => {
    const x = value(a, key)
    const y = value(b, key)
    if (x === null || y === null) return (x === null ? 1 : 0) - (y === null ? 1 : 0)
    return sign * (x - y)
  }
}

function backAt(fighter: ClanWarParticipantResponse): number {
  return fighter.brokenAt && fighter.reviveAt
    ? guardBackAt(fighter.brokenAt, fighter.reviveAt, props.wipe)
    : Number.POSITIVE_INFINITY
}

function hittable(list: ClanWarParticipantResponse[], team: ClanWarTeam, enemy: boolean): ClanWarParticipantResponse[] {
  const current = sorts.value[team]
  if (current) return list.sort(byValue(current.key, current.direction))
  return enemy ? list.sort((a, b) => targetValue(b) - targetValue(a)) : list
}

function fightersOf(team: ClanWarTeam): ClanWarParticipantResponse[] {
  const list = (props.participants ?? []).filter((p) => warTeamOf(props.war, p.clanId) === team && !p.leftAt)
  const enemy = !!props.viewerTeam && team !== props.viewerTeam
  const broken = list.filter((p) => p.brokenAt).sort((a, b) => backAt(a) - backAt(b))
  return [...hittable(list.filter((p) => !p.brokenAt), team, enemy), ...broken]
}

const commanded = computed(() =>
  props.canOrder ? (props.participants ?? []).filter((p) => p.clanId === props.ownClanId && !p.leftAt) : [],
)
const commanderPick = computed(() =>
  props.viewer?.orders?.order === 'target' ? (props.viewer.orders.target?.id ?? null) : null,
)
const following = computed(() => commanded.value.filter((p) => p.orders?.targeting === 'follow'))

const teams = computed(() =>
  order.value.map((team) => {
    const fighters = fightersOf(team)
    const left = (props.participants ?? [])
      .filter((f) => f.leftAt && warTeamOf(props.war, f.clanId) === team)
      .sort((a, b) => new Date(b.leftAt!).getTime() - new Date(a.leftAt!).getTime())
    const own = team === props.viewerTeam
    const enemy = !!props.viewerTeam && !own
    const strikes = fighters.some((f) => f.strikePreview)
    const standing = fighters.some((f) => standingOf(f) !== null)
    const bounty = fighters.some((f) => formatBounty(f.bounty) !== null)
    const orders = own && commanded.value.length > 0
    const aim = enemy && props.canAim
    return {
      team,
      title: titleOf(team),
      style: styles.value[team],
      fighters,
      groups: props.war[team].sides
        .map((side) => ({ clan: side.clan, fighters: fighters.filter((f) => f.clanId === side.clan.id) }))
        .filter((group) => group.fighters.length),
      left,
      enemy,
      strikes,
      standing,
      bounty,
      orders,
      aim,
      key: props.viewerTeam ? (own ? 'own' : 'enemies') : team,
      lastStand: lastStandLine(team),
      columns: 2 + [standing, strikes, bounty, aim, orders].filter(Boolean).length,
    }
  }),
)

const enemyOptions = computed(() =>
  teams.value
    .filter((t) => t.enemy)
    .flatMap((t) => t.fighters)
    .map((p) => ({ value: p.player.id, label: p.player.name })),
)

function standingOf(fighter: ClanWarParticipantResponse): number | null {
  return fighter.strikePreview?.standingTaken ?? fighter.breakStanding ?? null
}

function lastStandLine(team: ClanWarTeam): string | null {
  const stand = props.lastStand?.[team]
  if (!stand) return null
  const parts = [
    stand.damage < 1 && `hits on them -${Math.round((1 - stand.damage) * 100)}% damage`,
    stand.reviveSpeed > 1 && `back up ${formatFixed(stand.reviveSpeed, 1)}x faster`,
  ].filter(Boolean)
  return parts.length ? `Last stand: ${parts.join(', ')}` : null
}

function toggleSort(team: ClanWarTeam, key: SortKey) {
  const current = sorts.value[team]
  const first = FIRST_DIRECTION[key]
  sorts.value[team] = { key, direction: current?.key === key && current.direction === first ? (first === 'asc' ? 'desc' : 'asc') : first }
}

function ariaSort(team: ClanWarTeam, key: SortKey): 'ascending' | 'descending' | 'none' {
  const current = sorts.value[team]
  if (current?.key !== key) return 'none'
  return current.direction === 'asc' ? 'ascending' : 'descending'
}

function aimable(fighter: ClanWarParticipantResponse): boolean {
  return fighter.guard > 0 && fighter.player.id !== props.aimId
}

function orderable(fighter: ClanWarParticipantResponse): boolean {
  return commanded.value.some((p) => p.player.id === fighter.player.id)
}

function orderOf(fighter: ClanWarParticipantResponse): string {
  return choosing.value === fighter.player.id ? 'target' : (fighter.orders?.order ?? 'auto')
}

async function give(key: string, userIds: string[], next: ClanWarOrder, targetUserId?: string) {
  busy.value = key
  orderError.value = null
  try {
    const { giveClanWarOrder } = await import('@/api/clans')
    const rows = await Promise.all(userIds.map((userId) => giveClanWarOrder(props.war.id, { userId, order: next, targetUserId })))
    rows.forEach((row) => emit('saved', row))
    choosing.value = null
  } catch (err) {
    orderError.value = parseApiError(err, 'Could not give that order.').message
  } finally {
    busy.value = null
  }
}

function setOrder(fighter: ClanWarParticipantResponse, next: string) {
  if (next === 'target') choosing.value = fighter.player.id
  else void give(fighter.player.id, [fighter.player.id], next as ClanWarOrder)
}

function everyone(next: ClanWarOrder) {
  const ids = following.value.filter((p) => p.orders?.order !== next).map((p) => p.player.id)
  if (ids.length) void give(`all-${next}`, ids, next)
}
</script>

<template>
  <section class="roster" aria-label="Fighters">
    <p v-if="error || orderError" class="roster__error" role="alert">{{ error || orderError }}</p>

    <div v-if="!participants" class="roster__sides">
      <div v-for="i in 2" :key="i" class="roster__side">
        <SkeletonLoader v-for="j in 6" :key="j" variant="table-row" />
      </div>
    </div>
    <p v-else-if="!participants.length" class="roster__empty">Nobody enrolled.</p>
    <div v-else class="roster__sides">
      <WarSection
        v-for="t in teams"
        :key="t.team"
        class="roster__side clan-colors"
        :style="t.style"
        :storage-key="`roster-${t.key}`"
      >
        <template #title><span class="roster__title">{{ t.title }}</span></template>
        <template #actions>
          <span v-if="t.lastStand" class="roster__last-stand">{{ t.lastStand }}</span>
          <span v-if="t.orders" class="roster__bulk">
            <BaseButton size="sm" :loading="busy === 'all-auto'" :disabled="!!busy || !following.length" @click="everyone('auto')">
              Everyone auto
            </BaseButton>
            <BaseButton size="sm" :loading="busy === 'all-halt'" :disabled="!!busy || !following.length" @click="everyone('halt')">
              Halt everyone
            </BaseButton>
          </span>
        </template>
        <div class="roster__flush">
        <table class="roster__table">
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">Guard</th>
              <th v-if="t.standing" scope="col" class="roster__num" :aria-sort="ariaSort(t.team, 'standing')">
                <button type="button" class="roster__sort" @click="toggleSort(t.team, 'standing')">Standing</button>
              </th>
              <th v-if="t.bounty" scope="col" class="roster__num" :aria-sort="ariaSort(t.team, 'bounty')">
                <button type="button" class="roster__sort" @click="toggleSort(t.team, 'bounty')">Bounty</button>
              </th>
              <th v-if="t.strikes" scope="col" class="roster__num" :aria-sort="ariaSort(t.team, 'hits')">
                <button type="button" class="roster__sort" @click="toggleSort(t.team, 'hits')">Hits to break</button>
              </th>
              <th v-if="t.aim" scope="col"><span class="roster__sr">Aim</span></th>
              <th v-if="t.orders" scope="col">Orders</th>
            </tr>
          </thead>
          <tbody v-for="group in t.groups" :key="group.clan.id">
            <tr v-if="t.groups.length > 1" class="roster__clan-row">
              <th :colspan="t.columns" scope="colgroup">
                <span class="roster__clan">
                  <ClanTag :clan="group.clan" size="sm" />
                  <ClanName :clan="group.clan" />
                  <span class="roster__tag">{{ group.fighters.length }}</span>
                </span>
              </th>
            </tr>
            <template v-for="fighter in group.fighters" :key="fighter.player.id">
            <tr
              @click="t.enemy && emit('focus', fighter.player.id)"
              :class="{
                'roster__row--focus': fighter.player.id === focusId,
                'roster__row--pickable': t.enemy,
                'roster__row--self': fighter.player.id === viewer?.player.id,
              }"
            >
              <th scope="row" class="roster__who">
                <button
                  v-if="t.enemy"
                  type="button"
                  class="roster__pick"
                  :aria-expanded="fighter.player.id === focusId"
                >
                  <UserChip :user="fighter.player" size="sm" tooltip hide-clan />
                </button>
                <UserChip v-else :user="fighter.player" size="sm" link tooltip hide-clan />
                <span v-if="t.enemy && fighter.player.id === aimId" class="roster__tag roster__tag--aim">aimed</span>
                <span v-else-if="t.enemy && fighter.player.id === bestId" class="roster__tag roster__tag--best">best target</span>
                <span v-if="t.enemy && fighter.player.id === commanderPick" class="roster__tag roster__tag--commander">commander pick</span>
              </th>
              <td class="roster__guard" data-label="Guard"><WarGuard :fighter="fighter" :rules="rules" :wipe="wipe" /></td>
              <td v-if="t.standing" class="roster__num roster__standing" data-label="Standing">
                <template v-if="standingOf(fighter) === null">-</template>
                <HintTooltip v-else-if="fighter.brokenAt" variant="inline" class="roster__later" :text="LATER_TITLE">
                  <template #trigger>{{ formatStanding(standingOf(fighter)!) }}</template>
                </HintTooltip>
                <template v-else>{{ formatStanding(standingOf(fighter)!) }}</template>
              </td>
              <td v-if="t.bounty" class="roster__num" data-label="Bounty" :class="{ 'roster__bounty--down': fighter.bounty < 1 }">
                <HintTooltip v-if="fighter.brokenAt && formatBounty(fighter.bounty)" variant="inline" class="roster__later" :text="LATER_TITLE">
                  <template #trigger>{{ formatBounty(fighter.bounty) }}</template>
                </HintTooltip>
                <template v-else>{{ formatBounty(fighter.bounty) }}</template>
              </td>
              <td v-if="t.strikes" class="roster__num" data-label="Hits to break">
                <template v-if="fighter.brokenAt">-</template>
                <template v-else-if="fighter.strikePreview">{{ fighter.strikePreview.hitsToBreak }}</template>
              </td>
              <td v-if="t.aim" class="roster__num roster__aim">
                <BaseButton v-if="aimable(fighter)" size="sm" :disabled="saving" @click.stop="emit('aim', fighter.player.id)">Aim</BaseButton>
              </td>
              <td v-if="t.orders" class="roster__order-cell">
                <span v-if="orderable(fighter)" class="roster__orders">
                  <BaseTabs
                    :model-value="orderOf(fighter)"
                    :tabs="ORDER_TABS"
                    variant="segmented"
                    :label="`Order for ${fighter.player.name}`"
                    :disabled-keys="busy ? ORDER_TABS.map((tab) => tab.key) : []"
                    @update:model-value="setOrder(fighter, $event)"
                  />
                  <BaseSelect
                    v-if="orderOf(fighter) === 'target'"
                    :model-value="fighter.orders?.order === 'target' ? (fighter.orders.target?.id ?? '') : ''"
                    :options="enemyOptions"
                    searchable
                    placeholder="Pick an enemy..."
                    @update:model-value="give(fighter.player.id, [fighter.player.id], 'target', $event)"
                  />
                </span>
                <span v-else class="roster__tag">Takes orders from their own clan</span>
              </td>
            </tr>
            <tr v-if="t.enemy && fighter.player.id === focusId && $slots.detail" class="roster__detail">
              <td :colspan="t.columns"><slot name="detail" :fighter="fighter" /></td>
            </tr>
            </template>
          </tbody>
        </table>
        <details v-if="t.left.length" class="roster__left">
          <summary class="roster__left-toggle">Left the war ({{ t.left.length }})</summary>
          <ul class="roster__left-list">
            <li v-for="fighter in t.left" :key="fighter.player.id" class="roster__left-row">
              <UserChip :user="fighter.player" size="sm" link tooltip hide-clan />
              <span class="roster__tag">Left {{ formatRelativeDate(fighter.leftAt!, now) }}</span>
            </li>
          </ul>
        </details>
        </div>
      </WarSection>
    </div>
  </section>
</template>

<style scoped>
.roster {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.roster__empty,
.roster__error {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.roster__error {
  color: var(--error);
}

.roster__sides {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.roster__side {
  --clan-bar-fill: var(--war-side);
  min-width: 0;
}

.roster__flush {
  margin: calc(var(--space-lg) - var(--space-sm)) calc(-1 * var(--space-lg)) calc(-1 * var(--space-lg));
  overflow-x: auto;
}

.roster__title {
  color: var(--war-side);
}

.roster__last-stand {
  align-self: center;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--warning);
}

.roster__bulk {
  display: flex;
  gap: var(--space-xs);
  margin-left: auto;
}

.roster__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body);
}

.roster__table th,
.roster__table td {
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  vertical-align: middle;
  border-top: 1px solid var(--bg-overlay);
}

.roster__table thead th {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.roster__table .roster__num {
  font-family: var(--font-mono);
  text-align: right;
}

.roster__sort {
  padding: 0;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

.roster__sort:hover {
  color: var(--text-primary);
}

.roster__sort::after {
  content: ' ↕';
}

[aria-sort='ascending'] .roster__sort::after {
  content: ' ↑';
}

[aria-sort='descending'] .roster__sort::after {
  content: ' ↓';
}

.roster__table .roster__who {
  font-weight: 400;
  white-space: nowrap;
}

.roster__row--pickable {
  cursor: pointer;
}

.roster__row--pickable:hover {
  background: var(--bg-elevated);
}

.roster__pick {
  display: inline-flex;
  padding: 0;
  font: inherit;
  color: inherit;
  vertical-align: middle;
  background: none;
  border: none;
  cursor: pointer;
}

.roster__tag {
  margin-left: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.roster__tag--aim {
  color: var(--war-side);
}

.roster__tag--commander {
  color: var(--warning);
}

.roster__tag--best {
  color: var(--success);
}

.roster__table .roster__detail td > * {
  width: 0;
  min-width: 100%;
}

.roster__table .roster__detail td {
  padding: 0 var(--space-sm) var(--space-sm);
  border-top: none;
  background: color-mix(in srgb, var(--war-side) 10%, transparent);
}

.roster__left {
  border-top: 1px solid var(--bg-overlay);
}

.roster__left-toggle {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-body);
  color: var(--text-secondary);
  cursor: pointer;
}

.roster__left-list {
  margin: 0;
  padding: 0 var(--space-md) var(--space-sm);
  list-style: none;
}

.roster__left-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 40px;
}

.roster__table .roster__clan-row th {
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
}

.roster__clan {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 600;
}

.roster__later {
  color: var(--text-secondary);
}

.roster__bounty--down {
  color: var(--text-secondary);
}

.roster__standing {
  color: var(--tier-gold);
}

.roster__row--self {
  background: var(--bg-elevated);
}

.roster__row--focus {
  background: color-mix(in srgb, var(--war-side) 10%, transparent);
}

.roster__orders {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.roster__orders :deep(.base-select) {
  width: 180px;
}

.roster__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 600px) {
  .roster__table thead {
    display: none;
  }

  .roster__table,
  .roster__table tbody {
    display: block;
  }

  .roster__table tr {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-xs) var(--space-md);
    padding: var(--space-sm) var(--space-md);
    border-top: 1px solid var(--bg-overlay);
  }

  .roster__table th,
  .roster__table td {
    display: block;
    min-width: 0;
    padding: 0;
    border-top: none;
  }

  .roster__table .roster__clan-row th,
  .roster__table .roster__who,
  .roster__table .roster__guard,
  .roster__table .roster__order-cell,
  .roster__table .roster__detail td {
    flex-basis: 100%;
  }

  .roster__table td[data-label]:not(.roster__guard)::before {
    content: attr(data-label);
    display: block;
    font-family: var(--font-sans);
    font-size: var(--text-caption);
    color: var(--text-secondary);
  }

  .roster__table .roster__num {
    text-align: left;
  }

  .roster__table .roster__aim {
    margin-left: auto;
  }

  .roster__table .roster__who {
    white-space: normal;
  }

  .roster__table tr.roster__detail {
    padding: 0 var(--space-xs) var(--space-xs);
    border-top: none;
  }
}
</style>
