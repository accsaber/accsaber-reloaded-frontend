<script setup lang="ts">
import { useBrandLogo } from '@/composables/useBrandLogo'
import { useAuthStore } from '@/stores/auth'
import FollowedActivity from './FollowedActivity.vue'
import HomeActions from './HomeActions.vue'

const authStore = useAuthStore()
const logoUrl = useBrandLogo()
</script>

<template>
  <div class="dashboard">
    <div class="dashboard__top">
      <img :src="logoUrl" alt="AccSaber" class="dashboard__logo" fetchpriority="high" decoding="async" />
      <h1 class="dashboard__welcome">
        Welcome back, <span class="dashboard__name">{{ authStore.userProfile?.name }}</span>
      </h1>
      <HomeActions class="dashboard__actions" />
    </div>
    <FollowedActivity />
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  width: 100%;
}

.dashboard__top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-lg);
}

.dashboard__logo {
  width: 156px;
  height: 156px;
  object-fit: contain;
}

.dashboard__welcome {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
}

.dashboard__name {
  color: var(--accent-overall);
}

.dashboard__actions {
  max-width: 360px;
  justify-content: flex-end;
}

@media (max-width: 767px) {
  .dashboard__top {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    gap: var(--space-md);
  }

  .dashboard__logo {
    width: 96px;
    height: 96px;
  }

  .dashboard__welcome {
    font-size: var(--text-section-heading);
  }

  .dashboard__actions {
    justify-content: center;
  }
}
</style>
