<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { ClanWarDetailResponse, ClanWarResponse } from '@/types/api/clans'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { computed, ref, watch } from 'vue'
import WarMapPicker from './WarMapPicker.vue'

const props = defineProps<{
  open: boolean
  war: ClanWarResponse
}>()

const emit = defineEmits<{
  close: []
  submitted: [detail: ClanWarDetailResponse]
}>()

const picks = ref<PublicMapDifficultyResponse[]>([])
const saving = ref(false)
const error = ref<string | null>(null)

const count = computed(() => props.war.arenaSpec.defenderPicks)
const ready = computed(() => picks.value.length === count.value)

async function submit() {
  if (!ready.value || saving.value) return
  saving.value = true
  error.value = null
  try {
    const { submitClanWarPicks } = await import('@/api/clans')
    emit('submitted', await submitClanWarPicks(props.war.id, { mapDifficultyIds: picks.value.map((d) => d.id) }))
  } catch (err) {
    error.value = parseApiError(err, 'Could not submit those picks.').message
  } finally {
    saving.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      picks.value = []
      error.value = null
    }
  },
)
</script>

<template>
  <BaseModal :open="open" title="Submit picks" max-width="640px" @close="emit('close')">
    <div class="picks">
      <p class="picks__hint">Pick {{ count }} maps.</p>
      <WarMapPicker
        v-model="picks"
        :count="count"
        :category-id="war.arenaSpec.categoryId ?? null"
        :complexity-min="war.arenaSpec.complexityMin ?? null"
        :complexity-max="war.arenaSpec.complexityMax ?? null"
        :disabled="saving"
      />
      <p v-if="error" class="picks__error" role="alert">{{ error }}</p>
    </div>

    <template #footer>
      <BaseButton :disabled="saving" @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="saving" :disabled="!ready" @click="submit">Lock picks</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.picks {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.picks__hint {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.picks__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}
</style>
