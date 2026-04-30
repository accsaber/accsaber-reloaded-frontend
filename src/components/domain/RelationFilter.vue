<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import { useAuthStore } from '@/stores/auth'
import type { UserRelationType } from '@/types/api/relations'
import { computed } from 'vue'

defineProps<{
  modelValue: UserRelationType | ''
}>()

const emit = defineEmits<{
  'update:modelValue': [value: UserRelationType | '']
}>()

const authStore = useAuthStore()

const visible = computed(() => authStore.isLoggedIn)

const options = [
  { value: '', label: 'Everyone' },
  { value: 'follower', label: 'Followers' },
  { value: 'rival', label: 'Rivals' },
  { value: 'blocked', label: 'Blocked' },
]

function handleChange(value: string) {
  emit('update:modelValue', value as UserRelationType | '')
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
