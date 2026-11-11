<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePlaylistDownload } from '@/composables/usePlaylistDownload'
import { PLUGIN_RELEASES_URL } from '@/utils/constants'

const { playlistCategories, downloadPlaylist } = usePlaylistDownload()

usePageMeta({
  title: 'Getting Started | AccSaber',
  description: 'Learn how to get started with AccSaber and start competing on accuracy leaderboards.',
})
</script>

<template>
  <div class="gs stagger">
    <h1>Getting Started</h1>

    <section class="gs__step">
      <h2 class="section-title">Install the Mods</h2>
      <p class="gs__prose">
        Your scores reach us through
        <a href="https://beatleader.com/" target="_blank" rel="noopener noreferrer" class="gs__link">BeatLeader</a>,
        <a href="https://scoresaber.com/" target="_blank" rel="noopener noreferrer" class="gs__link">ScoreSaber</a>,
        or the AccSaber mod. Install any or all, knowing the AccSaber mod is the only one that submits attempts.
      </p>
      <div class="gs__actions">
        <BaseButton :href="PLUGIN_RELEASES_URL" variant="primary">AccSaber mod for PC</BaseButton>
        <BaseButton href="/quest" variant="primary">AccSaber mod for Quest</BaseButton>
      </div>
    </section>

    <section class="gs__step">
      <h2 class="section-title">Download the Playlists</h2>
      <p class="gs__prose">
        Grab the ranked map playlists for the categories you want to play and drop them into your
        <code class="gs__code">Playlists</code> folder.
      </p>
      <div class="gs__actions">
        <BaseButton v-for="cat in playlistCategories" :key="cat.code" @click="downloadPlaylist(cat.code)">
          <span :style="{ color: cat.accent }">{{ cat.name }}</span>
        </BaseButton>
      </div>
    </section>

    <section class="gs__step">
      <h2 class="section-title">Play and See Results</h2>
      <p class="gs__prose">
        Play the maps from the playlists. Your scores are submitted automatically and show up on the
        <RouterLink to="/leaderboards" class="gs__link">leaderboards</RouterLink>, and every
        <RouterLink to="/maps" class="gs__link">ranked map</RouterLink> is there to browse for your next one.
      </p>
    </section>
  </div>
</template>

<style scoped>
.gs {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
  padding: var(--space-lg) 0 var(--space-3xl);
}

.gs > :nth-child(2) { --i: 1; }
.gs > :nth-child(3) { --i: 2; }
.gs > :nth-child(4) { --i: 3; }

.gs__step {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.gs__prose {
  max-width: 65ch;
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
  text-wrap: pretty;
}

.gs__link {
  color: var(--accent-overall);
  font-weight: 600;
  text-decoration: none;
}

.gs__link:hover,
.gs__link:focus-visible {
  text-decoration: underline;
}

.gs__code {
  font-family: var(--font-code);
  font-size: 0.8125em;
  color: var(--text-primary);
}

.gs__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}
</style>
