<script setup lang="ts">
import {
  deleteAdminCrateContent,
  getAdminCrateContents,
  putAdminCrateContent,
  type CrateContentResponse,
} from '@/api/admin/crates'
import {
  getAdminItem,
  getAdminItems,
  reactivateItem,
  deleteItem as retireItem,
  updateItem,
} from '@/api/admin/items'
import { ApiError, getApiErrorMessage } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type {
  ItemRarity,
  ItemResponse,
  ItemTypeKey,
  UpdateItemRequest,
} from '@/types/api/items'
import { RARITY_ORDER } from '@/utils/items'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const crateId = computed(() => String(route.params.crateItemId))

const crate = ref<ItemResponse | null>(null)
const contents = ref<CrateContentResponse[]>([])
const allItems = ref<ItemResponse[]>([])
const loading = ref(true)
const errorMsg = ref<string | null>(null)

const search = ref('')
const allowNestedCrates = ref(false)
const groupByType = ref(true)

const metaSaving = ref(false)
const statusBusy = ref(false)

const form = ref({
  name: '',
  description: '',
  iconUrl: '',
  rarity: 'common' as ItemRarity,
  tradeable: false,
  visible: true,
})

const rarityOptions = RARITY_ORDER.map((r) => ({ value: r, label: r }))

const rewardIds = computed(() => new Set(contents.value.map((c) => c.rewardItem.id)))

const totalWeight = computed(() =>
  contents.value.reduce((s, c) => s + c.dropWeight, 0),
)

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  return allItems.value.filter((i) => {
    if (i.deprecated) return false
    if (!allowNestedCrates.value && i.typeKey === 'crate') return false
    if (i.id === crateId.value) return false
    if (!q) return true
    return (
      i.name.toLowerCase().includes(q) ||
      i.typeKey.toLowerCase().includes(q)
    )
  })
})

const grouped = computed<{ key: ItemTypeKey; items: ItemResponse[] }[]>(() => {
  if (!groupByType.value) {
    return [{ key: 'all' as ItemTypeKey, items: filteredItems.value }]
  }
  const map = new Map<ItemTypeKey, ItemResponse[]>()
  for (const item of filteredItems.value) {
    const arr = map.get(item.typeKey)
    if (arr) arr.push(item)
    else map.set(item.typeKey, [item])
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([key, items]) => ({ key, items }))
})

async function refresh() {
  loading.value = true
  errorMsg.value = null
  try {
    const [meta, pool, all] = await Promise.all([
      getAdminItem(crateId.value),
      getAdminCrateContents(crateId.value),
      getAdminItems({ includeInactive: false }),
    ])
    crate.value = meta
    contents.value = pool
    allItems.value = all
    syncFormFromCrate()
  } catch (e) {
    errorMsg.value = getApiErrorMessage(e, 'Failed to load crate')
  } finally {
    loading.value = false
  }
}

function syncFormFromCrate() {
  if (!crate.value) return
  form.value = {
    name: crate.value.name,
    description: crate.value.description ?? '',
    iconUrl: crate.value.iconUrl ?? '',
    rarity: crate.value.rarity,
    tradeable: crate.value.tradeable,
    visible: crate.value.visible,
  }
}

async function saveMetadata() {
  if (!crate.value) return
  metaSaving.value = true
  errorMsg.value = null
  try {
    const req: UpdateItemRequest = {
      name: form.value.name,
      description: form.value.description || undefined,
      iconUrl: form.value.iconUrl || undefined,
      rarity: form.value.rarity,
      tradeable: form.value.tradeable,
      visible: form.value.visible,
    }
    crate.value = await updateItem(crate.value.id, req)
    syncFormFromCrate()
  } catch (e) {
    errorMsg.value = getApiErrorMessage(e, 'Failed to save metadata')
  } finally {
    metaSaving.value = false
  }
}

async function togglePublish() {
  if (!crate.value) return
  const target = !crate.value.active
  if (target) {
    if (contents.value.length === 0) {
      if (!confirm('This crate has no rewards and cannot be opened. Publish anyway?')) {
        return
      }
    }
    if (!form.value.name.trim()) {
      errorMsg.value = 'Name is required before publishing'
      return
    }
    if (totalWeight.value > 0 && totalWeight.value < 10) {
      if (!confirm(`Total weight is only ${totalWeight.value}. Publish anyway?`)) {
        return
      }
    }
  }
  statusBusy.value = true
  errorMsg.value = null
  try {
    crate.value = target
      ? await reactivateItem(crate.value.id)
      : await retireItem(crate.value.id).then(() => getAdminItem(crateId.value))
    syncFormFromCrate()
  } catch (e) {
    errorMsg.value = getApiErrorMessage(e, 'Failed to change crate status')
  } finally {
    statusBusy.value = false
  }
}

const rowBusy = ref<Record<string, boolean>>({})

async function addReward(item: ItemResponse, weight = 100) {
  if (rewardIds.value.has(item.id)) return
  const optimistic: CrateContentResponse = {
    rewardItem: item,
    dropWeight: weight,
    dropChance: 0,
  }
  contents.value = [...contents.value, optimistic]
  rowBusy.value[item.id] = true
  try {
    await putAdminCrateContent(crateId.value, item.id, weight)
    contents.value = await getAdminCrateContents(crateId.value)
  } catch (e) {
    contents.value = contents.value.filter((c) => c.rewardItem.id !== item.id)
    errorMsg.value =
      e instanceof ApiError
        ? getApiErrorMessage(e, 'Cannot add reward')
        : 'Cannot add reward'
  } finally {
    delete rowBusy.value[item.id]
  }
}

async function removeReward(rewardId: string) {
  const snapshot = contents.value
  contents.value = contents.value.filter((c) => c.rewardItem.id !== rewardId)
  rowBusy.value[rewardId] = true
  try {
    await deleteAdminCrateContent(crateId.value, rewardId)
    contents.value = await getAdminCrateContents(crateId.value)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      contents.value = await getAdminCrateContents(crateId.value)
    } else {
      contents.value = snapshot
      errorMsg.value = getApiErrorMessage(e, 'Failed to remove reward')
    }
  } finally {
    delete rowBusy.value[rewardId]
  }
}

const weightDrafts = ref<Record<string, string>>({})
const weightTimers: Record<string, ReturnType<typeof setTimeout>> = {}
const weightErrors = ref<Record<string, string>>({})

function onWeightInput(rewardId: string, value: string) {
  weightDrafts.value[rewardId] = value
  const trimmed = value.trim()
  const parsed = Number.parseInt(trimmed, 10)
  if (!trimmed || !Number.isFinite(parsed) || parsed < 1) {
    weightErrors.value[rewardId] = 'Min 1'
    return
  }
  delete weightErrors.value[rewardId]
  if (weightTimers[rewardId]) clearTimeout(weightTimers[rewardId])
  weightTimers[rewardId] = setTimeout(() => {
    commitWeight(rewardId, parsed)
  }, 400)
}

async function commitWeight(rewardId: string, weight: number) {
  rowBusy.value[rewardId] = true
  try {
    await putAdminCrateContent(crateId.value, rewardId, weight)
    contents.value = await getAdminCrateContents(crateId.value)
    delete weightDrafts.value[rewardId]
  } catch (e) {
    weightErrors.value[rewardId] = getApiErrorMessage(e, 'Failed to update weight')
  } finally {
    delete rowBusy.value[rewardId]
  }
}

function applyPreset(rewardId: string, preset: number) {
  weightDrafts.value[rewardId] = String(preset)
  if (weightTimers[rewardId]) clearTimeout(weightTimers[rewardId])
  commitWeight(rewardId, preset)
}

function rollOnce(pool: CrateContentResponse[]): ItemResponse | null {
  const total = pool.reduce((s, c) => s + c.dropWeight, 0)
  if (total <= 0) return null
  let pick = Math.floor(Math.random() * total)
  for (const c of pool) {
    if (pick < c.dropWeight) return c.rewardItem
    pick -= c.dropWeight
  }
  return null
}

const lastRoll = ref<ItemResponse | null>(null)
const rollReveal = ref(false)

function doOpenOnce() {
  if (contents.value.length === 0) return
  rollReveal.value = false
  const item = rollOnce(contents.value)
  if (!item) return
  lastRoll.value = item
  requestAnimationFrame(() => {
    rollReveal.value = true
  })
}

interface SimRow {
  item: ItemResponse
  expected: number
  simulated: number
  delta: number
  outOfRange: boolean
}

const simRows = ref<SimRow[] | null>(null)
const simRunning = ref(false)
const simSampleSize = ref(0)

async function runSimulation(n: number) {
  if (contents.value.length === 0) return
  simRunning.value = true
  simSampleSize.value = n
  await new Promise((r) => setTimeout(r, 16))
  const counts = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const item = rollOnce(contents.value)
    if (!item) continue
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1)
  }
  const rows: SimRow[] = contents.value.map((c) => {
    const expectedFrac = c.dropChance
    const observed = (counts.get(c.rewardItem.id) ?? 0) / n
    const variance = expectedFrac * (1 - expectedFrac) / n
    const sigma = Math.sqrt(variance)
    const delta = observed - expectedFrac
    const outOfRange = sigma > 0 ? Math.abs(delta) > 1.5 * sigma : false
    return {
      item: c.rewardItem,
      expected: expectedFrac,
      simulated: observed,
      delta,
      outOfRange,
    }
  })
  rows.sort((a, b) => b.expected - a.expected)
  simRows.value = rows
  simRunning.value = false
}

const dropChanceFor = (id: string) => {
  const c = contents.value.find((x) => x.rewardItem.id === id)
  return c ? c.dropChance : 0
}

function formatPct(v: number, digits = 2) {
  return `${(v * 100).toFixed(digits)}%`
}

function formatSignedPct(v: number, digits = 2) {
  const pct = v * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(digits)}%`
}

onMounted(refresh)

watch(crateId, refresh)
</script>

<template>
  <div class="crate-editor">
    <header class="crate-editor__header">
      <BaseButton size="sm" @click="router.push({ name: 'admin', query: { tab: 'items', itab: 'crates' } })">
        &larr; Back to crates
      </BaseButton>
      <div class="crate-editor__title">
        {{ crate?.name || 'Crate editor' }}
      </div>
      <div class="crate-editor__spacer" />
      <div v-if="crate" class="crate-editor__status-group">
        <span class="crate-editor__status" :class="{
          'crate-editor__status--live': crate.active && !crate.deprecated,
          'crate-editor__status--draft': !crate.active,
          'crate-editor__status--deprecated': crate.deprecated,
        }">
          {{ crate.deprecated ? 'Deprecated' : crate.active ? 'Live' : 'Draft' }}
        </span>
        <BaseButton v-if="!crate.deprecated" size="sm" :variant="crate.active ? 'destructive' : 'primary'"
          :loading="statusBusy" @click="togglePublish">
          {{ crate.active ? 'Retire to Draft' : 'Publish' }}
        </BaseButton>
      </div>
    </header>

    <div v-if="errorMsg" class="crate-editor__error">{{ errorMsg }}</div>

    <div v-if="crate && !crate.active" class="crate-editor__banner">
      DRAFT - not visible to players
    </div>

    <section v-if="loading" class="crate-editor__loading">
      <SkeletonLoader variant="card" />
      <SkeletonLoader variant="card" />
      <SkeletonLoader variant="card" />
    </section>

    <template v-else-if="crate">
      <section class="crate-editor__panel">
        <h2 class="crate-editor__panel-title">Metadata</h2>
        <div class="crate-editor__meta-grid">
          <BaseInput v-model="form.name" label="Name" />
          <BaseInput v-model="form.description" label="Description" />
          <BaseInput v-model="form.iconUrl" label="Icon URL" />
          <BaseSelect :model-value="form.rarity" :options="rarityOptions" label="Rarity"
            @update:model-value="(v: string) => (form.rarity = v as ItemRarity)" />
          <div class="crate-editor__meta-checks">
            <label class="crate-editor__check">
              <input v-model="form.tradeable" type="checkbox" /> Tradeable
            </label>
            <label class="crate-editor__check">
              <input v-model="form.visible" type="checkbox" /> Visible
            </label>
          </div>
        </div>
        <div class="crate-editor__meta-actions">
          <BaseButton variant="primary" size="sm" :loading="metaSaving" @click="saveMetadata">
            Save metadata
          </BaseButton>
        </div>
      </section>

      <section class="crate-editor__panel">
        <header class="crate-editor__panel-header">
          <h2 class="crate-editor__panel-title">Contents</h2>
          <div class="crate-editor__totals">
            Total weight: <span class="mono">{{ totalWeight }}</span> -
            Reward count: <span class="mono">{{ contents.length }}</span>
          </div>
        </header>

        <div class="crate-editor__split">
          <div class="crate-editor__pane crate-editor__pane--picker">
            <header class="crate-editor__pane-header">
              <BaseInput v-model="search" placeholder="Search items..." aria-label="Search items" />
              <label class="crate-editor__check crate-editor__check--inline">
                <input v-model="allowNestedCrates" type="checkbox" /> Allow crates
              </label>
              <label class="crate-editor__check crate-editor__check--inline">
                <input v-model="groupByType" type="checkbox" /> Group by type
              </label>
            </header>
            <div class="crate-editor__picker-list">
              <div v-if="filteredItems.length === 0" class="crate-editor__picker-empty">
                No matching items.
              </div>
              <div v-for="group in grouped" :key="String(group.key)" class="crate-editor__group">
                <div v-if="groupByType" class="crate-editor__group-label">{{ group.key }}</div>
                <button v-for="item in group.items" :key="item.id" type="button" class="crate-editor__picker-item"
                  :class="{ 'crate-editor__picker-item--added': rewardIds.has(item.id) }"
                  :disabled="rewardIds.has(item.id) || rowBusy[item.id]" @click="addReward(item)">
                  <div class="crate-editor__picker-icon">
                    <img v-if="item.iconUrl" :src="item.iconUrl" alt="" loading="lazy" />
                    <span v-else class="crate-editor__picker-icon-placeholder" />
                  </div>
                  <div class="crate-editor__picker-meta">
                    <div class="crate-editor__picker-name">{{ item.name }}</div>
                    <div class="crate-editor__picker-sub">
                      <span class="crate-editor__picker-type">{{ item.typeKey }}</span>
                      <span class="crate-editor__rarity" :class="`rarity--${item.rarity}`">
                        {{ item.rarity }}
                      </span>
                    </div>
                  </div>
                  <div class="crate-editor__picker-action">
                    {{ rewardIds.has(item.id) ? 'Already added' : '+ Add' }}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div class="crate-editor__pane crate-editor__pane--pool">
            <header class="crate-editor__pane-header">
              <div class="crate-editor__pane-title">Current pool</div>
            </header>
            <div v-if="contents.length === 0" class="crate-editor__pool-empty">
              <EmptyState message="Pick rewards from the left to get started" />
            </div>
            <table v-else class="crate-editor__pool-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Rarity</th>
                  <th>Weight</th>
                  <th class="right">Chance</th>
                  <th class="right"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in contents" :key="c.rewardItem.id">
                  <td class="crate-editor__pool-icon">
                    <img v-if="c.rewardItem.iconUrl" :src="c.rewardItem.iconUrl" alt="" loading="lazy" />
                    <span v-else class="crate-editor__picker-icon-placeholder" />
                  </td>
                  <td>
                    <div class="crate-editor__pool-name">{{ c.rewardItem.name }}</div>
                    <div class="crate-editor__pool-type">{{ c.rewardItem.typeKey }}</div>
                  </td>
                  <td>
                    <span class="crate-editor__rarity" :class="`rarity--${c.rewardItem.rarity}`">
                      {{ c.rewardItem.rarity }}
                    </span>
                  </td>
                  <td class="crate-editor__pool-weight">
                    <input type="number" min="1" step="1" class="crate-editor__weight-input"
                      :value="weightDrafts[c.rewardItem.id] ?? String(c.dropWeight)"
                      :disabled="rowBusy[c.rewardItem.id]"
                      @input="onWeightInput(c.rewardItem.id, ($event.target as HTMLInputElement).value)" />
                    <div class="crate-editor__preset-row">
                      <button v-for="p in [1, 10, 100, 1000]" :key="p" type="button" class="crate-editor__preset"
                        :class="{ 'crate-editor__preset--active': c.dropWeight === p }"
                        @click="applyPreset(c.rewardItem.id, p)">
                        {{ p }}
                      </button>
                    </div>
                    <div v-if="weightErrors[c.rewardItem.id]" class="crate-editor__weight-err">
                      {{ weightErrors[c.rewardItem.id] }}
                    </div>
                  </td>
                  <td class="right mono">{{ formatPct(c.dropChance) }}</td>
                  <td class="right">
                    <button type="button" class="crate-editor__remove" :disabled="rowBusy[c.rewardItem.id]"
                      @click="removeReward(c.rewardItem.id)" aria-label="Remove">
                      &times;
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="contents.length > 0" class="crate-editor__pool-footer">
              Total weight: <span class="mono">{{ totalWeight }}</span> -
              Reward count: <span class="mono">{{ contents.length }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="crate-editor__panel">
        <h2 class="crate-editor__panel-title">Test</h2>
        <p class="crate-editor__hint">
          Simulate rolls against the current pool. Uses the same weighted draw as the server.
        </p>
        <div class="crate-editor__test-actions">
          <BaseButton size="sm" :disabled="contents.length === 0" @click="doOpenOnce">
            Open once
          </BaseButton>
          <BaseButton size="sm" :disabled="contents.length === 0 || simRunning" @click="runSimulation(1000)">
            Run 1,000
          </BaseButton>
          <BaseButton size="sm" :disabled="contents.length === 0 || simRunning"
            :loading="simRunning && simSampleSize === 100000" @click="runSimulation(100000)">
            Run 100,000
          </BaseButton>
        </div>

        <Transition name="reveal">
          <div v-if="lastRoll" :key="lastRoll.id" class="crate-editor__reveal"
            :class="{ 'crate-editor__reveal--in': rollReveal }">
            <div class="crate-editor__reveal-icon">
              <img v-if="lastRoll.iconUrl" :src="lastRoll.iconUrl" alt="" />
              <span v-else class="crate-editor__picker-icon-placeholder" />
            </div>
            <div class="crate-editor__reveal-meta">
              <div class="crate-editor__reveal-label">You rolled</div>
              <div class="crate-editor__reveal-name">{{ lastRoll.name }}</div>
              <div class="crate-editor__reveal-sub">
                <span class="crate-editor__rarity" :class="`rarity--${lastRoll.rarity}`">
                  {{ lastRoll.rarity }}
                </span>
                <span class="crate-editor__reveal-chance mono">
                  {{ formatPct(dropChanceFor(lastRoll.id)) }} chance
                </span>
              </div>
            </div>
          </div>
        </Transition>

        <table v-if="simRows && simRows.length" class="crate-editor__sim-table">
          <thead>
            <tr>
              <th>Reward</th>
              <th class="right">Expected</th>
              <th class="right">Simulated</th>
              <th class="right">&Delta;</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in simRows" :key="row.item.id">
              <td>{{ row.item.name }}</td>
              <td class="right mono">{{ formatPct(row.expected) }}</td>
              <td class="right mono">{{ formatPct(row.simulated) }}</td>
              <td class="right mono" :class="{ 'crate-editor__sim-out': row.outOfRange }">
                {{ formatSignedPct(row.delta) }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.crate-editor {
  padding: var(--space-xl);
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.crate-editor__header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.crate-editor__title {
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
}

.crate-editor__spacer {
  flex: 1;
}

.crate-editor__status-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.crate-editor__status {
  padding: 2px var(--space-sm);
  border-radius: var(--radius-pill);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  border: 1px solid var(--status-color, var(--bg-overlay));
  color: var(--status-color, var(--text-secondary));
}

.crate-editor__status--live {
  --status-color: var(--success);
}

.crate-editor__status--draft {
  --status-color: var(--warning);
}

.crate-editor__status--deprecated {
  --status-color: var(--text-tertiary);
}

.crate-editor__banner {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--warning);
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  color: var(--warning);
  border-radius: var(--radius-card);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
}

.crate-editor__error {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--error);
  background: color-mix(in srgb, var(--error) 12%, transparent);
  color: var(--error);
  border-radius: var(--radius-card);
  font-size: var(--text-body);
}

.crate-editor__loading {
  display: grid;
  gap: var(--space-md);
}

.crate-editor__panel {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.crate-editor__panel-title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.crate-editor__panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.crate-editor__totals {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.mono {
  font-family: var(--font-mono);
}

.crate-editor__meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

.crate-editor__meta-checks {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  align-self: end;
}

.crate-editor__check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  cursor: pointer;
}

.crate-editor__check--inline {
  flex-shrink: 0;
}

.crate-editor__meta-actions {
  display: flex;
  justify-content: flex-end;
}

.crate-editor__split {
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  gap: var(--space-lg);
}

@media (max-width: 880px) {
  .crate-editor__split {
    grid-template-columns: minmax(0, 1fr);
  }

  .crate-editor__meta-grid {
    grid-template-columns: 1fr;
  }
}

.crate-editor__pane {
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  min-height: 360px;
}

.crate-editor__pane-header {
  padding: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  border-bottom: 1px solid var(--bg-overlay);
  flex-wrap: wrap;
}

.crate-editor__pane-header> :first-child {
  flex: 1;
  min-width: 160px;
}

.crate-editor__pane-title {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.crate-editor__picker-list {
  flex: 1;
  overflow-y: auto;
  max-height: 520px;
  padding: var(--space-sm);
}

.crate-editor__picker-empty,
.crate-editor__pool-empty {
  padding: var(--space-xl) var(--space-md);
  color: var(--text-tertiary);
  text-align: center;
}

.crate-editor__group {
  margin-bottom: var(--space-sm);
}

.crate-editor__group-label {
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  padding: var(--space-xs) var(--space-sm);
}

.crate-editor__picker-item {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: var(--space-sm);
  align-items: center;
  width: 100%;
  padding: var(--space-sm);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-card);
  color: var(--text-primary);
  font-family: var(--font-sans);
  cursor: pointer;
  text-align: left;
  transition: background-color 100ms ease, border-color 100ms ease;
}

.crate-editor__picker-item:not(:disabled):hover {
  background: var(--bg-elevated);
  border-color: var(--bg-overlay);
}

.crate-editor__picker-item--added,
.crate-editor__picker-item:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.crate-editor__picker-icon,
.crate-editor__pool-icon img,
.crate-editor__reveal-icon img {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  display: block;
}

.crate-editor__picker-icon img {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  display: block;
}

.crate-editor__picker-icon-placeholder {
  display: inline-block;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-avatar);
  background: var(--bg-overlay);
}

.crate-editor__picker-name {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
}

.crate-editor__picker-sub {
  display: flex;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  align-items: center;
}

.crate-editor__picker-type {
  color: var(--text-tertiary);
}

.crate-editor__picker-action {
  font-size: var(--text-caption);
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

.crate-editor__picker-item--added .crate-editor__picker-action {
  color: var(--text-tertiary);
}

.crate-editor__rarity {
  text-transform: capitalize;
  color: var(--rarity-color, var(--text-primary));
  font-weight: 500;
}

.crate-editor__rarity.rarity--common {
  --rarity-color: var(--text-tertiary);
}

.crate-editor__rarity.rarity--uncommon {
  --rarity-color: var(--success);
}

.crate-editor__rarity.rarity--rare {
  --rarity-color: var(--info);
}

.crate-editor__rarity.rarity--epic {
  --rarity-color: var(--accent-overall);
}

.crate-editor__rarity.rarity--legendary {
  --rarity-color: var(--tier-gold);
}

.crate-editor__rarity.rarity--mythic {
  --rarity-color: var(--error);
}

.crate-editor__pool-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body);
}

.crate-editor__pool-table th {
  text-align: left;
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.crate-editor__pool-table th.right,
.crate-editor__pool-table td.right {
  text-align: right;
}

.crate-editor__pool-table td {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
  vertical-align: middle;
}

.crate-editor__pool-table tr:last-child td {
  border-bottom: none;
}

.crate-editor__pool-icon img,
.crate-editor__pool-icon .crate-editor__picker-icon-placeholder {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-avatar);
}

.crate-editor__pool-name {
  font-weight: 500;
  color: var(--text-primary);
}

.crate-editor__pool-type {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.crate-editor__weight-input {
  width: 96px;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-mono);
  outline: none;
}

.crate-editor__weight-input:focus {
  border-color: var(--accent);
}

.crate-editor__preset-row {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.crate-editor__preset {
  padding: 2px var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: color 100ms ease, border-color 100ms ease;
}

.crate-editor__preset:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.crate-editor__preset--active {
  color: var(--accent);
  border-color: var(--accent);
}

.crate-editor__weight-err {
  margin-top: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--error);
}

.crate-editor__remove {
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius-btn);
  transition: color 100ms ease, background-color 100ms ease;
}

.crate-editor__remove:hover {
  color: var(--error);
  background: color-mix(in srgb, var(--error) 10%, transparent);
}

.crate-editor__pool-footer {
  padding: var(--space-md);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  border-top: 1px solid var(--bg-overlay);
}

.crate-editor__hint {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.crate-editor__test-actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.crate-editor__reveal {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  opacity: 0;
  transform: scale(0.96);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}

.crate-editor__reveal--in {
  opacity: 1;
  transform: scale(1);
}

.crate-editor__reveal-icon img,
.crate-editor__reveal-icon .crate-editor__picker-icon-placeholder {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
}

.crate-editor__reveal-label {
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.crate-editor__reveal-name {
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
}

.crate-editor__reveal-sub {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.crate-editor__sim-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body);
}

.crate-editor__sim-table th {
  text-align: left;
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.crate-editor__sim-table th.right,
.crate-editor__sim-table td.right {
  text-align: right;
}

.crate-editor__sim-table td {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.crate-editor__sim-table tr:last-child td {
  border-bottom: none;
}

.crate-editor__sim-out {
  color: var(--error);
}

@media (prefers-reduced-motion: reduce) {
  .crate-editor__reveal {
    transition: none;
  }
}
</style>
