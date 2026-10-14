<script setup lang="ts">
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import NewsArticle from '@/components/domain/NewsArticle.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import type { PublicNewsResponse } from '@/types/api/news'
import { isUuid } from '@/utils/mapRoute'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const news = ref<PublicNewsResponse | null>(null)
const loading = ref(true)
const notFound = ref(false)

const slug = computed(() => String(route.params.slug ?? ''))

usePageMeta({
  title: computed(() => (news.value ? `${news.value.title} | AccSaber News` : 'News | AccSaber')),
  description: computed(() => news.value?.description ?? 'AccSaber news article.'),
  image: computed(() => news.value?.imageUrl ?? undefined),
})

async function load(slugVal: string) {
  if (!slugVal) return
  loading.value = true
  notFound.value = false
  try {
    const { getNewsBySlug, getNewsById } = await import('@/api/news')
    news.value = isUuid(slugVal) ? await getNewsById(slugVal) : await getNewsBySlug(slugVal)
  } catch {
    news.value = null
    notFound.value = true
  } finally {
    loading.value = false
  }
}

const breadcrumbs = computed<Crumb[]>(() => [
  { label: 'News', to: '/news' },
  { label: news.value?.title ?? 'Article' },
])

watch(slug, (s) => load(s), { immediate: true })
</script>

<template>
  <div class="news-detail">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <template v-if="loading">
      <SkeletonLoader variant="card" height="240px" />
      <SkeletonLoader variant="text" :lines="6" />
    </template>

    <EmptyState v-else-if="notFound || !news" message="This news article wasn't found or isn't published." />

    <NewsArticle v-else :news="news" />
  </div>
</template>

<style scoped>
.news-detail {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
</style>
