<script setup lang="ts">
import AppNavbar from '@/components/layout/AppNavbar.vue'
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'

const authStore = useAuthStore()

onMounted(() => {
  if (authStore.isLoggedIn) {
    authStore.fetchProfile()
  }
})
</script>

<template>
  <AppNavbar />
  <main class="main-content">
    <router-view v-slot="{ Component }">
      <transition name="page">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
</template>

<style scoped>
.main-content {
  min-height: calc(100vh - 64px);
  padding: var(--space-xl);
  padding-top: calc(64px + var(--space-xl));
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@media (max-width: 767px) {
  .main-content {
    min-height: calc(100vh - 56px);
    padding: var(--space-md);
    padding-top: calc(56px + var(--space-md));
  }
}
</style>
