<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import EventStatusGlyph from '@/views/news/EventStatusGlyph.vue'
import NewsTypeGlyph from '@/views/news/NewsTypeGlyph.vue'
import RailListCard from '@/views/news/RailListCard.vue'
import type { EventResponse, EventState } from '@/types/api/events'
import type { PublicNewsResponse } from '@/types/api/news'
import type { NewsType } from '@/types/enums'
import {
  EVENT_STATE_ACCENT,
  EVENT_STATE_LABELS,
  EVENT_STATE_ORDER,
  NEWS_TYPE_ACCENT,
  NEWS_TYPE_LABELS,
  NEWS_TYPE_ORDER,
} from '@/utils/constants'
import { EVENT_STATUS_COLOR, EVENT_STATUS_LABEL, eventCountdown, eventState, eventStatus } from '@/utils/events'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref } from 'vue'

const props = defineProps<{
  events: EventResponse[]
  news: PublicNewsResponse[]
  now: number
  loadingEvents: boolean
  loadingNews: boolean
  eventFilter: EventState | null
  newsFilter: NewsType | null
  search: string
  activeKind: 'event' | 'news' | null
  activeId: string | null
  newsPage: number
  totalNewsPages: number
}>()

const emit = defineEmits<{
  'select-event': [id: string]
  'select-news': [slug: string]
  'update:eventFilter': [value: EventState | null]
  'update:newsFilter': [value: NewsType | null]
  'update:search': [value: string]
  'update:newsPage': [value: number]
}>()

const filtersOpen = ref(false)
const filterActive = computed(() => props.eventFilter !== null || props.newsFilter !== null)

function matchesSearch(event: EventResponse): boolean {
  const query = props.search.trim().toLowerCase()
  return !query || [event.title, event.description].some((f) => !!f && f.toLowerCase().includes(query))
}

const eventCards = computed(() =>
  props.events
    .filter((e) => (!props.eventFilter || eventState(e, props.now) === props.eventFilter) && matchesSearch(e))
    .map((event) => {
      const status = eventStatus(event, props.now)
      return {
        event,
        status,
        badge: EVENT_STATUS_LABEL[status],
        color: EVENT_STATUS_COLOR[status],
        meta: eventCountdown(event, props.now),
      }
    }),
)

const ALL = 'all'

const eventStateTabs = [
  { key: ALL, label: 'All' },
  ...EVENT_STATE_ORDER.map((s) => ({ key: s, label: EVENT_STATE_LABELS[s], accentColor: EVENT_STATE_ACCENT[s] })),
]

const newsTypeTabs = [
  { key: ALL, label: 'All' },
  ...NEWS_TYPE_ORDER.map((t) => ({ key: t, label: NEWS_TYPE_LABELS[t], accentColor: NEWS_TYPE_ACCENT[t] })),
]
</script>

<template>
  <aside class="rail">
    <div class="rail__tools">
      <SearchBox
        :model-value="search"
        placeholder="Search events & news"
        @update:model-value="emit('update:search', $event)"
      />
      <FilterPopover v-model:open="filtersOpen">
        <template #trigger>
          <FilterButton :active="filtersOpen || filterActive" />
        </template>
        <div class="rail__filters">
          <span class="field-label">Events</span>
          <BaseTabs variant="segmented" label="Event state" :tabs="eventStateTabs" :model-value="eventFilter ?? ALL"
            @update:model-value="emit('update:eventFilter', $event === ALL ? null : ($event as EventState))" />
          <span class="field-label">News</span>
          <BaseTabs variant="segmented" label="News type" :tabs="newsTypeTabs" :model-value="newsFilter ?? ALL"
            @update:model-value="emit('update:newsFilter', $event === ALL ? null : ($event as NewsType))" />
        </div>
      </FilterPopover>
    </div>

    <section class="rail__section">
      <h2 class="field-label">Events</h2>
      <p v-if="!loadingEvents && !eventCards.length" class="caption">No events right now</p>
      <SwapList v-else class="rail__list" :items="eventCards" :item-key="(card) => card.event.id"
        :loading="loadingEvents" :placeholders="2">
        <template #placeholder>
          <SkeletonLoader class="placeholder" height="58px" />
        </template>
        <template #default="{ item: card, swap }">
          <RailListCard
            v-bind="swap"
            :title="card.event.title"
            :image-url="card.event.iconUrl ?? card.event.backgroundUrl"
            :meta="card.meta"
            :badge="card.badge"
            :accent="card.color"
            :active="activeKind === 'event' && activeId === card.event.slug"
            @select="emit('select-event', card.event.slug)"
          >
            <template #fallback>
              <EventStatusGlyph :status="card.status" />
            </template>
          </RailListCard>
        </template>
      </SwapList>
    </section>

    <section class="rail__section">
      <h2 class="field-label">News</h2>
      <EmptyState v-if="!loadingNews && !news.length" message="No news yet." />
      <SwapList v-else class="rail__list" :items="news" :item-key="(item) => item.id" :loading="loadingNews"
        :placeholders="6">
        <template #placeholder>
          <SkeletonLoader class="placeholder" height="58px" />
        </template>
        <template #default="{ item, swap }">
          <RailListCard
            v-bind="swap"
            :title="item.title"
            :image-url="item.imageUrl"
            :meta="item.publishedAt ? formatRelativeDate(item.publishedAt) : null"
            :badge="NEWS_TYPE_LABELS[item.type]"
            :accent="NEWS_TYPE_ACCENT[item.type]"
            :pinned="item.pinned"
            :active="activeKind === 'news' && activeId === item.slug"
            @select="emit('select-news', item.slug)"
          >
            <template #fallback>
              <NewsTypeGlyph :type="item.type" />
            </template>
          </RailListCard>
        </template>
      </SwapList>
      <PaginationControls
        v-if="totalNewsPages > 1"
        :page="newsPage"
        :total-pages="totalNewsPages"
        :sibling-count="0"
        @update:page="emit('update:newsPage', $event)"
      />
    </section>
  </aside>
</template>

<style scoped>
.rail,
.rail__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.rail__section {
  gap: var(--space-sm);
}

.rail__tools {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.rail__tools :deep(.search-box) {
  flex: 1;
}

.rail__filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: max-content;
  max-width: 100%;
}

.rail__filters :deep(.base-tabs) {
  display: grid;
  grid-template-columns: repeat(4, auto);
}

.rail__filters :deep(.base-tabs__tab) {
  justify-content: center;
  padding-inline: var(--space-sm);
  text-align: center;
}

@media (max-width: 767px) {
  .rail__filters {
    width: 100%;
  }
}

.rail__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
