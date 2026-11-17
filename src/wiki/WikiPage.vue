<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
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
      <BaseButton v-if="isMobile" class="wiki__back" @click="mobileView = 'rail'">All Pages</BaseButton>

      <EmptyState
        v-if="notFound"
        message="No page at this address"
        action-label="Open the Wiki"
        @action="router.push('/wiki')"
      />

      <WikiHome v-else-if="isHome" />

      <article v-else-if="activeEntry" class="wiki__article">
        <header class="wiki__header">
          <h1 class="wiki__title">{{ activeEntry.title }}</h1>
          <p class="wiki__summary">{{ activeEntry.summary }}</p>
          <p class="caption">Updated {{ formatFullDate(activeEntry.updated) }}</p>
        </header>

        <div v-if="loading" class="wiki__skeleton">
          <SkeletonLoader variant="text" :lines="3" />
          <SkeletonLoader width="40%" height="28px" />
          <SkeletonLoader variant="text" :lines="4" />
          <SkeletonLoader width="50%" height="28px" />
          <SkeletonLoader variant="text" :lines="3" />
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
  grid-template-columns: 280px minmax(0, 760px) 260px;
  justify-content: center;
  gap: var(--space-2xl);
  align-items: start;
}

.wiki__rail,
.wiki__aside {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-md));
  align-self: start;
  max-height: calc(100vh - var(--navbar-height) - var(--space-lg));
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-overlay) transparent;
  padding: var(--space-md);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
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

.wiki__back {
  align-self: flex-start;
}

.wiki__article,
.wiki__main--wide > :deep(.home) {
  padding: var(--space-xl);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.wiki__article {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.wiki__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.wiki__title {
  line-height: 1.2;
  text-wrap: balance;
}

.wiki__summary {
  margin: 0;
  max-width: 50ch;
  font-size: var(--text-card-title);
  color: var(--text-secondary);
  line-height: 1.5;
  text-wrap: pretty;
}

.wiki__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 50ch;
}

@media (max-width: 1279px) {
  .wiki {
    grid-template-columns: 280px minmax(0, 760px);
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
    grid-template-columns: minmax(0, 1fr);
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
  }

  .wiki__aside {
    grid-column: 1;
  }

  .wiki__article,
  .wiki__main--wide > :deep(.home) {
    padding: var(--space-md);
  }
}
</style>
