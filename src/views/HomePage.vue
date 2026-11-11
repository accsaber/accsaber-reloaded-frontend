<script setup lang="ts">
import { getHealth } from '@/api/health'
import ParticleCanvas from '@/components/common/ParticleCanvas.vue'
import NewsHighlightBanner from '@/views/home/NewsHighlightBanner.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { computed, onMounted, ref } from 'vue'
import HomeDashboard from './home/HomeDashboard.vue'
import HomeLanding from './home/HomeLanding.vue'

const themeStore = useThemeStore()
const authStore = useAuthStore()

usePageMeta({
  title: 'AccSaber',
  description: 'Accuracy-based leaderboard platform for Beat Saber.',
})

const showParticles = computed(() => themeStore.activeTokens?.['fx-hero-particles'] !== '0')

const FOOTER_LINKS: { label: string; to?: string; href?: string }[] = [
  { label: 'GitHub (Site)', href: 'https://github.com/accsaber/accsaber-reloaded-frontend' },
  { label: 'GitHub (API)', href: 'https://github.com/accsaber/accsaber-reloaded-backend' },
  { label: 'Score Feed', to: '/score-feed' },
  { label: 'Credits', to: '/credits' },
]

function buildLabel(version: string, channel: string): string {
  const build = /^\d+\.\d+\.\d+/.test(version) ? `v${version}` : version
  return channel ? `${channel} ${build}` : build
}

const frontendLabel = buildLabel(__APP_VERSION__, __APP_CHANNEL__)
const backendLabel = ref<string | null>(null)

onMounted(() => {
  getHealth()
    .then((health) => {
      if (health.version) backendLabel.value = buildLabel(health.version, health.channel ?? '')
    })
    .catch(() => {})
})
</script>

<template>
  <div class="home">
    <div v-if="showParticles" class="home__particles">
      <ParticleCanvas :dark-mode="themeStore.resolvedBase === 'dark'" :interactive="!authStore.isLoggedIn" />
    </div>

    <div class="home__banner">
      <NewsHighlightBanner />
    </div>

    <HomeDashboard v-if="authStore.isLoggedIn" />
    <HomeLanding v-else />

    <footer class="home-footer">
      <nav class="home-footer__row" aria-label="Footer links">
        <template v-for="link in FOOTER_LINKS" :key="link.label">
          <a v-if="link.href" :href="link.href" target="_blank" rel="noopener noreferrer" class="home-footer__link">
            {{ link.label }}
          </a>
          <RouterLink v-else-if="link.to" :to="link.to" class="home-footer__link">
            {{ link.label }}
          </RouterLink>
        </template>
      </nav>
      <p class="home-footer__row">
        <span>Logo by Brylanbbab and Interz</span>
        <span>Frontend {{ frontendLabel }}</span>
        <span v-if="backendLabel">Backend {{ backendLabel }}</span>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1200px;
  min-height: calc(100svh - var(--navbar-height) - var(--space-xl) * 2);
  margin: 0 auto;
  width: 100%;
}

.home__particles {
  position: absolute;
  inset: calc((var(--navbar-height) + var(--space-xl)) * -1) auto calc(var(--space-xl) * -1) calc(50% - 50vw);
  width: 100vw;
  overflow: hidden;
  z-index: -1;
}

.home__banner {
  min-height: 40px;
}

.home-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: auto;
  padding-top: var(--space-3xl);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.home-footer__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-xs) var(--space-md);
  margin: 0;
}

.home-footer__link {
  padding-block: var(--space-sm);
  color: inherit;
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease-out);
}

.home-footer__link:hover,
.home-footer__link:focus-visible {
  color: var(--text-primary);
}

@media (max-width: 767px) {
  .home {
    min-height: calc(100svh - var(--navbar-height) - var(--space-md) * 2);
  }
}
</style>
