<script setup lang="ts">
import { ApiError, parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import UserPicker from '@/components/domain/UserPicker.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import type { CreateStaffUserRequest, StaffUserResponse } from '@/types/api/admin'
import type { TableColumn, Tab } from '@/types/display'
import type { StaffRole, StaffUserStatus } from '@/types/enums'
import { generatePassword } from '@/utils/credentials'
import { computed, ref, watch } from 'vue'

type Dialog = 'create' | 'password' | 'link'

const PAGE_SIZE = 20
const CONFLICT = 409
const ROLES: StaffRole[] = ['MODERATOR', 'RANKING', 'RANKING_HEAD', 'CAMPAIGN_CURATOR', 'CREATIVE', 'DEVELOPER', 'ADMIN']
const PLAYER_LOGIN_ROLES: StaffRole[] = ['RANKING', 'RANKING_HEAD', 'CREATIVE', 'CAMPAIGN_CURATOR']
const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: titleCase(role) }))
const STATUS_TABS: Tab[] = [
  { key: '', label: 'All' },
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'DENIED', label: 'Denied' },
]
const ACTIVE_TABS: Tab[] = [
  { key: '', label: 'Any' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
]
const MODE_TABS: Tab[] = [
  { key: 'player', label: 'From Player' },
  { key: 'manual', label: 'Manual' },
]
const COLUMNS: TableColumn[] = [
  { key: 'username', label: 'Account', primary: true },
  { key: 'role', label: 'Role', width: '210px', noLink: true },
  { key: 'status', label: 'Request', width: '190px', noLink: true },
  { key: 'active', label: 'Active', width: '90px', noLink: true },
  { key: 'userId', label: 'Player', width: '200px', noLink: true },
  { key: 'actions', label: '', align: 'right', width: '170px', noLink: true },
]

function titleCase(value: string): string {
  return value.toLowerCase().split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
}

const { confirmModal, ask } = useConfirmAction()

const accounts = ref<StaffUserResponse[]>([])
const totalPages = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref('')
const statusFilter = ref<StaffUserStatus | ''>('')
const activeFilter = ref<'' | 'active' | 'inactive'>('')
const busyId = ref<string | null>(null)

const rows = computed<Record<string, unknown>[]>(() => accounts.value.map((account) => ({ ...account, account })))

function accountOf(row: Record<string, unknown>): StaffUserResponse {
  return row.account as StaffUserResponse
}

let requestId = 0

async function fetchAccounts() {
  const id = ++requestId
  loading.value = true
  try {
    const { getStaffUsers } = await import('@/api/admin/staff')
    const res = await getStaffUsers({
      page: page.value - 1,
      size: PAGE_SIZE,
      status: statusFilter.value || undefined,
      active: activeFilter.value ? activeFilter.value === 'active' : undefined,
    })
    if (id !== requestId) return
    accounts.value = res.content
    totalPages.value = res.totalPages
  } catch (err) {
    if (id === requestId) error.value = parseApiError(err, 'Could not load the staff accounts').message
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch([statusFilter, activeFilter], () => {
  if (page.value === 1) void fetchAccounts()
  else page.value = 1
})
watch(page, fetchAccounts, { immediate: true })

async function change(account: StaffUserResponse, fallback: string, call: () => Promise<StaffUserResponse>) {
  busyId.value = account.id
  error.value = ''
  try {
    const updated = await call()
    accounts.value = accounts.value.map((a) => (a.id === updated.id ? updated : a))
  } catch (err) {
    error.value = parseApiError(err, fallback).message
  } finally {
    busyId.value = null
  }
}

function setRole(account: StaffUserResponse, role: string) {
  if (role === account.role) return
  void change(account, 'Could not change the role', async () => {
    const { updateStaffRole } = await import('@/api/admin/staff')
    return updateStaffRole(account.id, { role: role as StaffRole })
  })
}

function setStatus(account: StaffUserResponse, status: 'ACCEPTED' | 'DENIED') {
  void change(account, 'Could not answer the request', async () => {
    const { updateStaffStatus } = await import('@/api/admin/staff')
    return updateStaffStatus(account.id, { status })
  })
}

function setActive(account: StaffUserResponse, active: boolean) {
  void change(account, 'Could not change the account', async () => {
    const { setStaffActive } = await import('@/api/admin/staff')
    return setStaffActive(account.id, active)
  })
}

function askDelete(account: StaffUserResponse) {
  ask({
    title: 'Delete Staff Account',
    message: `Delete ${account.username} for good? Their map votes and staff credits go with it.`,
    confirmLabel: 'Delete',
    destructive: true,
    run: async () => {
      const { deleteStaffUser } = await import('@/api/admin/staff')
      try {
        await deleteStaffUser(account.id)
      } catch (err) {
        if (err instanceof ApiError && err.status === CONFLICT) {
          throw new Error(`${parseApiError(err, 'This account has history').message}. Switch it to inactive to keep that history`)
        }
        throw err
      }
      accounts.value = accounts.value.filter((a) => a.id !== account.id)
    },
  })
}

const dialog = ref<Dialog | null>(null)
const target = ref<StaffUserResponse | null>(null)
const dialogBusy = ref(false)
const dialogError = ref('')

const mode = ref<'player' | 'manual'>('player')
const role = ref<StaffRole>('RANKING')
const playerId = ref<string | null>(null)
const playerName = ref('')
const manual = ref({ username: '', email: '', password: '' })
const created = ref<{ username: string; password: string; role: StaffRole } | null>(null)
const copied = ref(false)
const password = ref('')

const canCreate = computed(() =>
  mode.value === 'player'
    ? !!playerId.value && !!playerName.value
    : (!!manual.value.username.trim() || !!manual.value.email.trim()) && !!manual.value.password,
)

function openDialog(kind: Dialog, account: StaffUserResponse | null = null) {
  target.value = account
  dialogError.value = ''
  mode.value = 'player'
  role.value = 'RANKING'
  playerId.value = account?.userId ?? null
  playerName.value = ''
  manual.value = { username: '', email: '', password: '' }
  created.value = null
  copied.value = false
  password.value = ''
  dialog.value = kind
}

async function runDialog(fallback: string, call: () => Promise<void>) {
  dialogBusy.value = true
  dialogError.value = ''
  try {
    await call()
  } catch (err) {
    dialogError.value = parseApiError(err, fallback).message
  } finally {
    dialogBusy.value = false
  }
}

function createAccount() {
  const request: CreateStaffUserRequest = mode.value === 'player'
    ? { username: playerName.value, password: generatePassword(), role: role.value, userId: playerId.value ?? undefined }
    : {
        username: manual.value.username.trim() || undefined,
        email: manual.value.email.trim() || undefined,
        password: manual.value.password,
        role: role.value,
      }
  void runDialog('Could not create the account', async () => {
    const { createStaffUser } = await import('@/api/admin/staff')
    const account = await createStaffUser(request)
    accounts.value = [account, ...accounts.value]
    if (mode.value === 'player') created.value = { username: account.username, password: request.password, role: account.role }
    else dialog.value = null
  })
}

function savePassword() {
  const account = target.value
  if (!account || !password.value) return
  void runDialog('Could not change the password', async () => {
    const { forceChangePassword } = await import('@/api/admin/staff')
    await forceChangePassword(account.id, { newPassword: password.value })
    dialog.value = null
  })
}

function saveLink() {
  const account = target.value
  const userId = playerId.value
  if (!account || !userId) return
  void runDialog('Could not link the player', async () => {
    const { linkUser } = await import('@/api/admin/staff')
    const updated = await linkUser(account.id, { userId })
    accounts.value = accounts.value.map((a) => (a.id === updated.id ? updated : a))
    dialog.value = null
  })
}

async function copyPassword() {
  if (!created.value) return
  try {
    await navigator.clipboard.writeText(created.value.password)
    copied.value = true
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="staff">
    <div class="staff__controls">
      <BaseTabs v-model="statusFilter" variant="segmented" label="Request" :tabs="STATUS_TABS" />
      <BaseTabs v-model="activeFilter" variant="segmented" label="Active" :tabs="ACTIVE_TABS" />
      <BaseButton class="staff__new" variant="primary" @click="openDialog('create')">New Staff Account</BaseButton>
    </div>

    <p v-if="error" class="caption staff__error" role="alert">{{ error }}</p>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading && !accounts.length" :refreshing="loading && accounts.length > 0"
      :loading-rows="PAGE_SIZE" :row-height="56" row-key="id" empty-message="No staff accounts">
      <template #cell-username="{ row }">
        <span class="staff__account">
          <span class="staff__name">{{ row.username }}</span>
          <span v-if="row.email" class="caption">{{ row.email }}</span>
        </span>
      </template>
      <template #cell-role="{ row }">
        <BaseSelect :model-value="(row.role as string)" :options="ROLE_OPTIONS" @update:model-value="setRole(accountOf(row), $event)" />
      </template>
      <template #cell-status="{ row }">
        <span v-if="row.status === 'REQUESTED'" class="staff__actions">
          <BaseButton size="sm" variant="primary" :disabled="busyId === row.id" @click="setStatus(accountOf(row), 'ACCEPTED')">Approve</BaseButton>
          <BaseButton size="sm" variant="destructive" :disabled="busyId === row.id" @click="setStatus(accountOf(row), 'DENIED')">Deny</BaseButton>
        </span>
        <span v-else :class="{ staff__denied: row.status === 'DENIED' }">{{ row.status ? titleCase(row.status as string) : '-' }}</span>
      </template>
      <template #cell-active="{ row }">
        <BaseSwitch :model-value="(row.active as boolean)" :aria-label="`${row.username} active`" :disabled="busyId === row.id"
          @update:model-value="setActive(accountOf(row), $event)" />
      </template>
      <template #cell-userId="{ row }">
        <BaseButton size="sm" @click="openDialog('link', accountOf(row))">{{ row.userId ? 'Change Player' : 'Link Player' }}</BaseButton>
      </template>
      <template #cell-actions="{ row }">
        <span class="staff__actions">
          <BaseButton size="sm" @click="openDialog('password', accountOf(row))">Password</BaseButton>
          <BaseButton size="sm" variant="destructive" @click="askDelete(accountOf(row))">Delete</BaseButton>
        </span>
      </template>
    </DataTable>

    <div class="staff__pages">
      <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="page = $event" />
    </div>

    <BaseModal :open="dialog === 'create'" title="New Staff Account" @close="dialog = null">
      <div v-if="created" class="staff__form">
        <p class="staff__note">
          {{ created.username }} is staff now.
          {{ PLAYER_LOGIN_ROLES.includes(created.role)
            ? 'Their normal AccSaber login already has the role, the password is only for a direct staff login'
            : 'This role needs the password below to log in on the staff site' }}
        </p>
        <span class="field-label">Generated Password</span>
        <span class="staff__credential">
          <code>{{ created.password }}</code>
          <BaseButton size="sm" :class="{ confirm: copied }" @click="copyPassword">{{ copied ? 'Copied' : 'Copy' }}</BaseButton>
        </span>
      </div>
      <form v-else class="staff__form" @submit.prevent="canCreate && createAccount()">
        <BaseTabs v-model="mode" variant="segmented" label="Account source" :tabs="MODE_TABS" />
        <div class="staff__mode">
          <template v-if="mode === 'player'">
            <span class="field-label">Player</span>
            <UserPicker v-model="playerId" @select="playerName = $event?.userName ?? ''" />
          </template>
          <template v-else>
            <BaseInput v-model="manual.username" label="Username" />
            <BaseInput v-model="manual.email" label="Email" type="email" />
            <BaseInput v-model="manual.password" label="Password" type="password" autocomplete="new-password" />
          </template>
        </div>
        <BaseSelect v-model="role" label="Role" :options="ROLE_OPTIONS" />
        <p class="caption staff__dialog-error" role="alert">{{ dialogError }}</p>
      </form>
      <template #footer>
        <BaseButton v-if="created" variant="primary" @click="dialog = null">Done</BaseButton>
        <template v-else>
          <BaseButton @click="dialog = null">Cancel</BaseButton>
          <BaseButton variant="primary" :loading="dialogBusy" :disabled="!canCreate" @click="createAccount">Create</BaseButton>
        </template>
      </template>
    </BaseModal>

    <BaseModal :open="dialog === 'password'" :title="`Change Password, ${target?.username ?? ''}`" @close="dialog = null">
      <form class="staff__form" @submit.prevent="savePassword">
        <BaseInput v-model="password" label="New Password" type="password" autocomplete="new-password" />
        <p class="caption staff__dialog-error" role="alert">{{ dialogError }}</p>
      </form>
      <template #footer>
        <BaseButton @click="dialog = null">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="dialogBusy" :disabled="!password" @click="savePassword">Change Password</BaseButton>
      </template>
    </BaseModal>

    <BaseModal :open="dialog === 'link'" :title="`Link Player, ${target?.username ?? ''}`" @close="dialog = null">
      <div class="staff__form">
        <span class="field-label">Player</span>
        <UserPicker v-model="playerId" />
        <p class="caption staff__dialog-error" role="alert">{{ dialogError }}</p>
      </div>
      <template #footer>
        <BaseButton @click="dialog = null">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="dialogBusy" :disabled="!playerId" @click="saveLink">Link</BaseButton>
      </template>
    </BaseModal>

    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.staff {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.staff__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.staff__new {
  margin-left: auto;
}

.staff__error,
.staff__denied {
  color: var(--error);
}

.staff__account {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.staff__name {
  font-weight: 600;
  color: var(--text-primary);
}

.staff__actions {
  display: inline-flex;
  gap: var(--space-xs);
}

.staff__pages {
  min-height: var(--control-h);
}

.staff__form {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-sm);
}

.staff__form > :deep(.base-tabs) {
  align-self: flex-start;
}

.staff__mode {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 220px;
}

.staff__note {
  margin: 0;
  line-height: 1.5;
  color: var(--text-secondary);
}

.staff__credential {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-code);
}

.staff__dialog-error {
  min-height: 1lh;
  color: var(--error);
}
</style>
