<script setup lang="ts">
import NewsTypeBadge from '@/components/domain/NewsTypeBadge.vue'
import type { PublicNewsResponse } from '@/types/api/news'
import { NEWS_TYPE_ACCENT } from '@/utils/constants'
import { formatRelativeDate } from '@/utils/formatters'
import { computed } from 'vue'

const props = defineProps<{
  news: PublicNewsResponse
}>()

const accent = computed(() => NEWS_TYPE_ACCENT[props.news.type])
const dateLabel = computed(() => (props.news.publishedAt ? formatRelativeDate(props.news.publishedAt) : ''))
const target = computed(() => `/news/${props.news.slug}`)
</script>

<template>
  <router-link
    :to="target"
    class="news-card"
    :class="{ 'news-card--pinned': news.pinned, 'news-card--no-image': !news.imageUrl }"
    :style="{ '--card-accent': accent }"
  >
    <div v-if="news.imageUrl" class="news-card__image">
      <img :src="news.imageUrl" :alt="news.title" loading="lazy" />
    </div>

    <div class="news-card__body">
      <div class="news-card__meta">
        <NewsTypeBadge :type="news.type" size="sm" />
        <span v-if="news.pinned" class="news-card__pin" aria-label="Pinned">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
          Pinned
        </span>
        <span v-if="dateLabel" class="news-card__date">{{ dateLabel }}</span>
      </div>

      <h3 class="news-card__title">{{ news.title }}</h3>
      <p v-if="news.description" class="news-card__description">{{ news.description }}</p>

      <div v-if="news.authorName" class="news-card__author">by {{ news.authorName }}</div>
    </div>
  </router-link>
</template>

<style scoped>
.news-card {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease;
}

.news-card--no-image {
  grid-template-columns: 4px 1fr;
}

.news-card--no-image::before {
  content: '';
  background: color-mix(in srgb, var(--card-accent) 60%, transparent);
}

.news-card--no-image .news-card__body {
  padding: var(--space-lg);
}

.news-card:hover {
  border-color: var(--text-tertiary);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

.news-card--pinned {
  border-color: color-mix(in srgb, var(--card-accent) 45%, var(--bg-overlay));
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--card-accent) 6%, var(--bg-surface)) 0%,
    var(--bg-surface) 60%
  );
}

.news-card--pinned:hover {
  border-color: var(--card-accent);
}

.news-card__image {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--bg-elevated);
  overflow: hidden;
}

.news-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.news-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-lg) var(--space-lg) var(--space-lg) 0;
  min-width: 0;
}

.news-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.news-card__pin {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--card-accent);
}

.news-card__date {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.news-card__title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-card__description {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-card__author {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  margin-top: auto;
}

@media (max-width: 720px) {
  .news-card {
    grid-template-columns: 1fr;
  }

  .news-card--no-image {
    grid-template-columns: 1fr;
    border-left: 4px solid color-mix(in srgb, var(--card-accent) 60%, transparent);
  }

  .news-card--no-image::before {
    display: none;
  }

  .news-card__image {
    aspect-ratio: 16 / 9;
  }

  .news-card__body {
    padding: var(--space-md) var(--space-lg) var(--space-lg);
  }

  .news-card--no-image .news-card__body {
    padding: var(--space-md);
  }
}
</style>
