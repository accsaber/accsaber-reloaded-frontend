<script setup lang="ts">
import WikiDocCard from '@/wiki/components/WikiDocCard.vue'
import { findWikiEntry } from '@/wiki/registry'
import type { WikiEntry } from '@/wiki/types'
import WikiConceptField, { type WikiConcept } from '@/wiki/WikiConceptField.vue'

const CONCEPTS: WikiConcept[] = [
  { label: 'AP', accentToken: '--accent-overall' },
  { label: 'Weighting', accentToken: '--accent-standard-acc' },
  { label: 'The Curve', accentToken: '--accent-standard-acc' },
  { label: 'Complexity', accentToken: '--accent-standard-acc' },
  { label: 'True Acc', accentToken: '--accent-true-acc' },
  { label: 'Standard Acc', accentToken: '--accent-standard-acc' },
  { label: 'Tech Acc', accentToken: '--accent-tech-acc' },
  { label: 'Overall', accentToken: '--accent-overall' },
  { label: 'The Plugin', accentToken: '--accent-overall' },
  { label: 'BeatLeader', accentToken: '--accent-overall' },
  { label: 'ScoreSaber', accentToken: '--accent-overall' },
  { label: 'Ranked Maps', accentToken: '--diff-hard' },
  { label: 'Batches', accentToken: '--diff-hard' },
  { label: 'Reweights', accentToken: '--diff-hard' },
  { label: 'The Queue', accentToken: '--diff-hard' },
  { label: 'Criteria', accentToken: '--diff-hard' },
  { label: 'XP', accentToken: '--tier-platinum' },
  { label: 'Levels', accentToken: '--tier-platinum' },
  { label: 'Milestones', accentToken: '--tier-platinum' },
  { label: 'Missions', accentToken: '--tier-platinum' },
  { label: 'Events', accentToken: '--tier-platinum' },
  { label: 'Campaigns', accentToken: '--campaign-loved' },
  { label: 'Crates', accentToken: '--tier-apex' },
  { label: 'Unusual Effects', accentToken: '--tier-apex' },
  { label: 'Themes', accentToken: '--tier-apex' },
  { label: 'Essence', accentToken: '--tier-apex' },
  { label: 'The Market', accentToken: '--tier-apex' },
  { label: 'Trading', accentToken: '--tier-apex' },
  { label: 'Snipes', accentToken: '--accent-standard-acc' },
  { label: 'Leaderboards', accentToken: '--accent-standard-acc' },
]

const MOST_ASKED = ['accuracy-and-ap', 'weighted-ap', 'getting-your-scores-counted']

const mostAsked = MOST_ASKED
  .map(findWikiEntry)
  .filter((entry): entry is WikiEntry => !!entry)
</script>

<template>
  <div class="home">
    <header class="home__hero">
      <WikiConceptField :concepts="CONCEPTS" />
      <div class="home__hero-inner">
        <h1 class="home__title">The AccSaber Wiki</h1>
        <p class="home__tagline">Everything about the platform, explained.</p>
      </div>
    </header>

    <div class="home__below">
      <div class="home__blurb">
        <p>
          This wiki covers all of AccSaber: how a score turns into AP, how maps get ranked, what
          every system does and why it works that way. It is written for players first, so plain
          words and real examples beat technical vocabulary everywhere except the developer
          corner.
        </p>
        <p>
          It exists because guessing sucks. The mechanics run deep, and for too long the answers
          lived scattered across Discord threads. Now they live here, maintained right alongside
          the platform itself so they never drift from the truth.
        </p>
      </div>

      <section class="home__section">
        <h2 class="home__section-title">Most asked</h2>
        <div class="home__cards">
          <WikiDocCard v-for="entry in mostAsked" :key="entry.slug" :entry="entry" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
  max-width: 1080px;
}

.home__hero {
  position: relative;
  min-height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home__hero-inner {
  position: relative;
  text-align: center;
  padding: var(--space-xl);
}

.home__title {
  margin: 0;
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.15;
}

.home__tagline {
  margin: var(--space-sm) 0 0;
  font-size: 1.05rem;
  color: var(--text-secondary);
}

.home__below {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--space-2xl);
  align-items: start;
}

.home__blurb {
  max-width: 68ch;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-primary);
}

.home__blurb p {
  margin: 0 0 var(--space-md);
}

.home__blurb p:last-child {
  margin-bottom: 0;
}

.home__section-title {
  margin: 0 0 var(--space-md);
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.home__cards {
  display: grid;
  gap: var(--space-md);
}

@media (max-width: 959px) {
  .home__below {
    grid-template-columns: 1fr;
    gap: var(--space-xl);
  }
}

@media (max-width: 639px) {
  .home__hero {
    flex-direction: column;
    align-items: stretch;
    min-height: 0;
  }

  .home__hero-inner {
    padding: var(--space-lg) 0 0;
  }
}
</style>
