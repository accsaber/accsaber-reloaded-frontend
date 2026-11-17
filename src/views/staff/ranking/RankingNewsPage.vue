<script setup lang="ts">
import NewsManagementView from '@/components/domain/NewsManagementView.vue'
import type { ResourceKind } from '@/components/domain/NewsResourceSelector.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import type { CreateNewsRequest, StaffNewsListParams, UpdateNewsRequest } from '@/types/api/news'

const ALLOWED: ResourceKind[] = ['BATCH']

usePageMeta({
  title: 'My News | AccSaber Ranking',
  description: 'Manage your batch news posts.',
})

async function fetchPage(params: StaffNewsListParams) {
  const { listAllNews } = await import('@/api/admin/news')
  return listAllNews({ ...params, mine: true })
}

async function onCreate(req: CreateNewsRequest) {
  const { createAdminNews } = await import('@/api/admin/news')
  return createAdminNews(req)
}

async function onUpdate(id: string, req: UpdateNewsRequest) {
  const { updateAdminNews } = await import('@/api/admin/news')
  return updateAdminNews(id, req)
}

async function onUploadImage(id: string, file: File) {
  const { uploadAdminNewsImage } = await import('@/api/admin/news')
  return uploadAdminNewsImage(id, file)
}

async function onDeleteImage(id: string) {
  const { deleteAdminNewsImage } = await import('@/api/admin/news')
  return deleteAdminNewsImage(id)
}
</script>

<template>
  <div class="ranking-news">
    <h1>My News</h1>
    <NewsManagementView
      :allowed="ALLOWED"
      :fetch-page="fetchPage"
      :on-create="onCreate"
      :on-update="onUpdate"
      :on-upload-image="onUploadImage"
      :on-delete-image="onDeleteImage"
    />
  </div>
</template>

<style scoped>
.ranking-news {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}
</style>
