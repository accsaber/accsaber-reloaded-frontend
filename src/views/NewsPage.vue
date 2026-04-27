<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import NewsCard from '@/components/domain/NewsCard.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import type { NewsListParams, PublicNewsResponse } from '@/types/api/news'
import type { NewsType } from '@/types/enums'
import { NEWS_TYPE_ACCENT, NEWS_TYPE_LABELS, NEWS_TYPE_ORDER } from '@/utils/constants'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

usePageMeta({
  title: 'News | AccSaber',
  description: 'Latest AccSaber announcements, batch releases, milestones and more.',
})

const items = ref<PublicNewsResponse[]>([])
const totalPages = ref(0)
const loading = ref(false)

const activeType = computed<NewsType | null>(() => {
  const t = route.query.type as string | undefined
  return t && (NEWS_TYPE_ORDER as NewsType[]).includes(t as NewsType) ? (t as NewsType) : null
})

const currentPage = computed<number>(() => {
  const p = Number(route.query.page)
  return p > 0 ? p : 1
})

const typeChoices = computed(() => [
  { key: null as NewsType | null, label: 'All', accent: 'var(--accent)' },
  ...NEWS_TYPE_ORDER.map((t) => ({ key: t, label: NEWS_TYPE_LABELS[t], accent: NEWS_TYPE_ACCENT[t] })),
])

function selectType(type: NewsType | null) {
  const query = { ...route.query }
  if (type === null) delete query.type
  else query.type = type
  delete query.page
  router.replace({ query })
}

function setPage(p: number) {
  const query = { ...route.query }
  if (p <= 1) delete query.page
  else query.page = String(p)
  router.replace({ query })
}

async function fetchNews() {
  loading.value = true
  try {
    const { getNews } = await import('@/api/news')
    const params: NewsListParams = {
      page: currentPage.value - 1,
      size: 20,
    }
    if (activeType.value) params.type = activeType.value
    const res = await getNews(params)
    items.value = res.content
    totalPages.value = res.totalPages
  } catch {
    items.value = []
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}

watch(
  () => [activeType.value, currentPage.value],
  () => {
    fetchNews()
  },
  { immediate: true },
)

const pinnedItems = computed(() => items.value.filter((n) => n.pinned))
const regularItems = computed(() => items.value.filter((n) => !n.pinned))
</script>

<template>
  <div class="news-page">
    <header class="news-page__header">
      <h1 class="news-page__title">News</h1>
      <p class="news-page__subtitle">Announcements, batch releases, and platform updates.</p>
    </header>

    <div class="news-page__filter" role="tablist" aria-label="News filter">
      <button
        v-for="choice in typeChoices"
        :key="choice.key ?? 'all'"
        type="button"
        role="tab"
        :aria-selected="activeType === choice.key"
        class="news-page__chip"
        :class="{ 'news-page__chip--active': activeType === choice.key }"
        :style="{ '--chip-accent': choice.accent }"
        @click="selectType(choice.key)"
      >
        {{ choice.label }}
      </button>
    </div>

    <div v-if="loading" class="news-page__list">
      <SkeletonLoader v-for="i in 4" :key="i" variant="card" style="height: 160px" />
    </div>

    <EmptyState v-else-if="!items.length" message="No news yet. Check back soon." />

    <template v-else>
      <section v-if="pinnedItems.length" class="news-page__section">
        <h2 class="news-page__section-title">Pinned</h2>
        <div class="news-page__list">
          <NewsCard v-for="news in pinnedItems" :key="news.id" :news="news" />
        </div>
      </section>

      <section v-if="regularItems.length" class="news-page__section">
        <h2 v-if="pinnedItems.length" class="news-page__section-title">Latest</h2>
        <div class="news-page__list">
          <NewsCard v-for="news in regularItems" :key="news.id" :news="news" />
        </div>
      </section>

      <PaginationControls
        v-if="totalPages > 1"
        :page="currentPage"
        :total-pages="totalPages"
        @update:page="setPage"
      />
    </template>
  </div>
</template>

<style scoped>
.news-page {
  max-width: 880px;
  margin: 0 auto;
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.news-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.news-page__title {
  font-size: var(--text-page-title);
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.news-page__subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
}

.news-page__filter {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--bg-overlay);
}

.news-page__chip {
  padding: 6px 14px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease, background 120ms ease;
}

.news-page__chip:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.news-page__chip--active {
  border-color: var(--chip-accent);
  color: var(--chip-accent);
  background: color-mix(in srgb, var(--chip-accent) 10%, transparent);
}

.news-page__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.news-page__section-title {
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.news-page__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

@media (max-width: 767px) {
  .news-page {
    padding: var(--space-md);
  }
}
</style>
