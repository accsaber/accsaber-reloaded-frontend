<script setup lang="ts">
import { parseApiError } from '@/api/client'
import AdminTable from '@/components/admin/AdminTable.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanProfileForm, { type ClanProfileDraft } from '@/components/domain/ClanProfileForm.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import type { ClanResponse } from '@/types/api/clans'
import { formatStanding } from '@/utils/clans'
import { ref, watch } from 'vue'

const searchInput = ref('')
const search = useDebouncedRef(searchInput, 300)
const clans = ref<ClanResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)

const target = ref<ClanResponse | null>(null)
const draft = ref<ClanProfileDraft>({ name: '', tag: '', description: '', tagColor: '' })
const removeIcon = ref(false)
const reason = ref('')
const modalError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const disbandTarget = ref<ClanResponse | null>(null)
const disbandReason = ref('')
const disbandError = ref<string | null>(null)

async function fetchClans() {
  loading.value = true
  error.value = null
  try {
    const { getClans } = await import('@/api/clans')
    clans.value = (await getClans({ page: 0, size: 20, search: search.value.trim() || undefined })).content
  } catch (err) {
    error.value = parseApiError(err, 'Could not load clans.').message
  } finally {
    loading.value = false
  }
}

function openModerate(clan: ClanResponse) {
  target.value = clan
  draft.value = {
    name: clan.clan.name,
    tag: clan.clan.tag,
    description: clan.description ?? '',
    tagColor: clan.clan.tagColor ?? '',
  }
  removeIcon.value = false
  reason.value = ''
  modalError.value = null
  fieldErrors.value = {}
}

async function moderate() {
  const clan = target.value
  if (!clan || !reason.value.trim()) return
  busy.value = true
  modalError.value = null
  fieldErrors.value = {}
  try {
    const { moderateClan } = await import('@/api/admin/clans')
    const saved = await moderateClan(clan.clan.id, {
      changes: {
        name: draft.value.name.trim(),
        tag: draft.value.tag,
        description: draft.value.description,
        tagColor: draft.value.tagColor,
      },
      removeIcon: removeIcon.value,
      reason: reason.value.trim(),
    })
    clans.value = clans.value.map((c) => (c.clan.id === saved.clan.id ? saved : c))
    target.value = null
  } catch (err) {
    const parsed = parseApiError(err, 'Could not moderate that clan.')
    const errors: Record<string, string> = {}
    for (const fe of parsed.fieldErrors) errors[fe.field.replace(/^changes\./, '')] = fe.message
    fieldErrors.value = errors
    if (parsed.fieldErrors.length === 0) modalError.value = parsed.message
  } finally {
    busy.value = false
  }
}

function openDisband(clan: ClanResponse) {
  disbandTarget.value = clan
  disbandError.value = null
}

async function disband() {
  const clan = disbandTarget.value
  if (!clan || !disbandReason.value.trim()) return
  busy.value = true
  disbandError.value = null
  try {
    const { disbandClanByStaff } = await import('@/api/admin/clans')
    await disbandClanByStaff(clan.clan.id, disbandReason.value.trim())
    clans.value = clans.value.filter((c) => c.clan.id !== clan.clan.id)
    disbandTarget.value = null
    disbandReason.value = ''
  } catch (err) {
    disbandError.value = parseApiError(err, 'Could not disband that clan.').message
  } finally {
    busy.value = false
  }
}

watch(search, fetchClans, { immediate: true })
</script>

<template>
  <div class="moderate">
    <div class="moderate__header">
      <div>
        <h2 class="moderate__title">Moderate clans</h2>
        <p class="moderate__meta">Every change lands in the clan's audit log with your reason.</p>
      </div>
      <BaseInput v-model="searchInput" placeholder="Search by name or tag" class="moderate__search" />
    </div>

    <p v-if="error" class="moderate__error" role="alert">{{ error }}</p>

    <div class="moderate__reason">
      <BaseInput v-model="disbandReason" label="Disband reason" placeholder="Needed before a disband" />
    </div>

    <AdminTable :items="clans" :loading="loading" :loading-rows="6" empty-message="No clans match">
      <template #head>
        <th>Clan</th>
        <th class="right" style="width: 80px">Level</th>
        <th class="right" style="width: 120px">Standing</th>
        <th class="right" style="width: 100px">Members</th>
        <th class="right" style="width: 200px">Actions</th>
      </template>
      <template #default="{ item: row }">
        <td>
          <span class="moderate__clan">
            <ClanIcon :clan="row.clan" :size="28" />
            <ClanTag :clan="row.clan" size="sm" />
            <RouterLink class="moderate__name" :to="{ name: 'clan-detail', params: { slugOrId: row.clan.slug } }">{{ row.clan.name }}</RouterLink>
          </span>
        </td>
        <td class="mono right">{{ row.level.level }}</td>
        <td class="mono right">{{ formatStanding(row.standing) }}</td>
        <td class="mono right">{{ row.memberCount }}/{{ row.memberCap }}</td>
        <td class="right">
          <span class="moderate__actions">
            <BaseButton size="sm" @click="openModerate(row)">Moderate</BaseButton>
            <BaseButton size="sm" variant="destructive" :disabled="!disbandReason.trim()" @click="openDisband(row)">Disband</BaseButton>
          </span>
        </td>
      </template>
    </AdminTable>

    <BaseModal :open="target !== null" :title="target ? `Moderate ${target.clan.name}` : ''" max-width="560px" @close="target = null">
      <div v-if="target" class="moderate__form">
        <ClanProfileForm v-model="draft" :field-errors="fieldErrors" :equipped="target.clan.equipped" :disabled="busy" />
        <label v-if="target.clan.iconUrl" class="moderate__toggle">
          <input v-model="removeIcon" type="checkbox" :disabled="busy" />
          <span>Take the icon down</span>
        </label>
        <BaseInput v-model="reason" label="Reason" placeholder="Shown in the clan's audit log" :error="fieldErrors.reason" />
        <p v-if="modalError" class="moderate__error" role="alert">{{ modalError }}</p>
      </div>
      <template #footer>
        <BaseButton :disabled="busy" @click="target = null">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="busy" :disabled="!reason.trim()" @click="moderate">Save</BaseButton>
      </template>
    </BaseModal>

    <ConfirmModal
      :open="disbandTarget !== null"
      :title="disbandTarget ? `Disband ${disbandTarget.clan.name}` : ''"
      message="This ends every membership, alliance, mission and war the clan has, the clan is gone for good, and every member gets a notification with your reason."
      confirm-label="Disband"
      destructive
      :typed-confirmation="disbandTarget?.clan.name"
      :loading="busy"
      :error="disbandError"
      @confirm="disband"
      @close="disbandTarget = null"
    />
  </div>
</template>

<style scoped>
.moderate {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.moderate__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.moderate__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.moderate__meta {
  margin: 2px 0 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.moderate__search {
  width: 260px;
}

.moderate__reason {
  max-width: 420px;
}

.moderate__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.moderate__clan {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.moderate__name {
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
}

.moderate__name:hover {
  color: var(--page-accent, var(--accent));
}

.moderate__actions {
  display: inline-flex;
  gap: var(--space-xs);
}

.moderate__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.moderate__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-body);
  color: var(--text-primary);
  cursor: pointer;
}

.moderate__toggle input {
  accent-color: var(--page-accent, var(--accent));
}
</style>
