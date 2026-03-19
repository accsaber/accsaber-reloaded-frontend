<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  country: string
}>()

const flag = computed(() => {
  const code = props.country.toUpperCase()
  if (code.length !== 2) return code
  return String.fromCodePoint(
    ...code.split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  )
})
</script>

<template>
  <span class="country-flag" :aria-label="country" role="img">{{ flag }}</span>
</template>

<style scoped>
.country-flag {
  font-size: 1em;
  line-height: 1;
}
</style>
