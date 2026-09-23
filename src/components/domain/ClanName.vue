<script setup lang="ts">
import TitleRenderer from '@/components/cosmetics/titles/TitleRenderer.vue'
import type { PublicClanResponse } from '@/types/api/clans'
import { readClanTitle } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  clan: Pick<PublicClanResponse, 'name' | 'equipped'>
}>()

const title = computed(() => readClanTitle(props.clan))
</script>

<template>
  <TitleRenderer v-if="title" class="clan-name clan-name--effect" :value="title" />
  <span v-else class="clan-name">{{ clan.name }}</span>
</template>

<style scoped>
.clan-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clan-name--effect {
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  text-transform: none;
  overflow: visible;
}
</style>
