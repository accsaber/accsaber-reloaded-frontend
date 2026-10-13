<script setup lang="ts">
import NavbarPopover from '@/components/layout/NavbarPopover.vue'
import type { MissionResponse } from '@/types/api/missions'
import { defineAsyncComponent } from 'vue'

const MissionsPanel = defineAsyncComponent(() => import('@/components/domain/MissionsPanel.vue'))

async function loadActive(): Promise<MissionResponse[]> {
  const { getMyMissions } = await import('@/api/missions')
  const [personal, clan] = await Promise.all([getMyMissions(), getMyMissions({ pool: 'clan' })])
  return [...personal, ...clan]
}

async function loadHistory(): Promise<MissionResponse[]> {
  const { getMyCompletedMissions } = await import('@/api/missions')
  return getMyCompletedMissions()
}
</script>

<template>
  <NavbarPopover label="Missions" width="440px">
    <template #trigger>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    </template>

    <MissionsPanel :load-active="loadActive" :load-history="loadHistory" self-view hide-event-pool />
  </NavbarPopover>
</template>
