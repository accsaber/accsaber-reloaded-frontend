<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import RelationFilter from '@/components/domain/RelationFilter.vue'
import { useQueryParams } from '@/composables/useQueryParams'
import { useAuthStore } from '@/stores/auth'
import type { RelationFilterType } from '@/types/api/relations'
import { countryOptionsFor } from '@/utils/countries'
import { storeCountry } from '@/utils/statsCountry'
import { computed } from 'vue'

const authStore = useAuthStore()
const { queryRef } = useQueryParams()
const country = queryRef('country')
const relation = queryRef<RelationFilterType>('relation')
const options = computed(() => countryOptionsFor(authStore.userProfile?.country))

function setCountry(value: string) {
  storeCountry(value)
  country.value = value
}
</script>

<template>
  <BaseSelect :model-value="country" :options="options" placeholder="All Countries" searchable
    @update:model-value="setCountry" />
  <RelationFilter v-model="relation" />
</template>
