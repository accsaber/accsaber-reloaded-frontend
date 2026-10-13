<script setup lang="ts">
import { useBrandLogo } from '@/composables/useBrandLogo'
import HomeActions from './HomeActions.vue'

const logoUrl = useBrandLogo()
</script>

<template>
  <div class="landing">
    <img :src="logoUrl" alt="AccSaber" class="landing__logo" fetchpriority="high" decoding="async" />
    <p class="landing__tagline">New and improved stack for AccSaber.</p>
    <HomeActions class="landing__actions" />
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  text-align: center;
}

.landing__logo {
  width: 120px;
  height: 120px;
  object-fit: contain;
}

.landing__tagline {
  margin: 0;
  font-size: var(--text-section-heading);
  color: var(--text-secondary);
}

.landing__actions {
  max-width: 420px;
  margin-top: var(--space-md);
}

@media (max-width: 767px) {
  .landing__logo {
    width: 80px;
    height: 80px;
  }

  .landing__tagline {
    font-size: var(--text-body);
  }
}
</style>
