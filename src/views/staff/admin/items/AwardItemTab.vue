<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import UserPicker from '@/components/domain/UserPicker.vue'
import { awardItem, getAdminItems } from '@/api/admin/items'
import { getUnusualEffects } from '@/api/items'
import { useItemModifierStore } from '@/stores/itemModifiers'
import { useItemTypeStore } from '@/stores/itemTypes'
import type {
  AwardItemRequest,
  ItemResponse,
  UnusualEffectResponse,
  UserItemResponse,
} from '@/types/api/items'
import { computed, onMounted, ref, watch } from 'vue'

const UNUSUAL_MODIFIER_KEY = 'unusual'

const itemTypeStore = useItemTypeStore()
const modifierStore = useItemModifierStore()

const userId = ref<string | null>(null)
const itemId = ref<string>('')
const modifierKeys = ref<string[]>([])
const unusualEffectId = ref<string>('')
const quantity = ref<number>(1)
const reason = ref<string>('')
const typeFilter = ref<string>('')
const items = ref<ItemResponse[]>([])
const unusualEffects = ref<UnusualEffectResponse[]>([])
const itemsLoading = ref(false)
const submitting = ref(false)

const status = ref<{ kind: 'success' | 'error'; message: string; awarded?: UserItemResponse } | null>(null)

const typeOptions = computed(() => [
  { value: '', label: 'All Types' },
  ...itemTypeStore.itemTypes.filter((t) => t.active).map((t) => ({ value: t.id, label: t.name })),
])

const itemOptions = computed(() => {
  const filtered = typeFilter.value
    ? items.value.filter((i) => i.typeId === typeFilter.value)
    : items.value
  return [
    { value: '', label: 'Pick an Item' },
    ...filtered.map((i) => ({ value: i.id, label: `${i.name} (${i.typeKey}, ${i.rarity})` })),
  ]
})

const activeModifiers = computed(() => modifierStore.modifiers.filter((m) => m.active))

const modifierToggles = computed(() => activeModifiers.value.map((m) => ({ key: m.key, label: m.name, color: m.colorHex ?? undefined })))

const unusualSelected = computed(() => modifierKeys.value.includes(UNUSUAL_MODIFIER_KEY))

const unusualEffectOptions = computed(() => [
  { value: '', label: 'Default Sparkle' },
  ...unusualEffects.value.map((e) => ({
    value: e.id,
    label: e.name || e.key,
    description: e.description ?? undefined,
  })),
])

const selectedItem = computed<ItemResponse | null>(
  () => items.value.find((i) => i.id === itemId.value) ?? null,
)

const isStackable = computed(() => !!selectedItem.value?.stackable)

const canSubmit = computed(
  () => !!userId.value && !!itemId.value && quantity.value >= 1 && !submitting.value,
)

function toggleModifier(key: string) {
  if (modifierKeys.value.includes(key)) {
    modifierKeys.value = modifierKeys.value.filter((k) => k !== key)
  } else {
    modifierKeys.value = [...modifierKeys.value, key]
  }
}

async function fetchItems() {
  itemsLoading.value = true
  try {
    items.value = await getAdminItems({ includeInactive: false })
  } finally {
    itemsLoading.value = false
  }
}

async function fetchUnusualEffects() {
  unusualEffects.value = await getUnusualEffects()
}

async function submit() {
  if (!userId.value || !itemId.value) return
  submitting.value = true
  status.value = null
  try {
    const req: AwardItemRequest = {
      userId: userId.value,
      itemId: itemId.value,
      reason: reason.value.trim() || undefined,
      modifierKeys: modifierKeys.value.length ? [...modifierKeys.value] : undefined,
      unusualEffectId:
        unusualSelected.value && unusualEffectId.value ? unusualEffectId.value : undefined,
      quantity: isStackable.value ? Math.max(1, Math.floor(quantity.value)) : 1,
    }
    const awarded = await awardItem(req)
    status.value = {
      kind: 'success',
      message: `Awarded "${awarded.item.name}" successfully.`,
      awarded,
    }
    itemId.value = ''
    reason.value = ''
    modifierKeys.value = []
    unusualEffectId.value = ''
    quantity.value = 1
  } catch (e) {
    status.value = { kind: 'error', message: parseApiError(e, 'Award failed').message }
  } finally {
    submitting.value = false
  }
}

watch(isStackable, (stackable) => {
  if (!stackable) quantity.value = 1
})

watch(unusualSelected, (selected) => {
  if (!selected) {
    unusualEffectId.value = ''
  } else if (!unusualEffectId.value && unusualEffects.value.length) {
    unusualEffectId.value = unusualEffects.value[0].id
  }
})

onMounted(async () => {
  await Promise.all([
    itemTypeStore.fetchItemTypes(),
    modifierStore.fetchModifiers(),
    fetchItems(),
    fetchUnusualEffects(),
  ])
})
</script>

<template>
  <form class="award-tab" @submit.prevent="canSubmit && submit()">
    <div class="award-tab__field">
      <span class="field-label">Player</span>
      <UserPicker v-model="userId" />
    </div>

    <div class="award-tab__row">
      <BaseSelect v-model="typeFilter" :options="typeOptions" label="Type" />
      <BaseSelect v-model="itemId" :options="itemOptions" label="Item" searchable
        :placeholder="itemsLoading ? 'Loading items' : 'Pick an item'" />
    </div>

    <div class="award-tab__field">
      <span class="field-label">Modifiers</span>
      <ChartToggleGroup :toggles="modifierToggles" :active="modifierKeys" label="Modifiers" @select="toggleModifier" />
    </div>

    <Transition name="collapse">
      <div v-if="unusualSelected" class="collapsible">
        <BaseSelect v-model="unusualEffectId" :options="unusualEffectOptions" label="Unusual Effect" searchable />
      </div>
    </Transition>

    <div class="award-tab__row">
      <BaseInput v-model.number="quantity" class="award-tab__quantity" label="Quantity" type="number" min="1" :disabled="!isStackable" />
      <BaseInput v-model="reason" label="Reason" />
    </div>

    <div class="award-tab__actions">
      <BaseButton variant="primary" :class="{ confirm: status?.kind === 'success' }" :disabled="!canSubmit" :loading="submitting" @click="submit">
        Award Item
      </BaseButton>
      <span class="caption award-tab__status" :class="{ 'award-tab__status--error': status?.kind === 'error' }"
        :role="status?.kind === 'error' ? 'alert' : 'status'">
        <template v-if="status">
          {{ status.message }}
          <template v-if="status.awarded?.serialNumber != null">, #{{ status.awarded.serialNumber }}</template>
          <template v-if="status.awarded && status.awarded.quantity > 1">, x{{ status.awarded.quantity }}</template>
        </template>
      </span>
    </div>
  </form>
</template>

<style scoped>
.award-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: 720px;
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.award-tab__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.award-tab__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: var(--space-md);
}

.award-tab__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md);
}

.award-tab__status {
  min-height: 1lh;
}

.award-tab__status--error {
  color: var(--error);
}

@media (max-width: 767px) {
  .award-tab__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
