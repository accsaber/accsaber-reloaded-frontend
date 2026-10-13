<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    fallback: string
    text?: boolean
    placeholder?: string
    maxlength?: number
    error?: string | null
  }>(),
  { text: false, placeholder: '', maxlength: undefined, error: null },
)

const value = defineModel<string>({ required: true })

const emit = defineEmits<{ commit: []; reset: [] }>()

const HEX6 = /^#?[0-9a-fA-F]{6}$/

const swatch = computed(() => {
  const v = value.value.trim()
  if (!HEX6.test(v)) return props.fallback
  return v.startsWith('#') ? v : `#${v}`
})
</script>

<template>
  <label class="campaign-editor__field">
    <span>{{ label }}</span>
    <div class="campaign-editor__color-row">
      <input
        type="color"
        :aria-label="`${label} swatch`"
        :value="swatch"
        @input="value = ($event.target as HTMLInputElement).value"
        @change="emit('commit')"
      />
      <input
        v-if="text"
        v-model="value"
        class="campaign-editor__color-text"
        type="text"
        autocomplete="off"
        spellcheck="false"
        :maxlength="maxlength"
        :placeholder="placeholder"
        :aria-invalid="!!error"
        @blur="emit('commit')"
        @keydown.enter.prevent="emit('commit')"
      />
      <button type="button" class="campaign-editor__inline-btn" @click="emit('reset')">
        Auto
      </button>
    </div>
    <p v-if="error" class="campaign-editor__field-error" role="alert">{{ error }}</p>
  </label>
</template>

<style scoped src="./campaignEditorFields.css"></style>
