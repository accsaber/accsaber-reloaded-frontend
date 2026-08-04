<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { MOBILE_MEDIA_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { usePageMeta } from '@/composables/usePageMeta'
import { formatFullDate } from '@/utils/formatters'
import {
  filterWikiSections,
  findWikiEntry,
  resolveRelated,
  WIKI_NAVIGATE_KEY,
  WIKI_SECTIONS,
  wikiSectionBadgeFor,
} from '@/wiki/registry'
import type { WikiEntry, WikiTocItem } from '@/wiki/types'
import WikiAside from '@/wiki/WikiAside.vue'
import WikiRail from '@/wiki/WikiRail.vue'
import {
  computed,
  defineAsyncComponent,
  markRaw,
  nextTick,
  onUnmounted,
  provide,
  ref,
  shallowRef,
  watch,
  type Component,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY)
const mobileView = ref<'rail' | 'detail'>('rail')

const search = ref('')
const sections = computed(() => filterWikiSections(WIKI_SECTIONS, search.value.trim().toLowerCase()))

const WikiHome = defineAsyncComponent(() => import('@/wiki/WikiHome.vue'))

const requestedSlug = computed(() => (route.params.slug as string | undefined) ?? null)
const activeEntry = computed<WikiEntry | null>(() =>
  requestedSlug.value ? findWikiEntry(requestedSlug.value) : null,
)
const notFound = computed(() => !!requestedSlug.value && !activeEntry.value)
const isHome = computed(() => !requestedSlug.value)

const sectionAccent = computed(() =>
  activeEntry.value ? (wikiSectionBadgeFor(activeEntry.value.slug)?.accent ?? null) : null,
)

const accentVars = computed(() =>
  sectionAccent.value
    ? { '--page-accent': sectionAccent.value, '--accent': sectionAccent.value }
    : undefined,
)
const related = computed(() => (activeEntry.value ? resolveRelated(activeEntry.value) : []))

const article = shallowRef<Component | null>(null)
const loading = ref(false)
const articleHost = ref<HTMLElement | null>(null)
const toc = ref<WikiTocItem[]>([])
const activeAnchor = ref<string | null>(null)

usePageMeta({
  title: computed(() =>
    activeEntry.value ? `${activeEntry.value.title} | AccSaber Wiki` : 'Wiki | AccSaber',
  ),
  description: computed(
    () => activeEntry.value?.summary ?? 'Everything about AccSaber, explained like a human would.',
  ),
  url: computed(() =>
    activeEntry.value
      ? `${window.location.origin}/wiki/${activeEntry.value.slug}`
      : `${window.location.origin}/wiki`,
  ),
  type: computed(() => (activeEntry.value ? 'article' : 'website')),
})

provide(WIKI_NAVIGATE_KEY, () => {
  mobileView.value = 'detail'
})

let observer: IntersectionObserver | null = null
let loadToken = 0

function collectToc() {
  const host = articleHost.value
  if (!host) return
  const items: WikiTocItem[] = []
  for (const el of host.querySelectorAll<HTMLElement>('[data-wiki-heading]')) {
    const label = el.querySelector('.wiki-heading__text')?.textContent?.trim()
    if (el.id && label) {
      items.push({ id: el.id, label, level: el.dataset.wikiHeading === '3' ? 3 : 2 })
    }
  }
  toc.value = items
  observer?.disconnect()
  if (!items.length) return
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.find((entry) => entry.isIntersecting)
      if (visible) activeAnchor.value = visible.target.id
    },
    { rootMargin: '0px 0px -70% 0px' },
  )
  for (const el of host.querySelectorAll('[data-wiki-heading]')) observer.observe(el)
}

function syncScroll() {
  const hash = route.hash.slice(1)
  if (hash) {
    document.getElementById(hash)?.scrollIntoView()
  } else {
    window.scrollTo({ top: 0 })
  }
}

watch(
  activeEntry,
  async (entry) => {
    toc.value = []
    activeAnchor.value = null
    observer?.disconnect()
    if (!entry) {
      article.value = null
      return
    }
    const token = ++loadToken
    loading.value = true
    try {
      const mod = await entry.loader()
      if (token !== loadToken) return
      article.value = markRaw(mod.default)
    } finally {
      if (token === loadToken) loading.value = false
    }
    await nextTick()
    collectToc()
    syncScroll()
  },
  { immediate: true },
)

watch(
  requestedSlug,
  (slug) => {
    if (slug) mobileView.value = 'detail'
  },
  { immediate: true },
)

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div class="wiki" :style="accentVars">
    <WikiRail
      v-show="!isMobile || mobileView === 'rail'"
      class="wiki__rail"
      :sections="sections"
      :search="search"
      :active-slug="activeEntry?.slug ?? null"
      @update:search="search = $event"
    />

    <main
      v-show="!isMobile || mobileView === 'detail'"
      class="wiki__main"
      :class="{ 'wiki__main--wide': !activeEntry }"
    >
      <button v-if="isMobile" type="button" class="wiki__back" @click="mobileView = 'rail'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Index
      </button>

      <EmptyState
        v-if="notFound"
        message="No document lives at this address."
        action-label="Open the wiki"
        @action="router.push('/wiki')"
      />

      <WikiHome v-else-if="isHome" />

      <article v-else-if="activeEntry" class="wiki__article">
        <header class="wiki__header">
          <h1 class="wiki__title">{{ activeEntry.title }}</h1>
          <p class="wiki__summary">{{ activeEntry.summary }}</p>
          <p class="wiki__updated">Updated {{ formatFullDate(activeEntry.updated) }}</p>
        </header>

        <div v-if="loading" class="wiki__skeleton">
          <SkeletonLoader variant="text" width="90%" />
          <SkeletonLoader variant="text" width="100%" />
          <SkeletonLoader variant="text" width="75%" />
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="text" width="85%" />
        </div>

        <div v-else ref="articleHost">
          <component :is="article" v-if="article" />
        </div>
      </article>
    </main>

    <WikiAside
      v-show="!isMobile || mobileView === 'detail'"
      v-if="!notFound && (toc.length || related.length)"
      class="wiki__aside"
      :toc="toc"
      :related="related"
      :active-anchor="activeAnchor"
    />
  </div>
</template>

<style scoped>
.wiki {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 260px;
  gap: var(--space-2xl);
  max-width: 1600px;
  margin: 0 auto;
  align-items: start;
}

.wiki__rail {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-md));
  align-self: start;
  max-height: calc(100vh - var(--navbar-height) - var(--space-lg));
  overflow-y: auto;
  padding-right: var(--space-lg);
  border-right: 1px solid var(--bg-overlay);
}

.wiki__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.wiki__main--wide {
  grid-column: 2 / -1;
}

.wiki__aside {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-md));
  align-self: start;
  max-height: calc(100vh - var(--navbar-height) - var(--space-lg));
  overflow-y: auto;
}

.wiki__back {
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

.wiki__back:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.wiki__article {
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.wiki__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-bottom: var(--space-lg);
  border-bottom: 1px solid var(--bg-overlay);
}

.wiki__title {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.wiki__summary {
  margin: 0;
  font-size: 1.05rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.wiki__updated {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.wiki__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

@media (max-width: 1279px) {
  .wiki {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .wiki__rail {
    grid-row: 1 / span 2;
  }

  .wiki__aside {
    grid-column: 2;
    position: static;
    max-height: none;
  }

  .wiki__aside :deep(.wiki-aside__toc) {
    display: none;
  }
}

@media (max-width: 959px) {
  .wiki {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
  }

  .wiki__main--wide {
    grid-column: auto;
  }

  .wiki__rail {
    position: static;
    grid-row: auto;
    max-height: none;
    overflow: visible;
    padding-right: 0;
    border-right: none;
  }

  .wiki__aside {
    grid-column: 1;
  }
}
</style>
