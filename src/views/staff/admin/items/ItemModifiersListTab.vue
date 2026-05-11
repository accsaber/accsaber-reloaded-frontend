<script setup lang="ts">
import AdminTable from '@/components/admin/AdminTable.vue'
import { getAdminItemModifiers } from '@/api/admin/items'
import type { ItemModifierResponse } from '@/types/api/items'
import { onMounted, ref } from 'vue'

const modifiers = ref<ItemModifierResponse[]>([])
const loading = ref(false)

async function fetchModifiers() {
  loading.value = true
  try {
    modifiers.value = await getAdminItemModifiers()
  } finally {
    loading.value = false
  }
}

onMounted(fetchModifiers)
</script>

<template>
  <div class="modifiers-tab">
    <p class="modifiers-tab__hint">
      Item modifiers are managed via database seed data. This list is read-only.
    </p>

    <AdminTable :items="modifiers" :loading="loading" empty-message="No modifiers">
      <template #head>
        <th>Key</th>
        <th>Name</th>
        <th>Description</th>
        <th>Status</th>
      </template>

      <template #default="{ item }: { item: ItemModifierResponse }">
        <td class="mono">{{ item.key }}</td>
        <td>{{ item.name }}</td>
        <td class="muted">{{ item.description ?? '-' }}</td>
        <td>{{ item.active ? 'Active' : 'Inactive' }}</td>
      </template>
    </AdminTable>
  </div>
</template>

<style scoped>
.modifiers-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.modifiers-tab__hint {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}
</style>
