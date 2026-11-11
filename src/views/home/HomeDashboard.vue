<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type { ScoreRelationType } from '@/types/api/relations'
import type { CategoryCode, Tab } from '@/types/display'
import { computed, ref } from 'vue'
import HomeActions from './HomeActions.vue'
import HomeFeed from './HomeFeed.vue'
import HomeRanking from './HomeRanking.vue'

const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const relation = ref<ScoreRelationType>('follower')
const category = ref<CategoryCode>('overall')
const accent = computed(() => categoryStore.getAccent(category.value))

const relationTabs: Tab[] = [
  { key: 'follower', label: 'Following' },
  { key: 'rival', label: 'Rivals' },
]
</script>

<template>
  <div class="dashboard" :style="{ '--page-accent': accent }">
    <div class="dashboard__top">
      <h1>Welcome back, <span class="dashboard__name">{{ authStore.userProfile?.name }}</span></h1>
      <HomeActions />
    </div>
    <div class="dashboard__filters">
      <BaseTabs v-model="relation" :tabs="relationTabs" variant="segmented" label="Players shown" />
      <CategoryTabs v-model="category" :exclude="['xp']" />
    </div>
    <div class="dashboard__panels">
      <HomeRanking :relation="relation" :category="category" />
      <HomeFeed :relation="relation" :category="category" />
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
}

.dashboard__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.dashboard__name {
  color: var(--accent-overall);
}

.dashboard__filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-sm) var(--space-md);
}

.dashboard__panels {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: var(--space-xl);
}

@media (max-width: 767px) {
  .dashboard__filters :deep(.category-tabs.base-tabs .base-tabs__tab) {
    flex: 1;
    padding-inline: var(--space-sm);
  }
}

@media (max-width: 960px) {
  .dashboard__panels {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
