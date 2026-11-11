<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import type { PublicNewsResponse } from '@/types/api/news'
import { readStoredString, writeStoredString } from '@/utils/storage'
import { computed, onMounted, ref } from 'vue'

const DISMISS_KEY = 'accsaber:news-banner-dismissed'
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const news = ref<PublicNewsResponse | null>(null)
const dismissed = ref(false)

function isDismissed(id: string): boolean {
  return readStoredString(DISMISS_KEY) === id
}

function isRecent(iso: string | null): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < WINDOW_MS
}

const target = computed(() => (news.value ? { path: '/news', query: { post: news.value.slug } } : '/news'))
const visible = computed(() => news.value !== null && !dismissed.value)

function dismiss() {
  if (news.value) writeStoredString(DISMISS_KEY, news.value.id)
  dismissed.value = true
}

onMounted(async () => {
  try {
    const { getNews } = await import('@/api/news')
    const res = await getNews({ size: 1, page: 0 })
    const latest = res.content[0]
    if (!latest || !isRecent(latest.publishedAt)) return
    if (isDismissed(latest.id)) return
    news.value = latest
  } catch {
  }
})
</script>

<template>
  <Transition name="fade">
    <BaseBanner v-if="visible && news" class="news-banner" role="status" @close="dismiss">
      <router-link :to="target" class="news-banner__link">
        <span class="news-banner__title">{{ news.title }}</span>
        <span v-if="news.description" class="news-banner__desc">{{ news.description }}</span>
      </router-link>
    </BaseBanner>
  </Transition>
</template>

<style scoped>
.news-banner {
  max-width: none;
  min-height: 40px;
  margin: 0;
  padding-block: 0;
  background: var(--bg-surface);
}

.news-banner__link {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.news-banner__title {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--text-primary);
}

.news-banner__desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .news-banner__desc {
    display: none;
  }
}
</style>
