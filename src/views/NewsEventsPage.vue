<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import NewsArticle from '@/components/domain/NewsArticle.vue'
import { MOBILE_MEDIA_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useNow } from '@/composables/useNow'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import type { EventResponse, EventState } from '@/types/api/events'
import type { PublicNewsResponse } from '@/types/api/news'
import type { NewsType } from '@/types/enums'
import { eventState } from '@/utils/events'
import EventDetailPane from '@/views/news/EventDetailPane.vue'
import NewsEventsRail from '@/views/news/NewsEventsRail.vue'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const now = useNow()

usePageMeta({
  title: 'News & Events | AccSaber',
  description: 'Live events, missions, and the latest AccSaber announcements.',
})

const events = shallowRef<EventResponse[]>([])
const news = shallowRef<PublicNewsResponse[]>([])
const linkedNews = shallowRef<PublicNewsResponse | null>(null)
const loadingEvents = ref(true)
const loadingNews = ref(true)

const eventFilter = ref<EventState | null>(null)
const newsFilter = ref<NewsType | null>(null)
const search = ref('')
const newsPage = ref(1)
const totalNewsPages = ref(0)

const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY)
const mobileView = ref<'rail' | 'detail'>('rail')

function setQuery(key: 'event' | 'post', value: string, clearKey: 'event' | 'post') {
  router.replace({ query: { ...route.query, [clearKey]: undefined, [key]: value } })
  mobileView.value = 'detail'
}

const selectedEventId = computed(() => (route.query.event as string) || null)
const selectedNewsSlug = computed(() => (route.query.post as string) || null)
const liveEvent = computed(() => events.value.find((e) => eventState(e, now.value) === 'live') ?? null)

type Selection = { kind: 'event'; id: string } | { kind: 'news'; id: string } | null

const activeSelection = computed<Selection>(() => {
  if (selectedNewsSlug.value) return { kind: 'news', id: selectedNewsSlug.value }
  if (selectedEventId.value) return { kind: 'event', id: selectedEventId.value }
  if (news.value.length) return { kind: 'news', id: news.value[0].slug }
  const fallback = liveEvent.value ?? events.value[0]
  return fallback ? { kind: 'event', id: fallback.slug } : null
})

const selectedNews = computed(() => {
  const selection = activeSelection.value
  if (selection?.kind !== 'news') return null
  const match = news.value.find((n) => n.slug === selection.id)
  return match ?? (linkedNews.value?.slug === selection.id ? linkedNews.value : null)
})

async function loadEvents() {
  try {
    const { getEvents } = await import('@/api/events')
    events.value = await getEvents()
  } catch {
    events.value = []
  }
  eventFilter.value = liveEvent.value ? 'live' : null
  loadingEvents.value = false
}

let newsRequest = 0

async function loadNews() {
  const id = ++newsRequest
  loadingNews.value = true
  try {
    const { getNews } = await import('@/api/news')
    const res = await getNews({
      page: newsPage.value - 1,
      size: 20,
      type: newsFilter.value ?? undefined,
      search: search.value.trim() || undefined,
    })
    if (id !== newsRequest) return
    news.value = res.content
    totalNewsPages.value = res.totalPages
  } catch {
    if (id !== newsRequest) return
    news.value = []
    totalNewsPages.value = 0
  }
  loadingNews.value = false
}

async function loadLinkedNews(slug: string) {
  try {
    const { getNewsBySlug } = await import('@/api/news')
    linkedNews.value = await getNewsBySlug(slug)
  } catch {
    linkedNews.value = null
  }
}

watch([newsFilter, search], () => { newsPage.value = 1 })
watch(() => `${newsPage.value}|${newsFilter.value}|${search.value.trim()}`, loadNews, { immediate: true })

watch([selectedNewsSlug, loadingNews], ([slug, loading]) => {
  if (!slug || loading || selectedNews.value) return
  void loadLinkedNews(slug)
})

onMounted(loadEvents)
</script>

<template>
  <div class="hub">
    <NewsEventsRail
      v-show="!isMobile || mobileView === 'rail'"
      v-model:event-filter="eventFilter"
      v-model:news-filter="newsFilter"
      v-model:search="search"
      v-model:news-page="newsPage"
      class="hub__rail"
      :events="events"
      :news="news"
      :now="now"
      :loading-events="loadingEvents"
      :loading-news="loadingNews"
      :active-kind="activeSelection?.kind ?? null"
      :active-id="activeSelection?.id ?? null"
      :total-news-pages="totalNewsPages"
      @select-event="setQuery('event', $event, 'post')"
      @select-news="setQuery('post', $event, 'event')"
    />

    <main v-show="!isMobile || mobileView === 'detail'" class="hub__main">
      <button v-if="isMobile" type="button" class="hub__back" @click="mobileView = 'rail'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back
      </button>

      <EventDetailPane
        v-if="activeSelection?.kind === 'event'"
        :key="activeSelection.id"
        :event-id="activeSelection.id"
        :logged-in="authStore.isLoggedIn"
        :now="now"
      />

      <div v-else-if="selectedNews" class="hub__article">
        <NewsArticle :news="selectedNews" />
      </div>

      <EmptyState v-else message="Select an event or news post to get started." />
    </main>
  </div>
</template>

<style scoped>
.hub {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: var(--space-2xl);
  max-width: 1600px;
  margin: 0 auto;
  align-items: start;
}

.hub__rail {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-md));
  align-self: start;
  max-height: calc(100vh - var(--navbar-height) - var(--space-lg));
  overflow-y: auto;
  padding-right: var(--space-lg);
  border-right: 1px solid var(--bg-overlay);
}

.hub__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.hub__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  padding: 6px 12px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease;
}

.hub__back:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.hub__article {
  max-width: 760px;
}

@media (max-width: 959px) {
  .hub {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
  }

  .hub__rail {
    position: static;
    max-height: none;
    overflow: visible;
    padding-right: 0;
    border-right: none;
  }
}
</style>
