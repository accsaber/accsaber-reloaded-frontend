<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import type { ResourceKind } from '@/components/domain/NewsResourceSelector.vue'
import NewsTypeBadge from '@/components/domain/NewsTypeBadge.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import type { CreateNewsRequest, NewsResponse, StaffNewsListParams, UpdateNewsRequest } from '@/types/api/news'
import type { TableColumn, Tab } from '@/types/display'
import type { NewsStatus, NewsType } from '@/types/enums'
import type { Page } from '@/types/pagination'
import { NEWS_STATUS_LABELS, NEWS_TYPE_LABELS, NEWS_TYPE_ORDER } from '@/utils/constants'
import { formatShortDate } from '@/utils/formatters'
import { knownCount, rememberCount } from '@/utils/knownCount'
import { computed, defineAsyncComponent, ref, watch } from 'vue'

const props = defineProps<{
  title?: string
  allowed: ResourceKind[]
  allowedStandalone?: NewsType[]
  fetchPage: (params: StaffNewsListParams) => Promise<Page<NewsResponse>>
  onCreate: (req: CreateNewsRequest) => Promise<NewsResponse>
  onUpdate: (id: string, req: UpdateNewsRequest) => Promise<NewsResponse>
  onDelete?: ((id: string, hard: boolean) => Promise<void>) | null
  onUploadImage?: (id: string, file: File) => Promise<NewsResponse>
  onDeleteImage?: (id: string) => Promise<NewsResponse>
}>()

const NewsFormModal = defineAsyncComponent(() => import('@/components/domain/NewsFormModal.vue'))

const PAGE_SIZE = 15
const STATUS_TABS: Tab[] = [
  { key: '', label: 'All' },
  ...(Object.keys(NEWS_STATUS_LABELS) as NewsStatus[]).map((key) => ({ key, label: NEWS_STATUS_LABELS[key] })),
]
const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Title', primary: true },
  { key: 'type', label: 'Type', width: '120px' },
  { key: 'status', label: 'Status', width: '112px' },
  { key: 'author', label: 'Author', width: '160px' },
  { key: 'publishedAt', label: 'Published', width: '128px', format: (v) => formatShortDate(v as string | null, '-') },
  { key: 'updatedAt', label: 'Updated', width: '128px', format: (v) => formatShortDate(v as string, '-') },
  { key: 'actions', label: '', align: 'right', width: '160px', noLink: true },
]

const { confirmModal, ask } = useConfirmAction()

const items = ref<NewsResponse[]>([])
const loading = ref(true)
const loaded = ref(false)
const totalPages = ref(0)
const page = ref(1)
const statusFilter = ref<NewsStatus | ''>('')
const typeFilter = ref<NewsType | ''>('')
const listError = ref('')

const typeOptions = computed(() => {
  const allowed = new Set<NewsType>([...(props.allowedStandalone ?? ['GENERAL']), ...props.allowed])
  return [
    { value: '', label: 'All Types' },
    ...NEWS_TYPE_ORDER.filter((t) => allowed.has(t)).map((t) => ({ value: t, label: NEWS_TYPE_LABELS[t] })),
  ]
})

const rows = computed<Record<string, unknown>[]>(() =>
  items.value.map((item) => ({ ...item, author: item.author.username ?? '-', entry: item })),
)
const countKey = computed(() => `news-admin:${statusFilter.value}:${typeFilter.value}:${page.value}`)

let requestId = 0

async function fetchList() {
  const id = ++requestId
  loading.value = true
  listError.value = ''
  try {
    const res = await props.fetchPage({
      page: page.value - 1,
      size: PAGE_SIZE,
      sort: 'updatedAt,desc',
      status: statusFilter.value || undefined,
      type: typeFilter.value || undefined,
    })
    rememberCount(countKey.value, res.content.length)
    if (id !== requestId) return
    items.value = res.content
    totalPages.value = res.totalPages
  } catch (err) {
    if (id === requestId) listError.value = parseApiError(err, 'Could not load the news').message
  } finally {
    if (id === requestId) {
      loading.value = false
      loaded.value = true
    }
  }
}

watch([statusFilter, typeFilter], () => {
  if (page.value === 1) void fetchList()
  else page.value = 1
})
watch(page, fetchList, { immediate: true })

const formMounted = ref(false)
const formOpen = ref(false)
const editing = ref<NewsResponse | null>(null)
const submitting = ref(false)
const formError = ref('')

function openForm(news: NewsResponse | null) {
  editing.value = news
  formError.value = ''
  formMounted.value = true
  formOpen.value = true
}

async function submit(payload: CreateNewsRequest) {
  submitting.value = true
  formError.value = ''
  try {
    if (editing.value) await props.onUpdate(editing.value.id, payload as UpdateNewsRequest)
    else await props.onCreate(payload)
    formOpen.value = false
    void fetchList()
  } catch (err) {
    formError.value = parseApiError(err, 'Could not save the article').message
  } finally {
    submitting.value = false
  }
}

function askDelete(news: NewsResponse) {
  ask({
    title: 'Delete Article',
    message: `Delete "${news.title}"? It is hidden from every view.`,
    confirmLabel: 'Delete',
    destructive: true,
    run: async () => {
      await props.onDelete?.(news.id, false)
      void fetchList()
    },
  })
}

function onImageChanged(updated: NewsResponse) {
  items.value = items.value.map((n) => (n.id === updated.id ? updated : n))
}
</script>

<template>
  <div class="news-mgmt">
    <h2 v-if="title" class="section-title">{{ title }}</h2>

    <div class="news-mgmt__controls">
      <BaseTabs v-model="statusFilter" variant="segmented" label="Status" :tabs="STATUS_TABS" />
      <BaseSelect v-model="typeFilter" class="news-mgmt__type" :options="typeOptions" />
      <BaseButton class="news-mgmt__new" variant="primary" @click="openForm(null)">New Article</BaseButton>
    </div>

    <p v-if="listError" class="caption news-mgmt__error" role="alert">{{ listError }}</p>

    <DataTable
      :columns="COLUMNS"
      :rows="rows"
      :loading="!loaded"
      :refreshing="loaded && loading"
      :loading-rows="knownCount(countKey, PAGE_SIZE)"
      :row-height="56"
      row-key="id"
      empty-message="No articles"
    >
      <template #cell-title="{ row }">
        <span class="news-mgmt__title">
          <span class="news-mgmt__name">{{ row.title }}</span>
          <svg v-if="row.pinned" class="news-mgmt__pin" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
            role="img" aria-label="Pinned">
            <title>Pinned</title>
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
        </span>
      </template>
      <template #cell-type="{ row }">
        <NewsTypeBadge :type="(row.type as NewsType)" />
      </template>
      <template #cell-status="{ row }">
        <span :class="`news-mgmt__status--${(row.status as string).toLowerCase()}`">
          {{ NEWS_STATUS_LABELS[row.status as NewsStatus] }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <span class="news-mgmt__actions">
          <BaseButton size="sm" @click="openForm(row.entry as NewsResponse)">Edit</BaseButton>
          <BaseButton v-if="onDelete" size="sm" variant="destructive" @click="askDelete(row.entry as NewsResponse)">
            Delete
          </BaseButton>
        </span>
      </template>
    </DataTable>

    <div class="news-mgmt__pages">
      <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="page = $event" />
    </div>

    <NewsFormModal
      v-if="formMounted"
      :open="formOpen"
      :editing="editing"
      :allowed="allowed"
      :allowed-standalone="allowedStandalone"
      :loading="submitting"
      :error="formError"
      :upload-image="onUploadImage"
      :delete-image="onDeleteImage"
      @close="formOpen = false"
      @submit="submit"
      @image-changed="onImageChanged"
    />
    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.news-mgmt {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.news-mgmt__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.news-mgmt__type {
  width: 160px;
}

.news-mgmt__new {
  margin-left: auto;
}

.news-mgmt__error {
  color: var(--error);
}

.news-mgmt__title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.news-mgmt__name {
  overflow: hidden;
  font-weight: 600;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.news-mgmt__pin {
  flex-shrink: 0;
  color: var(--page-accent, var(--accent));
}

.news-mgmt__status--draft {
  color: var(--text-secondary);
}

.news-mgmt__status--published {
  color: var(--success);
}

.news-mgmt__status--archived {
  color: var(--warning);
}

.news-mgmt__actions {
  display: inline-flex;
  gap: var(--space-xs);
}

.news-mgmt__pages {
  min-height: var(--control-h);
}
</style>
