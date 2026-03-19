<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MilestoneResponse, MilestoneSetResponse } from '@/types/api/milestones'
import type { CreateMilestoneRequest, CreateMilestoneSetRequest } from '@/types/api/admin'
import type { MilestoneTier, MilestoneType } from '@/types/enums'
import type { CategoryResponse } from '@/types/api/categories'
import type { QuerySpec, Schema } from '@/components/admin/MilestoneQueryBuilder.vue'
import MilestoneQueryBuilder from '@/components/admin/MilestoneQueryBuilder.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useCategoryStore } from '@/stores/categories'

const categoryStore = useCategoryStore()

const schema = ref<Schema>({ tables: {} })
const schemaLoading = ref(false)
const schemaOpen = ref(false)

async function fetchSchema() {
  if (Object.keys(schema.value.tables).length) return
  schemaLoading.value = true
  try {
    const { getMilestoneSchema } = await import('@/api/admin/milestones')
    schema.value = await getMilestoneSchema()
  } finally {
    schemaLoading.value = false
  }
}
fetchSchema()

const sets = ref<MilestoneSetResponse[]>([])
const setsLoading = ref(false)
const selectedSetId = ref<string | null>(null)
const showSetModal = ref(false)
const editingSet = ref<MilestoneSetResponse | null>(null)
const setForm = ref<CreateMilestoneSetRequest>({ title: '', description: '', setBonusXp: 0 })
const setActionLoading = ref<Record<string, boolean>>({})

async function fetchSets() {
  setsLoading.value = true
  try {
    const { getMilestoneSets } = await import('@/api/milestones')
    const res = await getMilestoneSets({ size: 100 })
    sets.value = res.content
    if (!selectedSetId.value && sets.value.length) selectedSetId.value = sets.value[0].id
  } finally {
    setsLoading.value = false
  }
}
fetchSets()

function openCreateSet() {
  editingSet.value = null
  setForm.value = { title: '', description: '', setBonusXp: 0 }
  showSetModal.value = true
}

function openEditSet(s: MilestoneSetResponse) {
  editingSet.value = s
  setForm.value = { title: s.title, description: s.description, setBonusXp: s.setBonusXp }
  showSetModal.value = true
}

async function saveSet() {
  try {
    const mod = await import('@/api/admin/milestones')
    if (editingSet.value) {
      const updated = await mod.updateMilestoneSet(editingSet.value.id, setForm.value)
      const idx = sets.value.findIndex((s) => s.id === editingSet.value!.id)
      if (idx !== -1) sets.value[idx] = updated
    } else {
      const created = await mod.createMilestoneSet(setForm.value)
      sets.value.push(created)
      selectedSetId.value = created.id
    }
    showSetModal.value = false
  } catch {
  }
}

async function deleteSet(s: MilestoneSetResponse) {
  if (!confirm(`Delete set "${s.title}"? This will also delete all milestones in it.`)) return
  setActionLoading.value[s.id] = true
  try {
    const { deleteMilestoneSet } = await import('@/api/admin/milestones')
    await deleteMilestoneSet(s.id)
    sets.value = sets.value.filter((x) => x.id !== s.id)
    if (selectedSetId.value === s.id) selectedSetId.value = sets.value[0]?.id ?? null
  } finally {
    delete setActionLoading.value[s.id]
  }
}

const milestones = ref<MilestoneResponse[]>([])
const milestonesLoading = ref(false)
const showMilestoneModal = ref(false)
const editingMilestone = ref<MilestoneResponse | null>(null)
const milestoneActionLoading = ref<Record<string, boolean>>({})

const EMPTY_QUERY: QuerySpec = {
  select: { function: 'MAX', column: '*' },
  from: '',
  filters: [],
}

const milestoneForm = ref<Omit<CreateMilestoneRequest, 'categoryId'> & { categoryId: string; _query: QuerySpec; _mapDifficultyIds: string }>({
  setId: '',
  categoryId: '',
  title: '',
  description: '',
  type: 'MILESTONE',
  tier: 'BRONZE',
  xp: 100,
  querySpec: {},
  targetValue: 1,
  comparison: 'GTE',
  _query: { ...EMPTY_QUERY },
  _mapDifficultyIds: '',
})

const TIERS: MilestoneTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']
const TYPES: MilestoneType[] = ['MILESTONE', 'ACHIEVEMENT']
const COMPARISONS = [{ value: 'GTE', label: '>= (at least)' }, { value: 'LTE', label: '<= (at most)' }]

watch(selectedSetId, (id) => {
  if (id) fetchMilestones(id)
})

async function fetchMilestones(setId: string) {
  milestonesLoading.value = true
  try {
    const { getMilestones } = await import('@/api/milestones')
    const res = await getMilestones({ setId, size: 100 })
    milestones.value = res.content
  } finally {
    milestonesLoading.value = false
  }
}

function openCreateMilestone() {
  if (!selectedSetId.value) return
  editingMilestone.value = null
  milestoneForm.value = {
    setId: selectedSetId.value,
    categoryId: '',
    title: '',
    description: '',
    type: 'MILESTONE',
    tier: 'BRONZE',
    xp: 100,
    querySpec: {},
    targetValue: 1,
    comparison: 'GTE',
    _query: {
      select: { function: 'MAX', column: '' },
      from: Object.keys(schema.value.tables)[0] ?? 'scores',
      filters: [],
    },
    _mapDifficultyIds: '',
  }
  showMilestoneModal.value = true
}

function openEditMilestone(m: MilestoneResponse) {
  editingMilestone.value = m
  milestoneForm.value = {
    setId: m.setId,
    categoryId: m.categoryId ?? '',
    title: m.title,
    description: m.description,
    type: m.type,
    tier: m.tier,
    xp: m.xp,
    querySpec: m.querySpec,
    targetValue: m.targetValue,
    comparison: m.comparison,
    _query: (m.querySpec as unknown as QuerySpec) ?? { ...EMPTY_QUERY },
    _mapDifficultyIds: '',
  }
  showMilestoneModal.value = true
}

async function saveMilestone() {
  const ids = milestoneForm.value._mapDifficultyIds.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
  const { _query, _mapDifficultyIds, ...rest } = milestoneForm.value
  const payload: CreateMilestoneRequest = {
    ...rest,
    categoryId: rest.categoryId || undefined,
    querySpec: _query as unknown as Record<string, unknown>,
    mapDifficultyIds: ids.length ? ids : undefined,
  }
  try {
    const mod = await import('@/api/admin/milestones')
    if (editingMilestone.value) {
      const updated = await mod.updateMilestone(editingMilestone.value.id, payload)
      const idx = milestones.value.findIndex((m) => m.id === editingMilestone.value!.id)
      if (idx !== -1) milestones.value[idx] = updated
    } else {
      const created = await mod.createMilestone(payload)
      milestones.value.push(created)
    }
    showMilestoneModal.value = false
  } catch {
  }
}

async function deleteMilestone(m: MilestoneResponse) {
  if (!confirm(`Delete "${m.title}"?`)) return
  milestoneActionLoading.value[m.id] = true
  try {
    const { deleteMilestone: apiDelete } = await import('@/api/admin/milestones')
    await apiDelete(m.id)
    milestones.value = milestones.value.filter((x) => x.id !== m.id)
  } finally {
    delete milestoneActionLoading.value[m.id]
  }
}

async function backfill(m: MilestoneResponse) {
  milestoneActionLoading.value[m.id] = true
  try {
    const { backfillMilestone } = await import('@/api/admin/milestones')
    await backfillMilestone(m.id)
  } finally {
    delete milestoneActionLoading.value[m.id]
  }
}

async function refreshStats() {
  const { refreshMilestoneStats } = await import('@/api/admin/milestones')
  await refreshMilestoneStats()
}

const showLinkModal = ref(false)
const linkTarget = ref<MilestoneResponse | null>(null)
const linkMapIds = ref('')
const linkLoading = ref(false)
const linkError = ref('')

function openLinkMaps(m: MilestoneResponse) {
  linkTarget.value = m
  linkMapIds.value = ''
  linkError.value = ''
  showLinkModal.value = true
}

async function submitLinkMaps() {
  if (!linkTarget.value || !linkMapIds.value.trim()) return
  linkLoading.value = true
  linkError.value = ''
  const ids = linkMapIds.value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
  if (!ids.length) { linkLoading.value = false; return }
  try {
    const { linkMilestoneMaps } = await import('@/api/admin/milestones')
    await linkMilestoneMaps(linkTarget.value.id, { mapDifficultyIds: ids })
    showLinkModal.value = false
  } catch {
    linkError.value = 'Failed to link maps.'
  } finally {
    linkLoading.value = false
  }
}

const selectedSet = computed(() => sets.value.find((s) => s.id === selectedSetId.value))

const categoryOptions = computed(() => [
  { value: '', label: 'All categories (global)' },
  ...categoryStore.categories.map((c: CategoryResponse) => ({ value: c.id, label: c.name })),
])

const setOptions = computed(() => sets.value.map((s) => ({ value: s.id, label: s.title })))

const TIER_COLORS: Record<string, string> = {
  BRONZE: 'var(--tier-bronze)',
  SILVER: 'var(--tier-silver)',
  GOLD: 'var(--tier-gold)',
  PLATINUM: 'var(--tier-platinum)',
  DIAMOND: 'var(--tier-diamond)',
}
</script>

<template>
  <div class="tab">
    <div class="tab__header">
      <h2 class="tab__title">Milestones</h2>
      <div class="header-actions">
        <BaseButton size="sm" @click="schemaOpen = !schemaOpen">
          {{ schemaOpen ? 'Hide' : 'Show' }} Schema Reference
        </BaseButton>
        <BaseButton size="sm" @click="refreshStats">Refresh Stats</BaseButton>
      </div>
    </div>

    <div v-if="schemaOpen" class="schema-panel">
      <div v-if="schemaLoading" class="schema-loading">
        <SkeletonLoader variant="text" v-for="i in 4" :key="i" />
      </div>
      <div v-else class="schema-tables">
        <div v-for="(tableDef, tableName) in schema.tables" :key="tableName" class="schema-table">
          <h4 class="schema-table__name">{{ tableName }}</h4>
          <div class="schema-table__cols">
            <span
              v-for="(colDef, colName) in tableDef.columns"
              :key="colName"
              class="schema-col"
              :title="colDef.type"
            >
              {{ colName }}
              <span class="schema-col__type">{{ colDef.type }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="layout">
      <div class="sets-panel">
        <div class="sets-panel__header">
          <span class="sets-panel__title">Sets</span>
          <button class="sets-panel__add" aria-label="New set" @click="openCreateSet">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        <div v-if="setsLoading" class="sets-panel__items">
          <SkeletonLoader v-for="i in 4" :key="i" variant="text" style="margin: 4px 0" />
        </div>
        <div v-else class="sets-panel__items">
          <button
            v-for="s in sets"
            :key="s.id"
            class="set-item"
            :class="{ 'set-item--active': selectedSetId === s.id }"
            @click="selectedSetId = s.id"
          >
            <span class="set-item__title">{{ s.title }}</span>
            <span class="set-item__xp">+{{ s.setBonusXp }} XP</span>
            <div class="set-item__actions">
              <button class="icon-btn" aria-label="Edit set" @click.stop="openEditSet(s)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button class="icon-btn icon-btn--danger" aria-label="Delete set" @click.stop="deleteSet(s)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          </button>
        </div>
      </div>

      <div class="milestones-panel">
        <div v-if="!selectedSetId" class="empty-hint">Select a set to view milestones</div>
        <template v-else>
          <div class="milestones-header">
            <div>
              <h3 class="milestones-title">{{ selectedSet?.title }}</h3>
              <p class="milestones-meta">Set bonus: +{{ selectedSet?.setBonusXp }} XP</p>
            </div>
            <BaseButton variant="primary" size="sm" @click="openCreateMilestone">New Milestone</BaseButton>
          </div>

          <div v-if="milestonesLoading" class="milestone-list">
            <SkeletonLoader v-for="i in 5" :key="i" variant="card" style="margin-bottom: 8px" />
          </div>
          <EmptyState v-else-if="!milestones.length" message="No milestones in this set yet" />
          <div v-else class="milestone-list">
            <div v-for="m in milestones" :key="m.id" class="milestone-card">
              <div class="milestone-card__tier" :style="{ background: TIER_COLORS[m.tier] }" />
              <div class="milestone-card__body">
                <div class="milestone-card__top">
                  <span class="milestone-card__title">{{ m.title }}</span>
                  <span class="milestone-card__type">{{ m.type }}</span>
                  <span class="milestone-card__xp">+{{ m.xp }} XP</span>
                </div>
                <p v-if="m.description" class="milestone-card__desc">{{ m.description }}</p>
                <div class="milestone-card__meta">
                  <span class="milestone-card__stat">{{ m.completionPercentage.toFixed(1) }}% completed</span>
                  <span class="milestone-card__stat">{{ m.completions }} / {{ m.totalPlayers }} players</span>
                  <span v-if="m.categoryId" class="milestone-card__stat">
                    {{ categoryStore.byId.get(m.categoryId)?.name ?? m.categoryId }}
                  </span>
                </div>
              </div>
              <div class="milestone-card__actions">
                <BaseButton size="sm" @click="openEditMilestone(m)">Edit</BaseButton>
                <BaseButton size="sm" @click="openLinkMaps(m)">Link Maps</BaseButton>
                <BaseButton size="sm" :loading="milestoneActionLoading[m.id]" @click="backfill(m)">Backfill</BaseButton>
                <BaseButton size="sm" variant="destructive" :loading="milestoneActionLoading[m.id]" @click="deleteMilestone(m)">Delete</BaseButton>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>

  <BaseModal :open="showSetModal" :title="editingSet ? 'Edit Set' : 'New Milestone Set'" @close="showSetModal = false">
    <div class="modal-form">
      <BaseInput v-model="setForm.title" label="Title" required />
      <BaseInput v-model="setForm.description" label="Description" />
      <BaseInput v-model.number="setForm.setBonusXp" label="Set Bonus XP" type="number" />
    </div>
    <template #footer>
      <BaseButton @click="showSetModal = false">Cancel</BaseButton>
      <BaseButton variant="primary" @click="saveSet">{{ editingSet ? 'Save' : 'Create' }}</BaseButton>
    </template>
  </BaseModal>

  <BaseModal :open="showMilestoneModal" :title="editingMilestone ? `Edit - ${editingMilestone.title}` : 'New Milestone'" @close="showMilestoneModal = false" style="--modal-width: 720px">
    <div class="modal-form milestone-form">
      <div class="milestone-form__row">
        <BaseInput v-model="milestoneForm.title" label="Title" style="flex: 2" required />
        <div class="form-field">
          <label class="form-label">Set</label>
          <BaseSelect v-model="milestoneForm.setId" :options="setOptions" />
        </div>
      </div>
      <BaseInput v-model="milestoneForm.description" label="Description" />
      <div class="milestone-form__row">
        <div class="form-field">
          <label class="form-label">Type</label>
          <BaseSelect v-model="milestoneForm.type" :options="TYPES.map((t) => ({ value: t, label: t }))" />
        </div>
        <div class="form-field">
          <label class="form-label">Tier</label>
          <BaseSelect v-model="milestoneForm.tier" :options="TIERS.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))" />
        </div>
        <BaseInput v-model.number="milestoneForm.xp" label="XP" type="number" style="width: 100px" />
      </div>
      <div class="milestone-form__row">
        <div class="form-field" style="flex: 1">
          <label class="form-label">Category (optional)</label>
          <BaseSelect v-model="milestoneForm.categoryId" :options="categoryOptions" />
        </div>
      </div>

      <div class="form-field">
        <label class="form-label">Map Difficulty IDs (optional)</label>
        <textarea
          v-model="milestoneForm._mapDifficultyIds"
          class="ids-input"
          placeholder="Comma or newline separated UUIDs"
          rows="2"
          spellcheck="false"
        />
      </div>

      <div class="form-divider" />

      <div class="form-section">
        <h4 class="form-section__title">Query Definition</h4>
        <p class="form-section__hint">
          Defines what value to measure. User/category/ranked-status filters are injected automatically at evaluation time.
        </p>
        <MilestoneQueryBuilder
          v-if="Object.keys(schema.tables).length"
          :schema="schema"
          v-model="milestoneForm._query"
        />
        <p v-else class="form-hint">Loading schema…</p>
      </div>

      <div class="form-divider" />
      <div class="milestone-form__row">
        <BaseInput v-model.number="milestoneForm.targetValue" label="Target Value" type="number" step="any" style="flex: 1" />
        <div class="form-field">
          <label class="form-label">Comparison</label>
          <BaseSelect v-model="milestoneForm.comparison" :options="COMPARISONS" />
        </div>
      </div>

      <div class="query-preview">
        <span class="query-preview__label">Query result</span>
        <span class="query-preview__op">{{ milestoneForm.comparison === 'GTE' ? '≥' : '≤' }}</span>
        <span class="query-preview__value">{{ milestoneForm.targetValue }}</span>
      </div>
    </div>
    <template #footer>
      <BaseButton @click="showMilestoneModal = false">Cancel</BaseButton>
      <BaseButton variant="primary" @click="saveMilestone">{{ editingMilestone ? 'Save' : 'Create' }}</BaseButton>
    </template>
  </BaseModal>

  <BaseModal :open="showLinkModal" :title="`Link Maps - ${linkTarget?.title ?? ''}`" @close="showLinkModal = false">
    <div class="modal-form">
      <div class="form-field">
        <label class="form-label">Map Difficulty IDs</label>
        <textarea
          v-model="linkMapIds"
          class="ids-input"
          placeholder="Comma or newline separated UUIDs"
          rows="4"
          spellcheck="false"
        />
      </div>
      <p v-if="linkError" class="form-error">{{ linkError }}</p>
    </div>
    <template #footer>
      <BaseButton @click="showLinkModal = false">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="linkLoading" :disabled="!linkMapIds.trim()" @click="submitLinkMaps">Link Maps</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-lg); }

.tab__header { display: flex; align-items: center; justify-content: space-between; }
.tab__title { font-size: var(--text-section-heading); font-weight: 600; color: var(--text-primary); margin: 0; }
.header-actions { display: flex; gap: var(--space-sm); }

.schema-panel {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-md);
  max-height: 300px;
  overflow-y: auto;
}
.schema-tables { display: flex; flex-direction: column; gap: var(--space-md); }
.schema-table__name { font-size: var(--text-caption); font-weight: 700; font-family: var(--font-mono); color: var(--accent); margin: 0 0 var(--space-xs); text-transform: uppercase; }
.schema-table__cols { display: flex; flex-wrap: wrap; gap: 4px; }
.schema-col {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: 3px;
  padding: 1px 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.schema-col__type { color: var(--text-tertiary); font-size: 10px; }

.layout { display: grid; grid-template-columns: 220px 1fr; gap: var(--space-lg); align-items: start; }

.sets-panel {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}
.sets-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}
.sets-panel__title { font-size: var(--text-caption); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; }
.sets-panel__add { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: none; border: 1px solid var(--bg-overlay); border-radius: var(--radius-btn); color: var(--text-secondary); cursor: pointer; transition: all 100ms; }
.sets-panel__add:hover { border-color: var(--accent); color: var(--accent); }
.sets-panel__items { padding: var(--space-xs); }

.set-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: var(--space-sm);
  background: none;
  border: none;
  border-radius: var(--radius-btn);
  text-align: left;
  cursor: pointer;
  position: relative;
  transition: background-color 100ms;
}
.set-item:hover { background: var(--bg-elevated); }
.set-item--active { background: color-mix(in srgb, var(--accent) 10%, transparent); }
.set-item--active .set-item__title { color: var(--accent); }
.set-item__title { font-size: var(--text-body); font-weight: 500; color: var(--text-primary); }
.set-item__xp { font-size: var(--text-caption); color: var(--text-secondary); font-family: var(--font-mono); }
.set-item__actions { display: none; position: absolute; right: var(--space-sm); top: 50%; transform: translateY(-50%); gap: 4px; }
.set-item:hover .set-item__actions { display: flex; }

.milestones-panel { display: flex; flex-direction: column; gap: var(--space-md); }
.empty-hint { color: var(--text-tertiary); font-size: var(--text-body); padding: var(--space-xl); text-align: center; }
.milestones-header { display: flex; align-items: flex-start; justify-content: space-between; }
.milestones-title { font-size: var(--text-card-title); font-weight: 600; color: var(--text-primary); margin: 0; }
.milestones-meta { font-size: var(--text-caption); color: var(--text-secondary); margin: 2px 0 0; font-family: var(--font-mono); }

.milestone-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.milestone-card {
  display: flex;
  align-items: stretch;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: border-color 150ms;
}
.milestone-card:hover { border-color: var(--text-tertiary); }
.milestone-card__tier { width: 4px; flex-shrink: 0; }
.milestone-card__body { flex: 1; padding: var(--space-sm) var(--space-md); }
.milestone-card__top { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.milestone-card__title { font-size: var(--text-body); font-weight: 600; color: var(--text-primary); }
.milestone-card__type { font-size: var(--text-caption); color: var(--text-tertiary); text-transform: uppercase; }
.milestone-card__xp { font-size: var(--text-caption); font-family: var(--font-mono); color: var(--success); margin-left: auto; }
.milestone-card__desc { font-size: var(--text-caption); color: var(--text-secondary); margin: 4px 0 0; }
.milestone-card__meta { display: flex; gap: var(--space-md); margin-top: 4px; }
.milestone-card__stat { font-size: var(--text-caption); color: var(--text-tertiary); font-family: var(--font-mono); }
.milestone-card__actions { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); border-left: 1px solid var(--bg-overlay); }

.modal-form { display: flex; flex-direction: column; gap: var(--space-md); padding: var(--space-sm) 0; }
.milestone-form__row { display: flex; gap: var(--space-md); flex-wrap: wrap; }
.form-field { display: flex; flex-direction: column; gap: var(--space-xs); flex: 1; min-width: 120px; }
.form-label { font-size: var(--text-caption); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
.form-divider { height: 1px; background: var(--bg-overlay); margin: var(--space-xs) 0; }
.form-section__title { font-size: var(--text-body); font-weight: 600; color: var(--text-primary); margin: 0 0 var(--space-xs); }
.form-section__hint { font-size: var(--text-caption); color: var(--text-secondary); margin: 0 0 var(--space-md); }
.form-hint { font-size: var(--text-caption); color: var(--text-tertiary); }

.query-preview {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  font-family: var(--font-mono);
}
.query-preview__label { font-size: var(--text-caption); color: var(--text-secondary); }
.query-preview__op { font-size: var(--text-body); font-weight: 700; color: var(--accent); }
.query-preview__value { font-size: var(--text-body); color: var(--text-primary); }

.icon-btn { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; background: none; border: none; color: var(--text-secondary); cursor: pointer; border-radius: 3px; transition: color 100ms; }
.icon-btn:hover { color: var(--text-primary); }
.icon-btn--danger:hover { color: var(--error); }

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
.form-error { font-size: var(--text-caption); color: var(--error); margin: 0; }
</style>
