<script setup lang="ts">
import { usePageMeta } from '@/composables/usePageMeta'
import ClanWarList from './clans/war/ClanWarList.vue'
import { useCurrentClanSeason } from './clans/useCurrentClanSeason'

const { running: seasonRunning } = useCurrentClanSeason()

usePageMeta({
  title: 'Clan Wars | AccSaber',
  description: 'Every clan war on AccSaber, newest first.',
})
</script>

<template>
  <div class="wars-page">
    <ClanWarList :season-running="seasonRunning">
      <template #title="{ count }">
        <h1>Wars</h1>
        <span v-if="count" class="caption">{{ count.toLocaleString() }} wars</span>
      </template>
    </ClanWarList>
  </div>
</template>

<style scoped>
.wars-page {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}
</style>
