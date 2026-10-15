<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import Breadcrumbs from '@/components/common/Breadcrumbs.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePlaylistDownload } from '@/composables/usePlaylistDownload'

const { playlistCategories, downloadPlaylist } = usePlaylistDownload()

usePageMeta({
  title: 'Getting Started | AccSaber',
  description: 'Learn how to get started with AccSaber and start competing on accuracy leaderboards.',
})
</script>

<template>
  <div class="gs">
    <Breadcrumbs :crumbs="[{ label: 'Home', to: '/' }, { label: 'Getting Started' }]" />
    <PageHeaderBleed title="Getting Started" subtitle="Three steps to the leaderboards." />

    <ol class="gs__steps">
      <li class="gs__step">
        <h2 class="section-title">Install a Leaderboard Mod</h2>
        <p class="gs__prose">
          You need a mod to submit scores. Grab
          <a href="https://beatleader.com/" target="_blank" rel="noopener noreferrer" class="gs__link">BeatLeader</a>
          (recommended) or
          <a href="https://scoresaber.com/" target="_blank" rel="noopener noreferrer" class="gs__link">ScoreSaber</a>
          for your platform - PC or Quest.
        </p>
        <BaseButton href="/download" variant="primary">Download our new AccSaber mod</BaseButton>
      </li>

      <li class="gs__step">
        <h2 class="section-title">Download the Playlists</h2>
        <p class="gs__prose">
          Grab the ranked map playlists and drop them into your
          <code class="gs__code">Playlists</code> folder. Pick the categories you want to play.
        </p>
        <div class="gs__playlists">
          <BaseButton v-for="cat in playlistCategories" :key="cat.code" size="sm" @click="downloadPlaylist(cat.code)">
            <span class="gs__dot" :style="{ background: cat.accent }" />
            {{ cat.name }}
          </BaseButton>
        </div>
      </li>

      <li class="gs__step">
        <h2 class="section-title">Play and See Results</h2>
        <p class="gs__prose">
          Play the maps from the playlists. Your scores are automatically submitted and will
          appear on the <RouterLink to="/leaderboards" class="gs__link">leaderboards</RouterLink>.
          Browse all the <RouterLink to="/maps" class="gs__link">ranked maps</RouterLink>
          to find your next challenge.
        </p>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.gs {
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
  padding: var(--space-lg) var(--space-lg) var(--space-3xl);
}

.gs__steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
  margin: 0;
  padding-left: var(--space-lg);
}

.gs__step::marker {
  color: var(--accent-overall);
  font-family: var(--font-mono);
  font-size: var(--text-section-heading);
  font-weight: 600;
}

.gs__step > * + * {
  margin-top: var(--space-md);
}

.gs__prose {
  font-size: var(--text-body);
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
}

.gs__link {
  color: var(--accent-overall);
  font-weight: 600;
  text-decoration: none;
}

.gs__link:hover {
  text-decoration: underline;
}

.gs__code {
  font-family: var(--font-code);
  font-size: 0.8125em;
  background: var(--bg-elevated);
  color: var(--text-primary);
  padding: 1px 6px;
  border-radius: var(--radius-btn);
}

.gs__playlists {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.gs__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

@media (max-width: 767px) {
  .gs {
    padding: var(--space-md) var(--space-md) var(--space-2xl);
  }
}
</style>
