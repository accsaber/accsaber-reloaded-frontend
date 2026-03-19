<script setup lang="ts">
import { ref } from 'vue'
import type { CampaignResponse } from '@/types/api/campaigns'
import type { CreateCampaignRequest, UpdateCampaignRequest, AddCampaignMapRequest } from '@/types/api/admin'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const campaigns = ref<CampaignResponse[]>([])
const loading = ref(false)
const actionLoading = ref<Record<string, boolean>>({})

const showModal = ref(false)
const editingId = ref<string | null>(null)
const form = ref<CreateCampaignRequest>({ name: '', description: '', difficulty: 'NORMAL', verified: false })
const formError = ref('')
const formLoading = ref(false)

const showMapModal = ref(false)
const mapTargetCampaign = ref<string | null>(null)
const mapForm = ref<AddCampaignMapRequest>({ mapDifficultyId: '', accuracyRequirement: 0.9, xp: 100, prerequisiteMapIds: [] })
const mapLoading = ref(false)
const mapError = ref('')

const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD', 'EXPERT', 'EXPERT_PLUS']

async function fetchCampaigns() {
  loading.value = true
  try {
    const { getCampaigns } = await import('@/api/campaigns')
    const res = await getCampaigns({ size: 100 })
    campaigns.value = res.content
  } finally {
    loading.value = false
  }
}
fetchCampaigns()

function openCreate() {
  editingId.value = null
  form.value = { name: '', description: '', difficulty: 'NORMAL', verified: false }
  formError.value = ''
  showModal.value = true
}

function openEdit(c: CampaignResponse) {
  editingId.value = c.id
  form.value = { name: c.name, description: c.description ?? '', difficulty: c.difficulty, verified: c.verified }
  formError.value = ''
  showModal.value = true
}

async function saveCampaign() {
  formLoading.value = true
  formError.value = ''
  try {
    const mod = await import('@/api/admin/campaigns')
    if (editingId.value) {
      await mod.updateCampaign(editingId.value, form.value as UpdateCampaignRequest)
    } else {
      await mod.createCampaign(form.value)
    }
    showModal.value = false
    fetchCampaigns()
  } catch {
    formError.value = 'Failed to save campaign.'
  } finally {
    formLoading.value = false
  }
}

async function deactivate(c: CampaignResponse) {
  if (!confirm(`Deactivate "${c.name}"?`)) return
  actionLoading.value[c.id] = true
  try {
    const { deactivateCampaign } = await import('@/api/admin/campaigns')
    await deactivateCampaign(c.id)
    campaigns.value = campaigns.value.filter((x) => x.id !== c.id)
  } finally {
    delete actionLoading.value[c.id]
  }
}

function openAddMap(campaignId: string) {
  mapTargetCampaign.value = campaignId
  mapForm.value = { mapDifficultyId: '', accuracyRequirement: 0.9, xp: 100, prerequisiteMapIds: [] }
  mapError.value = ''
  showMapModal.value = true
}

async function addMap() {
  if (!mapTargetCampaign.value) return
  mapLoading.value = true
  mapError.value = ''
  try {
    const { addCampaignMap } = await import('@/api/admin/campaigns')
    await addCampaignMap(mapTargetCampaign.value, mapForm.value)
    showMapModal.value = false
  } catch {
    mapError.value = 'Failed to add map. Check the difficulty ID.'
  } finally {
    mapLoading.value = false
  }
}
</script>

<template>
  <div class="tab">
    <div class="tab__header">
      <div>
        <h2 class="tab__title">Campaigns</h2>
        <p class="tab__meta">{{ campaigns.length }} campaigns</p>
      </div>
      <BaseButton variant="primary" @click="openCreate">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Campaign
      </BaseButton>
    </div>

    <div v-if="loading" class="campaign-grid">
      <SkeletonLoader v-for="i in 6" :key="i" variant="card" />
    </div>
    <EmptyState v-else-if="!campaigns.length" message="No campaigns yet" />
    <div v-else class="campaign-grid">
      <div v-for="c in campaigns" :key="c.id" class="campaign-card">
        <div class="campaign-card__header">
          <span class="campaign-card__name">{{ c.name }}</span>
          <span v-if="c.verified" class="verified-badge">verified</span>
        </div>
        <p v-if="c.description" class="campaign-card__desc">{{ c.description }}</p>
        <div class="campaign-card__meta">
          <span class="meta-tag">{{ c.difficulty }}</span>
          <span class="meta-tag">{{ c.mapCount }} maps</span>
        </div>
        <div class="campaign-card__actions">
          <BaseButton size="sm" @click="openEdit(c)">Edit</BaseButton>
          <BaseButton size="sm" @click="openAddMap(c.id)">Add Map</BaseButton>
          <BaseButton size="sm" :href="`/campaigns/${c.id}`">View</BaseButton>
          <BaseButton size="sm" variant="destructive" :loading="actionLoading[c.id]" @click="deactivate(c)">Deactivate</BaseButton>
        </div>
      </div>
    </div>
  </div>
  
  <BaseModal :open="showModal" :title="editingId ? 'Edit Campaign' : 'New Campaign'" @close="showModal = false">
    <div class="modal-form">
      <BaseInput v-model="form.name" label="Name" required />
      <BaseInput v-model="form.description" label="Description" />
      <div class="form-field">
        <label class="form-label">Difficulty</label>
        <select v-model="form.difficulty" class="native-select">
          <option v-for="d in DIFFICULTIES" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <label class="checkbox-label">
        <input v-model="form.verified" type="checkbox" />
        Verified (official campaign)
      </label>
      <p v-if="formError" class="form-error">{{ formError }}</p>
    </div>
    <template #footer>
      <BaseButton @click="showModal = false">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="formLoading" @click="saveCampaign">{{ editingId ? 'Save' : 'Create' }}</BaseButton>
    </template>
  </BaseModal>

  <BaseModal :open="showMapModal" title="Add Map to Campaign" @close="showMapModal = false">
    <div class="modal-form">
      <BaseInput v-model="mapForm.mapDifficultyId" label="Map Difficulty ID" placeholder="UUID" required />
      <BaseInput v-model.number="mapForm.accuracyRequirement" label="Accuracy Requirement (0–1)" type="number" step="0.01" min="0" max="1" />
      <BaseInput v-model.number="mapForm.xp" label="XP Reward" type="number" />
      <BaseInput
        :model-value="(mapForm.prerequisiteMapIds ?? []).join(', ')"
        label="Prerequisite Map IDs (comma-separated UUIDs)"
        placeholder="Leave blank if none"
        @update:model-value="(v) => { mapForm.prerequisiteMapIds = String(v).split(',').map((s) => s.trim()).filter(Boolean) }"
      />
      <p v-if="mapError" class="form-error">{{ mapError }}</p>
    </div>
    <template #footer>
      <BaseButton @click="showMapModal = false">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="mapLoading" @click="addMap">Add</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-lg); }
.tab__header { display: flex; align-items: flex-start; justify-content: space-between; }
.tab__title { font-size: var(--text-section-heading); font-weight: 600; color: var(--text-primary); margin: 0; }
.tab__meta { font-size: var(--text-caption); color: var(--text-secondary); margin: 2px 0 0; }

.campaign-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-md); }
.campaign-card { background: var(--bg-surface); border: 1px solid var(--bg-overlay); border-radius: var(--radius-card); padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); transition: border-color 150ms; }
.campaign-card:hover { border-color: var(--text-tertiary); }
.campaign-card__header { display: flex; align-items: center; gap: var(--space-sm); }
.campaign-card__name { font-size: var(--text-body); font-weight: 600; color: var(--text-primary); }
.verified-badge { font-size: var(--text-caption); font-family: var(--font-mono); color: var(--success); background: color-mix(in srgb, var(--success) 10%, transparent); border: 1px solid color-mix(in srgb, var(--success) 30%, transparent); border-radius: var(--radius-pill); padding: 1px 6px; }
.campaign-card__desc { font-size: var(--text-caption); color: var(--text-secondary); margin: 0; }
.campaign-card__meta { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
.meta-tag { font-size: var(--text-caption); font-family: var(--font-mono); color: var(--text-tertiary); background: var(--bg-elevated); border: 1px solid var(--bg-overlay); border-radius: var(--radius-pill); padding: 1px 8px; }
.campaign-card__actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; margin-top: auto; padding-top: var(--space-sm); border-top: 1px solid var(--bg-overlay); }

.modal-form { display: flex; flex-direction: column; gap: var(--space-md); padding: var(--space-sm) 0; }
.form-field { display: flex; flex-direction: column; gap: var(--space-xs); }
.form-label { font-size: var(--text-caption); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
.native-select { padding: var(--space-sm); background: var(--bg-base); border: 1px solid var(--bg-overlay); border-radius: var(--radius-input); color: var(--text-primary); font-family: var(--font-sans); font-size: var(--text-body); }
.native-select:focus { border-color: var(--accent); outline: none; }
.checkbox-label { display: flex; align-items: center; gap: var(--space-sm); font-size: var(--text-body); color: var(--text-primary); cursor: pointer; }
.form-error { font-size: var(--text-caption); color: var(--error); }
</style>
