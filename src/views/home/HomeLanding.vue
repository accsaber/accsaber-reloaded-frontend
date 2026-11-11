<script setup lang="ts">
import { useBrandLogo } from '@/composables/useBrandLogo'
import HomeActions from './HomeActions.vue'
import HomeRanking from './HomeRanking.vue'

const logoUrl = useBrandLogo()
</script>

<template>
  <div class="landing">
    <div class="landing__hero">
      <img :src="logoUrl" alt="AccSaber" class="landing__logo" width="144" height="144" fetchpriority="high"
        decoding="async" />
      <h1 class="landing__title">The accuracy leaderboard<br />for Beat Saber</h1>
      <HomeActions class="landing__actions" />
    </div>
    <HomeRanking class="landing__ranking" />
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3xl);
}

.landing__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  padding-top: var(--space-2xl);
  text-align: center;
}

.landing__logo {
  width: 144px;
  height: 144px;
  object-fit: contain;
}

.landing__title {
  font-size: 2.5rem;
  line-height: 1.15;
}

.landing__actions {
  justify-content: center;
}

.landing__ranking {
  width: 100%;
  max-width: 640px;
}

@media (max-width: 767px) {
  .landing {
    gap: var(--space-2xl);
  }

  .landing__hero {
    padding-top: var(--space-md);
  }

  .landing__logo {
    width: 96px;
    height: 96px;
  }

  .landing__title {
    font-size: var(--text-page-title);
  }
}
</style>
