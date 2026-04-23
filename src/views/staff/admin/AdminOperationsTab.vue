<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import { useCategoryStore } from '@/stores/categories'

const categoryStore = useCategoryStore()

interface OpState { loading: boolean; result: string | null; ok: boolean }
function makeOp(): OpState { return { loading: false, result: null, ok: false } }

async function run(op: OpState, fn: () => Promise<void>, msg: string) {
  op.loading = true
  op.result = null
  try {
    await fn()
    op.ok = true
    op.result = msg
  } catch {
    op.ok = false
    op.result = 'Failed. Check server logs.'
  } finally {
    op.loading = false
  }
}

const apByDiff = ref(makeOp())
const apDiffId = ref('')

const apRaw = ref(makeOp())
const apWeighted = ref(makeOp())
const apAll = ref(makeOp())

async function recalcApByDifficulty() {
  if (!apDiffId.value) return
  const id = apDiffId.value
  run(apByDiff.value, async () => {
    const { recalculateApByDifficulty } = await import('@/api/admin/recalculation')
    await recalculateApByDifficulty(id)
    apDiffId.value = ''
  }, 'AP recalculation queued for difficulty.')
}

async function recalcRawAp() {
  run(apRaw.value, async () => {
    const { recalculateRawAp } = await import('@/api/admin/recalculation')
    await recalculateRawAp()
  }, 'Raw AP recalculation queued.')
}

async function recalcWeightedAp() {
  run(apWeighted.value, async () => {
    const { recalculateWeightedAp } = await import('@/api/admin/recalculation')
    await recalculateWeightedAp()
  }, 'Weighted AP recalculation queued.')
}

async function recalcAllAp() {
  if (!confirm('Recalculate ALL AP (raw + weighted)? This is heavy.')) return
  run(apAll.value, async () => {
    const { recalculateAllAp } = await import('@/api/admin/recalculation')
    await recalculateAllAp()
  }, 'Full AP recalculation queued.')
}

const xpScores = ref(makeOp())
const xpSums = ref(makeOp())

async function recalcScoreXp() {
  if (!confirm('Reweight XP for all scores?')) return
  run(xpScores.value, async () => {
    const { recalculateScoreXp } = await import('@/api/admin/recalculation')
    await recalculateScoreXp()
  }, 'Score XP reweight queued.')
}

async function recalcXpSums() {
  if (!confirm('Recalculate XP sums for all users?')) return
  run(xpSums.value, async () => {
    const { recalculateXpSums } = await import('@/api/admin/recalculation')
    await recalculateXpSums()
  }, 'XP sum recalculation queued.')
}

const playerStats = ref(makeOp())
const statsUserId = ref('')
const statsCategoryId = ref('')

async function recalcPlayerStats() {
  if (!statsUserId.value) return
  run(playerStats.value, async () => {
    const { recalculatePlayerStats } = await import('@/api/admin/recalculation')
    await recalculatePlayerStats(statsUserId.value, statsCategoryId.value || undefined)
    statsUserId.value = ''
  }, 'Player stats recalculation queued.')
}
const backfill = ref(makeOp())
const backfillDiffId = ref('')

async function backfillScores() {
  const id = backfillDiffId.value.trim()
  run(backfill.value, async () => {
    const mod = await import('@/api/admin/recalculation')
    if (id) {
      await mod.backfillScoresByDifficulty(id)
      backfillDiffId.value = ''
    } else {
      if (!confirm('Backfill ALL scores? This is very heavy.')) throw new Error('cancelled')
      await mod.backfillAllScores()
    }
  }, id ? 'Backfill queued for difficulty.' : 'Full score backfill queued.')
}

const userBackfill = ref(makeOp())
const userBackfillIds = ref('')

async function backfillUserScores() {
  const raw = userBackfillIds.value.trim()
  if (!raw) return
  const ids = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  if (!ids.length) return
  run(userBackfill.value, async () => {
    const mod = await import('@/api/admin/recalculation')
    if (ids.length === 1) {
      await mod.backfillScoresByUser(ids[0])
    } else {
      await mod.backfillScoresByUsers(ids)
    }
    userBackfillIds.value = ''
  }, `Backfill queued for ${ids.length} user${ids.length === 1 ? '' : 's'}.`)
}

const removeScoreOp = ref(makeOp())
const removeScoreUserId = ref('')
const removeScoreDiffId = ref('')
const removeScoreReason = ref('')

async function removeScore() {
  if (!removeScoreUserId.value || !removeScoreDiffId.value) return
  if (!confirm('Remove this score? The user will be re-fetched to avoid re-importing it.')) return
  run(removeScoreOp.value, async () => {
    const { removeScore: api } = await import('@/api/admin/recalculation')
    await api({
      userId: removeScoreUserId.value,
      mapDifficultyId: removeScoreDiffId.value,
      reason: removeScoreReason.value || undefined,
    })
    removeScoreUserId.value = ''
    removeScoreDiffId.value = ''
    removeScoreReason.value = ''
  }, 'Score removal queued.')
}

const milestoneBackfillAll = ref(makeOp())

async function backfillAllMilestonesOp() {
  if (!confirm('Backfill every active milestone for all users? This is very heavy.')) return
  run(milestoneBackfillAll.value, async () => {
    const { backfillAllMilestones } = await import('@/api/admin/milestones')
    await backfillAllMilestones()
  }, 'Milestone backfill queued.')
}

const playerRefresh = ref(makeOp())
const refreshUserId = ref('')
const refreshAllOp = ref(makeOp())

async function refreshPlayer() {
  if (!refreshUserId.value) return
  run(playerRefresh.value, async () => {
    const { refreshPlayer: api } = await import('@/api/admin/recalculation')
    await api(refreshUserId.value)
    refreshUserId.value = ''
  }, 'Player refresh queued.')
}

async function refreshAll() {
  if (!confirm('Refresh ALL players? This is a heavy background job.')) return
  run(refreshAllOp.value, async () => {
    const { refreshAllPlayers } = await import('@/api/admin/recalculation')
    await refreshAllPlayers()
  }, 'All-player refresh queued.')
}

const wsStatus = ref<Record<string, unknown> | null>(null)
const wsLoading = ref(false)
const wsReconnecting = ref<Record<string, boolean>>({})

async function fetchWsStatus() {
  wsLoading.value = true
  try {
    const { getWsStatus } = await import('@/api/admin/recalculation')
    wsStatus.value = await getWsStatus()
  } finally {
    wsLoading.value = false
  }
}
fetchWsStatus()

async function reconnect(platform: 'beatleader' | 'scoresaber') {
  wsReconnecting.value[platform] = true
  try {
    const { reconnectWs } = await import('@/api/admin/recalculation')
    await reconnectWs(platform)
    await fetchWsStatus()
  } finally {
    delete wsReconnecting.value[platform]
  }
}
</script>

<template>
  <div class="tab">
    <div class="tab__header">
      <h2 class="tab__title">Operations</h2>
      <p class="tab__subtitle">All recalculation and import operations are queued asynchronously.</p>
    </div>

    <div class="grid">
      <div class="op-card">
        <div class="op-card__head">
          <span class="op-card__title">AP by Difficulty</span>
          <span class="scope scope--targeted">targeted</span>
        </div>
        <p class="op-card__desc">Recalculate AP for all scores on a specific difficulty. Use after complexity changes.</p>
        <BaseInput v-model="apDiffId" placeholder="Difficulty UUID" />
        <div class="op-card__foot">
          <BaseButton variant="primary" :loading="apByDiff.loading" :disabled="!apDiffId" @click="recalcApByDifficulty">Run</BaseButton>
          <span v-if="apByDiff.result" class="result" :class="apByDiff.ok ? 'result--ok' : 'result--err'">{{ apByDiff.result }}</span>
        </div>
      </div>

      <div class="op-card">
        <div class="op-card__head">
          <span class="op-card__title">Player Stats</span>
          <span class="scope scope--targeted">targeted</span>
        </div>
        <p class="op-card__desc">Recalculate statistics for a specific player. Optionally filter to one category.</p>
        <BaseInput v-model="statsUserId" placeholder="User ID" />
        <div class="cat-row">
          <button
            class="cat-btn" :class="{ 'cat-btn--active': !statsCategoryId }"
            @click="statsCategoryId = ''"
          >All</button>
          <button
            v-for="cat in categoryStore.categories" :key="cat.id"
            class="cat-btn" :class="{ 'cat-btn--active': statsCategoryId === cat.id }"
            @click="statsCategoryId = cat.id"
          >{{ cat.name }}</button>
        </div>
        <div class="op-card__foot">
          <BaseButton variant="primary" :loading="playerStats.loading" :disabled="!statsUserId" @click="recalcPlayerStats">Run</BaseButton>
          <span v-if="playerStats.result" class="result" :class="playerStats.ok ? 'result--ok' : 'result--err'">{{ playerStats.result }}</span>
        </div>
      </div>

      <div class="op-card">
        <div class="op-card__head">
          <span class="op-card__title">Score Backfill</span>
          <span class="scope scope--broad">broad</span>
        </div>
        <p class="op-card__desc">Re-fetch scores from BeatLeader/ScoreSaber. Leave blank to backfill everything.</p>
        <BaseInput v-model="backfillDiffId" placeholder="Difficulty UUID (optional)" />
        <div class="op-card__foot">
          <BaseButton variant="primary" :loading="backfill.loading" @click="backfillScores">
            {{ backfillDiffId ? 'Backfill Difficulty' : 'Backfill All' }}
          </BaseButton>
          <span v-if="backfill.result" class="result" :class="backfill.ok ? 'result--ok' : 'result--err'">{{ backfill.result }}</span>
        </div>
      </div>

      <div class="op-card">
        <div class="op-card__head">
          <span class="op-card__title">Player Refresh</span>
          <span class="scope scope--targeted">targeted</span>
        </div>
        <p class="op-card__desc">Re-fetch player data from external sources.</p>
        <BaseInput v-model="refreshUserId" placeholder="User ID" />
        <div class="op-card__foot">
          <BaseButton :loading="playerRefresh.loading" :disabled="!refreshUserId" @click="refreshPlayer">Refresh Player</BaseButton>
          <BaseButton variant="destructive" :loading="refreshAllOp.loading" @click="refreshAll">Refresh All</BaseButton>
          <span v-if="playerRefresh.result" class="result" :class="playerRefresh.ok ? 'result--ok' : 'result--err'">{{ playerRefresh.result }}</span>
          <span v-if="refreshAllOp.result" class="result" :class="refreshAllOp.ok ? 'result--ok' : 'result--err'">{{ refreshAllOp.result }}</span>
        </div>
      </div>

      <div class="op-card">
        <div class="op-card__head">
          <span class="op-card__title">Backfill User Scores</span>
          <span class="scope scope--targeted">targeted</span>
        </div>
        <p class="op-card__desc">Re-fetch all BeatLeader scores for one or more users. Comma or newline separated IDs.</p>
        <textarea v-model="userBackfillIds" class="ids-input" placeholder="User IDs..." rows="2" spellcheck="false" />
        <div class="op-card__foot">
          <BaseButton variant="primary" :loading="userBackfill.loading" :disabled="!userBackfillIds.trim()" @click="backfillUserScores">Run</BaseButton>
          <span v-if="userBackfill.result" class="result" :class="userBackfill.ok ? 'result--ok' : 'result--err'">{{ userBackfill.result }}</span>
        </div>
      </div>

      <div class="op-card">
        <div class="op-card__head">
          <span class="op-card__title">Remove Score</span>
          <span class="scope scope--targeted">targeted</span>
        </div>
        <p class="op-card__desc">Remove a wrongly-attributed score. User will be re-fetched afterwards.</p>
        <BaseInput v-model="removeScoreUserId" placeholder="User ID" />
        <BaseInput v-model="removeScoreDiffId" placeholder="Map Difficulty UUID" />
        <BaseInput v-model="removeScoreReason" placeholder="Reason (optional)" />
        <div class="op-card__foot">
          <BaseButton variant="destructive" :loading="removeScoreOp.loading" :disabled="!removeScoreUserId || !removeScoreDiffId" @click="removeScore">Remove</BaseButton>
          <span v-if="removeScoreOp.result" class="result" :class="removeScoreOp.ok ? 'result--ok' : 'result--err'">{{ removeScoreOp.result }}</span>
        </div>
      </div>

      <div class="op-card op-card--warn">
        <div class="op-card__head">
          <span class="op-card__title">Backfill All Milestones</span>
          <span class="scope scope--global">global</span>
        </div>
        <p class="op-card__desc">Re-evaluate every active milestone for every user. Very heavy.</p>
        <div class="op-card__foot">
          <BaseButton variant="destructive" :loading="milestoneBackfillAll.loading" @click="backfillAllMilestonesOp">Run</BaseButton>
          <span v-if="milestoneBackfillAll.result" class="result" :class="milestoneBackfillAll.ok ? 'result--ok' : 'result--err'">{{ milestoneBackfillAll.result }}</span>
        </div>
      </div>

      <div class="op-card">
        <div class="op-card__head">
          <span class="op-card__title">Raw AP</span>
          <span class="scope scope--broad">broad</span>
        </div>
        <p class="op-card__desc">Recalculate raw AP for all scores using current score curves.</p>
        <div class="op-card__foot">
          <BaseButton variant="primary" :loading="apRaw.loading" @click="recalcRawAp">Run</BaseButton>
          <span v-if="apRaw.result" class="result" :class="apRaw.ok ? 'result--ok' : 'result--err'">{{ apRaw.result }}</span>
        </div>
      </div>

      <div class="op-card">
        <div class="op-card__head">
          <span class="op-card__title">Weighted AP</span>
          <span class="scope scope--broad">broad</span>
        </div>
        <p class="op-card__desc">Recalculate weighted AP for all players using current weight curves.</p>
        <div class="op-card__foot">
          <BaseButton variant="primary" :loading="apWeighted.loading" @click="recalcWeightedAp">Run</BaseButton>
          <span v-if="apWeighted.result" class="result" :class="apWeighted.ok ? 'result--ok' : 'result--err'">{{ apWeighted.result }}</span>
        </div>
      </div>

      <div class="op-card op-card--warn">
        <div class="op-card__head">
          <span class="op-card__title">All AP (Raw + Weighted)</span>
          <span class="scope scope--global">global</span>
        </div>
        <p class="op-card__desc">Full AP recalculation across all scores and players.</p>
        <div class="op-card__foot">
          <BaseButton variant="destructive" :loading="apAll.loading" @click="recalcAllAp">Run</BaseButton>
          <span v-if="apAll.result" class="result" :class="apAll.ok ? 'result--ok' : 'result--err'">{{ apAll.result }}</span>
        </div>
      </div>

      <div class="op-card op-card--warn">
        <div class="op-card__head">
          <span class="op-card__title">Score XP Reweight</span>
          <span class="scope scope--global">global</span>
        </div>
        <p class="op-card__desc">Reweight XP for all scores. Run after XP formula changes.</p>
        <div class="op-card__foot">
          <BaseButton variant="destructive" :loading="xpScores.loading" @click="recalcScoreXp">Run</BaseButton>
          <span v-if="xpScores.result" class="result" :class="xpScores.ok ? 'result--ok' : 'result--err'">{{ xpScores.result }}</span>
        </div>
      </div>

      <div class="op-card op-card--warn">
        <div class="op-card__head">
          <span class="op-card__title">XP Sum Recalculation</span>
          <span class="scope scope--global">global</span>
        </div>
        <p class="op-card__desc">Recalculate total XP for all users. Run after score XP reweight.</p>
        <div class="op-card__foot">
          <BaseButton variant="destructive" :loading="xpSums.loading" @click="recalcXpSums">Run</BaseButton>
          <span v-if="xpSums.result" class="result" :class="xpSums.ok ? 'result--ok' : 'result--err'">{{ xpSums.result }}</span>
        </div>
      </div>
    </div>

    <section class="ws-section">
      <div class="ws-section__header">
        <h3 class="ws-section__title">WebSocket Connections</h3>
        <BaseButton size="sm" :loading="wsLoading" @click="fetchWsStatus">Refresh Status</BaseButton>
      </div>
      <div class="ws-row">
        <div class="ws-card">
          <span class="ws-card__name">BeatLeader</span>
          <span v-if="wsStatus" class="ws-card__status">{{ JSON.stringify(wsStatus['beatleader'] ?? 'unknown') }}</span>
          <BaseButton size="sm" :loading="wsReconnecting['beatleader']" @click="reconnect('beatleader')">Reconnect</BaseButton>
        </div>
        <div class="ws-card">
          <span class="ws-card__name">ScoreSaber</span>
          <span v-if="wsStatus" class="ws-card__status">{{ JSON.stringify(wsStatus['scoresaber'] ?? 'unknown') }}</span>
          <BaseButton size="sm" :loading="wsReconnecting['scoresaber']" @click="reconnect('scoresaber')">Reconnect</BaseButton>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-lg); }

.tab__header { display: flex; flex-direction: column; gap: var(--space-xs); }
.tab__title { font-size: var(--text-section-heading); font-weight: 600; color: var(--text-primary); margin: 0; }
.tab__subtitle { font-size: var(--text-caption); color: var(--text-secondary); margin: 0; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-md); }

.op-card {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.op-card--warn { border-color: color-mix(in srgb, var(--error) 20%, var(--bg-overlay)); }

.op-card__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); }
.op-card__title { font-size: var(--text-body); font-weight: 600; color: var(--text-primary); }
.op-card__desc { font-size: var(--text-caption); color: var(--text-secondary); margin: 0; line-height: 1.5; }
.op-card__foot { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; margin-top: auto; }

.scope {
  font-size: 10px;
  font-family: var(--font-mono);
  font-weight: 600;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  border: 1px solid;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.scope--targeted { color: var(--info); border-color: color-mix(in srgb, var(--info) 30%, transparent); background: color-mix(in srgb, var(--info) 8%, transparent); }
.scope--broad { color: var(--warning); border-color: color-mix(in srgb, var(--warning) 30%, transparent); background: color-mix(in srgb, var(--warning) 8%, transparent); }
.scope--global { color: var(--error); border-color: color-mix(in srgb, var(--error) 30%, transparent); background: color-mix(in srgb, var(--error) 8%, transparent); }

.cat-row { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
.cat-btn {
  padding: 3px 10px;
  background: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 100ms;
}
.cat-btn:hover { border-color: var(--text-tertiary); color: var(--text-primary); }
.cat-btn--active { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }

.result { font-size: var(--text-caption); font-family: var(--font-mono); }
.result--ok { color: var(--success); }
.result--err { color: var(--error); }

.ws-section { display: flex; flex-direction: column; gap: var(--space-md); }
.ws-section__header { display: flex; align-items: center; justify-content: space-between; }
.ws-section__title { font-size: var(--text-body); font-weight: 600; color: var(--text-primary); margin: 0; }

.ws-row { display: flex; gap: var(--space-md); flex-wrap: wrap; }
.ws-card {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-md);
}
.ws-card__name { font-size: var(--text-body); font-weight: 600; color: var(--text-primary); }
.ws-card__status { font-size: var(--text-caption); font-family: var(--font-mono); color: var(--text-secondary); flex: 1; overflow: hidden; text-overflow: ellipsis; }

.ids-input {
  padding: var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  width: 100%;
  resize: vertical;
}
.ids-input:focus { border-color: var(--accent); outline: none; }
</style>
