<script setup lang="ts">
import { getHealth } from '@/api/health'
import ParticleCanvas from '@/components/common/ParticleCanvas.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import NewsHighlightBanner from '@/components/domain/NewsHighlightBanner.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { tierKey, useLevelStore } from '@/stores/levels'
import { useThemeStore } from '@/stores/theme'
import { computed, onMounted, ref } from 'vue'
import HomeDashboard from './home/HomeDashboard.vue'
import HomeLanding from './home/HomeLanding.vue'

const themeStore = useThemeStore()
const levelStore = useLevelStore()
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

function levelRange(index: number): string {
  const all = levelStore.thresholds
  const next = all[index + 1]
  return next ? `${all[index].level}–${next.level - 1}` : `${all[index].level}+`
}

onMounted(() => {
  if (!levelStore.loaded) void levelStore.fetchThresholds()
  getHealth()
    .then((health) => {
      if (health.version) backendLabel.value = buildLabel(health.version, health.channel ?? '')
    })
    .catch(() => {})
})
</script>

<template>
  <div class="home">
    <section class="hero" :class="{ 'hero--landing': !authStore.isLoggedIn }">
      <div class="hero__banner">
        <NewsHighlightBanner />
      </div>
      <div v-if="showParticles" class="hero__particles">
        <ParticleCanvas
          :dark-mode="themeStore.resolvedBase === 'dark'"
          :interactive="!authStore.isLoggedIn"
        />
      </div>
      <HomeDashboard v-if="authStore.isLoggedIn" class="hero__content" />
      <HomeLanding v-else class="hero__content" />
      <svg
        v-if="authStore.isLoggedIn"
        class="hero__scroll-hint"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="7 13 12 18 17 13" />
        <polyline points="7 6 12 11 17 6" />
      </svg>
    </section>

    <section class="xp">
      <h2 class="xp__title">The XP System</h2>

      <div v-if="!levelStore.loaded" class="xp__skeleton">
        <SkeletonLoader v-for="i in 7" :key="i" width="72px" height="52px" />
      </div>

      <div v-else-if="levelStore.thresholds.length > 0" class="xp__marquee">
        <div class="xp__track">
          <template v-for="copy in 2" :key="copy">
            <div
              v-for="(tier, i) in levelStore.thresholds"
              :key="`${copy}-${tier.level}`"
              class="xp__step"
              :aria-hidden="copy === 2"
              :style="{ '--tier': `var(--tier-${tierKey(tier.title)})` }"
            >
              <div class="xp__tier">
                <span class="xp__node" />
                <span class="xp__name">{{ tier.title }}</span>
                <span class="xp__range">Lv. {{ levelRange(i) }}</span>
              </div>
              <svg v-if="i < levelStore.thresholds.length - 1" class="xp__arrow" viewBox="0 0 40 16" aria-hidden="true">
                <line x1="0" y1="8" x2="32" y2="8" stroke="currentColor" stroke-width="2" />
                <polygon points="40,8 32,3 32,13" fill="currentColor" />
              </svg>
            </div>
            <div class="xp__divider" />
          </template>
        </div>
      </div>
    </section>

    <footer class="home-footer">
      <p class="home-footer__text">Logo by Brylanbbab and Interz.</p>
      <nav class="home-footer__links" aria-label="Footer links">
        <template v-for="(link, index) in FOOTER_LINKS" :key="link.label">
          <span v-if="index > 0" class="home-footer__sep" aria-hidden="true">·</span>
          <a v-if="link.href" :href="link.href" target="_blank" rel="noopener noreferrer" class="home-footer__link">
            {{ link.label }}
          </a>
          <RouterLink v-else-if="link.to" :to="link.to" class="home-footer__link">
            {{ link.label }}
          </RouterLink>
        </template>
      </nav>
      <p class="home-footer__versions">
        <span>Frontend {{ frontendLabel }}</span>
        <template v-if="backendLabel">
          <span class="home-footer__sep" aria-hidden="true">·</span>
          <span>Backend {{ backendLabel }}</span>
        </template>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
  max-width: 1030px;
  margin: 0 auto;
  width: 100%;
  padding-bottom: var(--space-3xl);
}

.hero {
  position: relative;
  min-height: calc(100svh + var(--space-xl));
  margin-top: calc((var(--navbar-height) + var(--space-xl)) * -1);
  padding: calc(var(--navbar-height) + var(--space-2xl) + var(--space-xl)) var(--space-md) var(--space-xl);
}

.hero--landing {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: calc(var(--navbar-height) + var(--space-md));
  padding-bottom: var(--space-3xl);
  overflow-y: clip;
}

.hero__banner {
  position: absolute;
  top: calc(var(--navbar-height) + var(--space-md));
  left: 0;
  right: 0;
  z-index: 60;
  padding: 0 var(--space-md);
  pointer-events: none;
}

.hero__banner > * {
  pointer-events: auto;
  margin-bottom: 0;
}

.hero__particles {
  position: absolute;
  inset: 0 auto 0 calc(50% - 50vw);
  width: 100vw;
  overflow: hidden;
  z-index: 1;
}

.hero__scroll-hint {
  position: absolute;
  top: calc(100svh - var(--space-2xl));
  left: 50%;
  z-index: 2;
  width: 20px;
  height: 20px;
  color: var(--accent-overall);
  pointer-events: none;
  animation: scroll-float 2s ease-in-out infinite;
}

@keyframes scroll-float {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
    opacity: 0.7;
  }

  50% {
    transform: translateX(-50%) translateY(8px);
    opacity: 1;
  }
}

@media (max-height: 720px) {
  .hero__scroll-hint {
    display: none;
  }
}

.hero__content {
  position: relative;
  z-index: 2;
}

.xp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  padding: 0 var(--space-md);
}

.xp__title {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
}

.xp__skeleton {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-xl) 0;
  width: 100%;
  overflow: hidden;
}

.xp__marquee {
  width: 100%;
  overflow: hidden;
  padding: var(--space-xl) 0;
  mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
}

.xp__track {
  display: flex;
  align-items: center;
  width: max-content;
  animation: xp-scroll 18s linear infinite;
}

.xp__marquee:hover .xp__track {
  animation-play-state: paused;
}

@keyframes xp-scroll {
  to {
    transform: translateX(-50%);
  }
}

.xp__step {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--tier);
}

.xp__tier {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  min-width: 72px;
  padding: 0 var(--space-xs);
}

.xp__node {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--bg-base);
  background: currentColor;
}

.xp__name {
  font-weight: 700;
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.xp__range {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.xp__arrow {
  width: 32px;
  height: 16px;
}

.xp__divider {
  flex-shrink: 0;
  width: 1px;
  height: 48px;
  background: var(--bg-overlay);
  margin: 0 var(--space-lg);
}

.home-footer {
  text-align: center;
  padding: var(--space-xl) var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.home-footer__text {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
}

.home-footer__links {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
  font-size: var(--text-caption);
}

.home-footer__link {
  color: var(--text-tertiary);
  text-decoration: none;
  transition: color 150ms ease;
}

.home-footer__link:hover,
.home-footer__link:focus-visible {
  color: var(--text-secondary);
}

.home-footer__sep {
  color: var(--text-tertiary);
  opacity: 0.55;
}

.home-footer__versions {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin: var(--space-sm) 0 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  opacity: 0.75;
}

@media (prefers-reduced-motion: reduce) {
  .xp__track,
  .hero__scroll-hint {
    animation: none;
  }
}

@media (max-width: 767px) {
  .hero {
    margin-top: calc((var(--navbar-height) + var(--space-md)) * -1);
    padding: calc(var(--navbar-height) + var(--space-2xl)) var(--space-md) var(--space-2xl);
  }

  .hero__scroll-hint {
    display: none;
  }
}
</style>
