<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import type { ClanResponse, ClanRole, ClanWarDetailResponse, ClanWarResponse } from '@/types/api/clans'
import { hasClanRole, isPacifist } from '@/utils/clans'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import DeclareWarModal from './war/DeclareWarModal.vue'
import ClanWarList from './war/ClanWarList.vue'

const props = defineProps<{
  clan: ClanResponse
  viewerRole: ClanRole | null
  recentWar: ClanWarResponse | null
  seasonRunning: boolean
}>()

const router = useRouter()
const declareOpen = ref(false)

const openAttack = computed(() => {
  const war = props.recentWar
  return !!war && war.status !== 'ended' && war.attack.lead.id === props.clan.clan.id
})

const canDeclare = computed(
  () =>
    props.seasonRunning &&
    hasClanRole(props.viewerRole, 'commander') &&
    !openAttack.value &&
    !isPacifist(props.clan),
)

function onDeclared(detail: ClanWarDetailResponse) {
  declareOpen.value = false
  router.push({ name: 'clan-war', params: { warId: detail.war.id } })
}
</script>

<template>
  <section class="clan-wars">
    <div v-if="canDeclare" class="clan-wars__actions">
      <BaseButton variant="destructive" size="sm" @click="declareOpen = true">Declare war</BaseButton>
    </div>
    <ClanWarList :clan-id="clan.clan.id" :latest-war="recentWar" :season-running="seasonRunning" />
    <DeclareWarModal :open="declareOpen" :own-clan="clan" @close="declareOpen = false" @declared="onDeclared" />
  </section>
</template>

<style scoped>
.clan-wars {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.clan-wars__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
