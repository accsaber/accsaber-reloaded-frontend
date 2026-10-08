<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserPicker from '@/components/domain/UserPicker.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanJoinRequestResponse, ClanJoinStatus, ClanResponse } from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ClanRequestList from './ClanRequestList.vue'

const PAGE_SIZE = 20

const props = defineProps<{ clan: ClanResponse }>()

const emit = defineEmits<{ changed: [] }>()

const route = useRoute()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: PAGE_SIZE,
  secondarySort: null,
})

const pageData = ref<Page<ClanJoinRequestResponse> | null>(null)
const loading = ref(true)
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)
const inviteUserId = ref<string | null>(null)
const inviting = ref(false)

const pending = computed(() => (pageData.value?.content ?? []).filter((r) => r.status === 'pending'))
const totalPages = computed(() => pageData.value?.totalPages ?? 0)

async function fetchRequests() {
  loading.value = true
  try {
    const { getClanJoinRequests } = await import('@/api/clans')
    pageData.value = await getClanJoinRequests(props.clan.clan.id, {
      page: paginationParams.value.page,
      size: PAGE_SIZE,
    })
  } catch (err) {
    pageData.value = null
    error.value = parseApiError(err, 'Could not load requests.').message
  } finally {
    loading.value = false
  }
}

async function resolve(request: ClanJoinRequestResponse, status: ClanJoinStatus) {
  busyId.value = request.id
  error.value = null
  try {
    const { resolveClanJoinRequest } = await import('@/api/clans')
    await resolveClanJoinRequest(request.id, { status })
    await fetchRequests()
    if (status === 'accepted') emit('changed')
  } catch (err) {
    error.value = parseApiError(err, 'Could not answer that request.').message
  } finally {
    busyId.value = null
  }
}

async function invite() {
  if (!inviteUserId.value) return
  inviting.value = true
  error.value = null
  try {
    const { createClanJoinRequest } = await import('@/api/clans')
    await createClanJoinRequest(props.clan.clan.id, { userId: inviteUserId.value })
    inviteUserId.value = null
    await fetchRequests()
  } catch (err) {
    error.value = parseApiError(err, 'Could not send that invite.').message
  } finally {
    inviting.value = false
  }
}

watch(() => route.query.page, fetchRequests, { immediate: true })
</script>

<template>
  <section class="requests-tab">
    <div class="requests-tab__invite">
      <UserPicker v-model="inviteUserId" placeholder="Invite a player by name..." :disabled="inviting" />
      <BaseButton variant="primary" :disabled="!inviteUserId" :loading="inviting" @click="invite">Invite</BaseButton>
    </div>

    <p v-if="error" class="requests-tab__error" role="alert">{{ error }}</p>

    <div v-if="loading" class="requests-tab__skeleton">
      <SkeletonLoader v-for="i in 4" :key="i" variant="table-row" />
    </div>
    <EmptyState v-else-if="pending.length === 0" message="No requests or invites waiting." />
    <ClanRequestList v-else :requests="pending" perspective="clan" :busy-id="busyId" @resolve="resolve" />

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
  </section>
</template>

<style scoped>
.requests-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.requests-tab__invite {
  display: grid;
  grid-template-columns: minmax(0, 360px) auto;
  gap: var(--space-sm);
  align-items: center;
}

.requests-tab__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.requests-tab__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

@media (max-width: 767px) {
  .requests-tab__invite {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
