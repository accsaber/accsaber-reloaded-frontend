<script setup lang="ts">
import IconButton from '@/components/common/IconButton.vue'
import CampaignTrayIcon from './CampaignTrayIcon.vue'
import { useCampaignEditorContext } from './campaignEditorContext'

const { trays, selection, connections } = useCampaignEditorContext()
const { campaignTrays, nodeTrays, activeTray, toggleTray } = trays
const { selectedCount } = selection
const { selectedEdge } = connections

defineProps<{
  group?: 'campaign' | 'node' | null
}>()

const emit = defineEmits<{
  tutorial: []
  close: []
}>()
</script>

<template>
  <aside class="campaign-editor__tray-rail" aria-label="Editor trays">
    <header v-if="group" class="campaign-editor__tray-rail-head">
      <h2 class="card-title">{{ group === 'node' ? 'Node' : 'Campaign' }}</h2>
      <IconButton icon="close" label="Close" @click="emit('close')" />
    </header>

    <div v-if="group !== 'node'" class="campaign-editor__tray-group stagger" :style="{ '--n': campaignTrays.length }">
      <span class="campaign-editor__tray-group-label">Campaign</span>
      <button
        v-for="(tray, i) in campaignTrays"
        :key="tray.id"
        type="button"
        class="campaign-editor__tray-btn pressable"
        :style="{ '--i': i }"
        :class="[
          { 'campaign-editor__tray-btn--active': activeTray === tray.id },
          tray.id === 'status' && tray.tone ? `campaign-editor__tray-btn--${tray.tone}` : '',
        ]"
        :aria-pressed="activeTray === tray.id"
        @click="toggleTray(tray.id)"
      >
        <CampaignTrayIcon :name="tray.icon" />
        <span class="campaign-editor__tray-btn-label">{{ tray.label }}</span>
        <span v-if="tray.count" class="campaign-editor__tray-count">{{ tray.count }}</span>
      </button>
    </div>

    <div v-if="group !== 'campaign'" class="campaign-editor__tray-group stagger" :style="{ '--n': nodeTrays.length }">
      <span class="campaign-editor__tray-group-label">Node</span>
      <p v-if="selectedCount === 0 && !selectedEdge" class="campaign-editor__tray-empty">
        Select a node
      </p>
      <button
        v-for="(tray, i) in nodeTrays"
        v-else
        :key="tray.id"
        type="button"
        class="campaign-editor__tray-btn pressable"
        :style="{ '--i': i }"
        :class="{ 'campaign-editor__tray-btn--active': activeTray === tray.id }"
        :aria-pressed="activeTray === tray.id"
        @click="toggleTray(tray.id)"
      >
        <CampaignTrayIcon :name="tray.icon" />
        <span class="campaign-editor__tray-btn-label">{{ tray.label }}</span>
        <span v-if="tray.count" class="campaign-editor__tray-count">{{ tray.count }}</span>
      </button>
    </div>

    <div v-if="group !== 'node'" class="campaign-editor__tray-group campaign-editor__tray-group--foot">
      <span class="campaign-editor__tray-group-label">Help</span>
      <button type="button" class="campaign-editor__tray-btn pressable" @click="emit('tutorial')">
        <CampaignTrayIcon name="compass" />
        <span class="campaign-editor__tray-btn-label">Tutorial</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.campaign-editor__tray-rail {
  position: absolute;
  top: calc(var(--space-md) * 2 + var(--control-h));
  left: var(--space-md);
  bottom: var(--space-md);
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 88px;
  padding: var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow-y: auto;
  overflow-x: hidden;
  pointer-events: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-overlay) transparent;
}

.campaign-editor__tray-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.campaign-editor__tray-group--foot {
  margin-top: auto;
}

.campaign-editor__tray-group-label,
.campaign-editor__tray-empty {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  text-align: center;
}

.campaign-editor__tray-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding: var(--space-xs);
  background: transparent;
  border: none;
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.campaign-editor__tray-btn--published {
  color: var(--info);
}

.campaign-editor__tray-btn--editing {
  color: var(--warning);
}

.campaign-editor__tray-btn--curated {
  color: var(--success);
}

.campaign-editor__tray-btn:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.campaign-editor__tray-btn--active,
.campaign-editor__tray-btn--active:hover {
  color: var(--page-accent);
  background: var(--bg-elevated);
}

.campaign-editor__tray-btn-label {
  font-size: var(--text-caption);
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
}

.campaign-editor__tray-count {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  min-width: 16px;
  padding: 0 var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  line-height: 16px;
  text-align: center;
  color: var(--text-secondary);
  background: var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.campaign-editor__tray-rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: 860px) {
  .campaign-editor__tray-rail {
    position: fixed;
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 7;
    width: auto;
    max-height: 70dvh;
    padding: var(--space-md) var(--space-md) calc(var(--space-md) + env(safe-area-inset-bottom));
    border-bottom: none;
    border-radius: var(--radius-modal) var(--radius-modal) 0 0;
  }

  .campaign-editor__tray-group {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  }

  .campaign-editor__tray-group--foot {
    margin-top: 0;
  }

  .campaign-editor__tray-btn {
    min-height: 56px;
    justify-content: center;
  }

  .campaign-editor__tray-group-label {
    display: none;
  }

  .campaign-editor__tray-group--foot .campaign-editor__tray-group-label {
    display: block;
    grid-column: 1 / -1;
    text-align: left;
  }

  .campaign-editor__tray-empty {
    grid-column: 1 / -1;
    text-align: left;
  }
}
</style>
