<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import CrateOpenAnimation from '@/components/domain/CrateOpenAnimation.vue'
import CrateOpenStage from '@/components/domain/CrateOpenStage.vue'
import type {
  CrateContentResponse,
  CrateModifierResponse,
  ItemResponse,
  UnusualEffectRef,
} from '@/types/api/items'
import { createCrateRoller, type CrateRoll } from '@/utils/crateRoll'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  crate: ItemResponse
  contents: CrateContentResponse[]
  crateModifiers: CrateModifierResponse[]
  unusualEffects: UnusualEffectRef[]
}>()

const emit = defineEmits<{
  close: []
}>()

const roll = ref<CrateRoll | null>(null)
const playToken = ref(0)
const settled = ref(false)

function rollOnce() {
  const next = createCrateRoller({
    contents: props.contents,
    crateModifiers: props.crateModifiers,
    globalModifiers: [],
    unusualEffects: props.unusualEffects,
  })()
  if (!next) return
  roll.value = next
  settled.value = false
  void nextTick(() => {
    playToken.value++
  })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  e.stopPropagation()
  emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown, true)
  rollOnce()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown, true)
})
</script>

<template>
  <CrateOpenStage
    :ready="settled"
    :label="`Preview opening ${crate.name}`"
    @dismiss="emit('close')"
  >
    <template #title>{{ crate.name }}</template>

    <CrateOpenAnimation
      v-if="roll"
      :contents="contents"
      :crate-modifiers="crateModifiers"
      :unusual-effects="unusualEffects"
      :result="roll.item"
      :result-modifiers="roll.modifiers"
      :result-unusual-effect="roll.unusualEffect"
      :play-token="playToken"
      :height="320"
      @complete="settled = true"
    />
    <p v-else class="caption">This crate has no rewards to roll</p>

    <template #actions>
      <BaseButton variant="primary" :disabled="!settled || !roll" @click="rollOnce">
        Roll again
      </BaseButton>
      <BaseButton @click="emit('close')">Close</BaseButton>
    </template>
  </CrateOpenStage>
</template>
