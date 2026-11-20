<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import { useAuthStore } from '@/stores/auth'
import type { RelationFilterType } from '@/types/api/relations'
import { computed } from 'vue'

defineProps<{
  modelValue: RelationFilterType | ''
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RelationFilterType | '']
}>()

const authStore = useAuthStore()

const visible = computed(() => authStore.isLoggedIn)

const options = computed(() => [
  { value: '', label: 'Everyone' },
  { value: 'follower', label: 'Following' },
  { value: 'rival', label: 'Rivaling' },
  ...(authStore.userProfile?.clan ? [{ value: 'clan', label: 'Clan' }] : []),
])

function handleChange(value: string) {
  emit('update:modelValue', value as RelationFilterType | '')
}
</script>

<template>
  <BaseSelect
    v-if="visible"
    :model-value="modelValue"
    :options="options"
    placeholder="Everyone"
    @update:model-value="handleChange"
  />
</template>
