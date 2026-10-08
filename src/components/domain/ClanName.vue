<script setup lang="ts">
import TitleWithEffects from '@/components/cosmetics/titles/TitleWithEffects.vue'
import type { PublicClanResponse } from '@/types/api/clans'
import { readClanTitle, valueFxLayers } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  clan: Pick<PublicClanResponse, 'name' | 'equipped'>
}>()

const title = computed(() => readClanTitle(props.clan))
const effects = computed(() => valueFxLayers(title.value))
</script>

<template>
  <TitleWithEffects v-if="title" class="clan-name clan-name--effect" :value="title" :effects="effects" />
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
  overflow: visible;
}

.clan-name--effect :deep(.title-renderer) {
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  text-transform: none;
}
</style>
