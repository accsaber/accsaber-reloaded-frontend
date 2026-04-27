<script setup lang="ts">
import NewsManagementView from '@/components/domain/NewsManagementView.vue'
import type { ResourceKind } from '@/components/domain/NewsResourceSelector.vue'
import type {
  CreateNewsRequest,
  StaffNewsListParams,
  UpdateNewsRequest,
} from '@/types/api/news'

const ALLOWED: ResourceKind[] = ['BATCH', 'CAMPAIGN', 'MILESTONE_SET', 'CURVE']

async function fetchPage(params: StaffNewsListParams) {
  const { listAllNews } = await import('@/api/admin/news')
  return listAllNews(params)
}

async function onCreate(req: CreateNewsRequest) {
  const { createAdminNews } = await import('@/api/admin/news')
  return createAdminNews(req)
}

async function onUpdate(id: string, req: UpdateNewsRequest) {
  const { updateAdminNews } = await import('@/api/admin/news')
  return updateAdminNews(id, req)
}

async function onDelete(id: string, hard: boolean) {
  const { deleteAdminNews } = await import('@/api/admin/news')
  return deleteAdminNews(id, hard)
}
</script>

<template>
  <NewsManagementView
    title="News"
    :allowed="ALLOWED"
    :fetch-page="fetchPage"
    :on-create="onCreate"
    :on-update="onUpdate"
    :on-delete="onDelete"
  />
</template>
