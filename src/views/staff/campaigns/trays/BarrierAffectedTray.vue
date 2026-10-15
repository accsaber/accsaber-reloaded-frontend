<script setup lang="ts">
import { computed } from 'vue'
import CampaignTrayIcon from '../CampaignTrayIcon.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const { access, vertices, barriers } = useCampaignEditorContext()
const { editable } = access
const { selectedBarrier, difficultyById } = vertices
const { affectedPickMode, toggleAffectedPickMode, toggleAffected, setBarrierPrereqMode } = barriers

const affectedNodeList = computed(() =>
  (selectedBarrier.value?.affectedCampaignDifficultyIds ?? []).map((id) => ({
    id,
    name: difficultyById.value.get(id)?.songName ?? 'Unknown node',
  })),
)
</script>

<template>
  <fieldset v-if="selectedBarrier" class="campaign-editor__section" :disabled="!editable">
    <button
      type="button"
      class="campaign-editor__pick-toggle"
      :class="{ 'campaign-editor__pick-toggle--active': affectedPickMode }"
      @click="toggleAffectedPickMode"
    >
      <span class="campaign-editor__pick-dot" aria-hidden="true" />
      {{ affectedPickMode ? 'Picking… click nodes on the canvas' : 'Pick on canvas' }}
    </button>
    <ul v-if="affectedNodeList.length > 0" class="campaign-editor__affected-list">
      <li v-for="n in affectedNodeList" :key="n.id" class="campaign-editor__affected-item">
        <span class="campaign-editor__affected-name">{{ n.name }}</span>
        <button
          v-if="editable"
          type="button"
          class="campaign-editor__reward-remove"
          :aria-label="`Remove ${n.name}`"
          @click="toggleAffected(n.id)"
        >
          <CampaignTrayIcon name="x" :size="12" />
        </button>
      </li>
    </ul>
    <p v-else class="campaign-editor__hint">No affected nodes</p>
    <div class="campaign-editor__field">
      <span>Opens when</span>
      <div
        class="campaign-editor__prereq-mode-toggle"
        role="radiogroup"
        aria-label="Gate opens when"
      >
        <button
          type="button"
          role="radio"
          :aria-checked="selectedBarrier.prerequisiteMode !== 'AND'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active': selectedBarrier.prerequisiteMode !== 'AND',
          }"
          @click="setBarrierPrereqMode('OR')"
        >
          any clears
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="selectedBarrier.prerequisiteMode === 'AND'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active': selectedBarrier.prerequisiteMode === 'AND',
          }"
          @click="setBarrierPrereqMode('AND')"
        >
          all clear
        </button>
      </div>
    </div>
  </fieldset>
</template>


<style scoped>
.campaign-editor__pick-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  align-self: flex-start;
  padding: 7px 12px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease,
    background 120ms ease;
}

.campaign-editor__pick-toggle:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.campaign-editor__pick-toggle--active {
  color: var(--warning);
  border-color: var(--warning);
  background: color-mix(in srgb, var(--warning) 12%, transparent);
}

.campaign-editor__pick-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
}

.campaign-editor__pick-toggle--active .campaign-editor__pick-dot {
  opacity: 1;
  animation: pick-pulse 1.4s ease-in-out infinite;
}

@keyframes pick-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .campaign-editor__pick-toggle--active .campaign-editor__pick-dot {
    animation: none;
  }
}

.campaign-editor__affected-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.campaign-editor__affected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 5px var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
}

.campaign-editor__affected-name {
  min-width: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
