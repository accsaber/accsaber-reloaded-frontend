<script setup lang="ts">
import CratePreviewModal from '@/components/domain/CratePreviewModal.vue'
import type {
  CrateContentResponse,
  CrateModifierResponse,
  ItemResponse,
  UnusualEffectResponse,
} from '@/types/api/items'
import { ref, watch } from 'vue'

export interface CratePool {
  contents: CrateContentResponse[]
  modifiers: CrateModifierResponse[]
  effects: UnusualEffectResponse[]
}

const props = defineProps<{
  open: boolean
  crate: ItemResponse | null
  staff?: boolean
}>()

defineEmits<{
  close: []
  previewOpen: [pool: CratePool]
}>()

const pool = ref<CratePool>({ contents: [], modifiers: [], effects: [] })
const loading = ref(false)

let requestId = 0

async function load(crateId: string) {
  const token = ++requestId
  loading.value = true
  let next: CratePool = { contents: [], modifiers: [], effects: [] }
  try {
    const [{ getCrateContents, getCrateModifiers, getCrateUnusualEffects }, admin] = await Promise.all([
      import('@/api/crates'),
      props.staff ? import('@/api/admin/crates') : null,
    ])
    const [contents, modifiers, effects] = await Promise.all([
      (admin?.getAdminCrateContents ?? getCrateContents)(crateId),
      getCrateModifiers(crateId),
      getCrateUnusualEffects(crateId),
    ])
    next = { contents, modifiers, effects }
  } catch {
    next = { contents: [], modifiers: [], effects: [] }
  }
  if (token !== requestId) return
  pool.value = next
  loading.value = false
}

watch(
  () => (props.open ? (props.crate?.id ?? null) : null),
  (crateId) => {
    if (crateId) load(crateId)
  },
  { immediate: true },
)
</script>

<template>
  <CratePreviewModal
    :open="open"
    :crate="crate"
    :contents="pool.contents"
    :contents-loading="loading"
    :modifiers="pool.modifiers"
    :modifiers-loading="loading"
    :effects="pool.effects"
    :effects-loading="loading"
    :allow-open="staff"
    @close="$emit('close')"
    @preview-open="$emit('previewOpen', pool)"
  />
</template>
