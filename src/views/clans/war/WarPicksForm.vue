<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import type { ClanWarDetailResponse, ClanWarPoolEntryResponse, ClanWarResponse } from '@/types/api/clans'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { CLAN_RULESET_LABEL, isBerserkerOffer } from '@/utils/clans'
import { computed, ref, watch } from 'vue'
import WarMapPicker from './WarMapPicker.vue'
import WarSection from './WarSection.vue'

const props = defineProps<{
  war: ClanWarResponse
  pool: ClanWarPoolEntryResponse[]
}>()

const emit = defineEmits<{
  submitted: [detail: ClanWarDetailResponse]
}>()

const CHOICES = (['duel', 'berserker'] as const).map((key) => ({ key, label: CLAN_RULESET_LABEL[key] }))

const picks = ref<PublicMapDifficultyResponse[]>([])
const berserker = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

const count = computed(() => props.war.arenaSpec.defenderPicks)
const offer = computed(() => isBerserkerOffer(props.war))
const takenIds = computed(() => props.pool.map((e) => e.difficulty.id))
const ready = computed(
  () => picks.value.length === count.value && picks.value.every((d) => !takenIds.value.includes(d.id)),
)

async function submit() {
  if (!ready.value || saving.value) return
  saving.value = true
  error.value = null
  try {
    const { submitClanWarPicks } = await import('@/api/clans')
    emit('submitted', await submitClanWarPicks(props.war.id, {
        mapDifficultyIds: picks.value.map((d) => d.id),
        berserker: berserker.value,
      }))
  } catch (err) {
    error.value = parseApiError(err, 'Could not submit those picks.').message
  } finally {
    saving.value = false
  }
}

watch(
  () => props.war.id,
  () => {
    picks.value = []
    berserker.value = false
  },
)
</script>

<template>
  <WarSection :title="count ? 'Your Picks' : 'Answer Offer'" fixed>
    <template #actions>
      <BaseButton variant="primary" :loading="saving" :disabled="!ready" @click="submit">
        {{ count ? 'Lock Picks' : 'Send Answer' }}
      </BaseButton>
    </template>
    <div class="picks">
      <BaseTabs
        v-if="offer"
        variant="segmented"
        label="Ruleset"
        :tabs="CHOICES"
        :model-value="berserker ? 'berserker' : 'duel'"
        @update:model-value="berserker = $event === 'berserker'"
      />
      <WarMapPicker
        v-if="count"
        v-model="picks"
        :count="count"
        :category-id="war.arenaSpec.categoryId ?? null"
        :complexity-min="war.arenaSpec.complexityMin ?? null"
        :complexity-max="war.arenaSpec.complexityMax ?? null"
        :disabled="saving"
        :taken-ids="takenIds"
      />
      <p v-if="error" class="caption picks__error" role="alert">{{ error }}</p>
    </div>
  </WarSection>
</template>

<style scoped>
.picks {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.picks__error {
  color: var(--error);
}
</style>
