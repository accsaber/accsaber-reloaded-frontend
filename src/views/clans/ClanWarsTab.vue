<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import type { ClanResponse, ClanRole, ClanWarDetailResponse, ClanWarResponse } from '@/types/api/clans'
import { hasClanRole } from '@/utils/clans'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DeclareWarModal from './war/DeclareWarModal.vue'
import ClanWarList from './war/ClanWarList.vue'

const OPEN_SIZE = 50

const props = defineProps<{
  clan: ClanResponse
  viewerRole: ClanRole | null
  latestWar: ClanWarResponse | null
}>()

const router = useRouter()
const openAttack = ref<ClanWarResponse | null>(null)
const declareOpen = ref(false)
const seasonRunning = ref(false)

const canDeclare = computed(
  () => seasonRunning.value && hasClanRole(props.viewerRole, 'commander') && openAttack.value === null,
)

async function fetchOpenAttack() {
  try {
    const { getClanWars } = await import('@/api/clans')
    const page = await getClanWars({ clanId: props.clan.clan.id, open: true, page: 0, size: OPEN_SIZE })
    openAttack.value = page.content.find((w) => w.attacker.clan.id === props.clan.clan.id) ?? null
  } catch {
    openAttack.value = null
  }
}

function onDeclared(detail: ClanWarDetailResponse) {
  declareOpen.value = false
  router.push({ name: 'clan-war', params: { warId: detail.war.id } })
}

watch(
  () => props.latestWar,
  (war) => {
    if (!war || war.attacker.clan.id !== props.clan.clan.id) return
    openAttack.value = war.status === 'ended' ? null : war
  },
)

watch(() => props.clan.clan.id, fetchOpenAttack, { immediate: true })
</script>

<template>
  <section class="clan-wars">
    <div v-if="canDeclare" class="clan-wars__actions">
      <BaseButton variant="destructive" size="sm" @click="declareOpen = true">Declare war</BaseButton>
    </div>
    <ClanWarList :clan-id="clan.clan.id" :latest-war="latestWar" @season="seasonRunning = $event" />
    <DeclareWarModal :open="declareOpen" :own-clan-id="clan.clan.id" @close="declareOpen = false" @declared="onDeclared" />
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
