<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminNav from '@/components/layout/AdminNav.vue'

const route = useRoute()
const showNav = computed(() => route.name !== 'admin-login')
</script>

<template>
  <AdminNav v-if="showNav" />
  <main :class="showNav ? 'admin-main' : 'admin-main--full'">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
</template>

<style>
:root {
  --bg-surface: #1a1816;
  --bg-elevated: #221f1c;
  --bg-overlay: #2e2a26;
}

[data-theme='light'] {
  --bg-surface: #ffffff;
  --bg-elevated: #f0eeec;
  --bg-overlay: #d8d4d0;
}
</style>

<style scoped>
.admin-main {
  margin-left: 220px;
  min-height: 100vh;
  background: var(--bg-base);
}

.admin-main--full {
  min-height: 100vh;
  background: var(--bg-base);
}

.page-enter-active,
.page-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.page-enter-from { opacity: 0; transform: translateX(6px); }
.page-leave-to { opacity: 0; transform: translateX(-6px); }
</style>
