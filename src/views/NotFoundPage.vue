<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({
  title: 'Page Not Found | AccSaber',
  description: 'The page you are looking for does not exist.',
  noindex: true,
})
</script>

<template>
  <EmptyState message="Page not found." action-label="Back home" @action="$router.push('/')" />
</template>
