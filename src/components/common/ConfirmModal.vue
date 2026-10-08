<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  typedConfirmation?: string
  blocked?: boolean
  disabled?: boolean
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  confirm: []
  close: []
}>()

const typed = ref('')

const ready = computed(
  () =>
    !props.disabled &&
    (!props.typedConfirmation || typed.value.trim().toUpperCase() === props.typedConfirmation.toUpperCase()),
)

watch(
  () => props.open,
  () => {
    typed.value = ''
  },
)
</script>

<template>
  <BaseModal :open="open" :title="title" max-width="460px" @close="emit('close')">
    <p class="confirm-modal__message">{{ message }}</p>
    <slot />

    <BaseInput
      v-if="typedConfirmation && !blocked"
      v-model="typed"
      :label="`Type ${typedConfirmation} to confirm`"
      autocomplete="off"
    />

    <p v-if="error" class="confirm-modal__error" role="alert">{{ error }}</p>

    <template #footer>
      <BaseButton :disabled="loading" @click="emit('close')">Cancel</BaseButton>
      <BaseButton
        v-if="!blocked"
        :variant="destructive ? 'destructive' : 'primary'"
        :loading="loading"
        :disabled="!ready"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.confirm-modal__message {
  margin: 0 0 var(--space-md);
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

.confirm-modal__error {
  margin: var(--space-sm) 0 0;
  font-size: var(--text-caption);
  color: var(--error);
}
</style>
