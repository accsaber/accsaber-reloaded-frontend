<script setup lang="ts">
import CampaignPresenceCursor from '@/views/staff/campaigns/CampaignPresenceCursor.vue'
import type { RoadmapEdgeGeometry, RoadmapToolsLayer } from '@/components/domain/CampaignRoadmap.vue'
import { computed } from 'vue'
import type { CampaignRoadmapTools } from './useCampaignRoadmapTools'

const props = defineProps<{
  tools: CampaignRoadmapTools
  layer: RoadmapToolsLayer
  edge?: RoadmapEdgeGeometry
}>()

const unit = computed(() => props.tools.stage.value?.unit.value ?? 48)
const invScale = computed(() => 1 / (props.tools.stage.value?.scale.value ?? 1))
const placing = computed(() => props.tools.placing())
const editable = computed(() => props.tools.editable())
const peerCursors = computed(() => props.tools.peerCursors)
</script>

<template>
  <line
    v-if="layer === 'edge-under' && edge"
    class="campaign-roadmap__edge-hit"
    :data-edge-from="edge.fromId"
    :data-edge-to="edge.toId"
    :x1="edge.fromX"
    :y1="edge.fromY"
    :x2="edge.toX"
    :y2="edge.toY"
    stroke="transparent"
    :stroke-width="placing ? Math.max(unit * 0.9, 40) : Math.max(unit * 0.3, 14)"
    @click.stop="tools.clickEdge(edge)"
  />
  <g
    v-else-if="layer === 'edge-over' && edge && editable && !placing"
    class="campaign-roadmap__edge-x"
    :transform="`translate(${edge.midX}, ${edge.midY})`"
    @click.stop="tools.disconnect(edge)"
  >
    <circle r="10" fill="var(--bg-base)" stroke="var(--error)" stroke-width="1.5" />
    <path
      d="M-4 -4L4 4M-4 4L4 -4"
      stroke="var(--error)"
      stroke-width="2"
      stroke-linecap="round"
      fill="none"
    />
  </g>
  <g
    v-else-if="layer === 'under' && tools.connectLine.value"
    class="campaign-roadmap__connecting"
    aria-hidden="true"
  >
    <line
      :x1="tools.connectLine.value.x1"
      :y1="tools.connectLine.value.y1"
      :x2="tools.connectLine.value.x2"
      :y2="tools.connectLine.value.y2"
      stroke="var(--accent)"
      stroke-width="2"
      stroke-dasharray="6 4"
    />
  </g>
  <template v-else-if="layer === 'over' && peerCursors && editable">
    <g class="campaign-roadmap__presence-fx">
      <line
        v-for="c in peerCursors.remoteConnects.value"
        :key="`rconn-${c.key}`"
        :x1="c.x1"
        :y1="c.y1"
        :x2="c.x2"
        :y2="c.y2"
        :stroke="c.color"
        stroke-width="2"
        stroke-dasharray="6 4"
        opacity="0.75"
      />
      <circle
        v-for="r in peerCursors.remoteRings.value"
        :key="`rring-${r.key}`"
        :cx="r.cx"
        :cy="r.cy"
        :r="unit * 0.82"
        fill="none"
        :stroke="r.color"
        stroke-width="2"
        stroke-dasharray="5 4"
        opacity="0.8"
      />
    </g>
    <g class="campaign-roadmap__cursors">
      <CampaignPresenceCursor
        v-for="rc in peerCursors.cursors.value"
        :key="rc.peer.userId"
        :x="rc.x"
        :y="rc.y"
        :inv-scale="invScale"
        :color="rc.peer.color"
        :name="rc.peer.name"
        :avatar-url="rc.peer.avatarUrl"
        :action="rc.peer.action"
        :kind="rc.peer.kind"
      />
    </g>
  </template>
</template>

<style scoped>
.campaign-roadmap__edge-hit {
  pointer-events: stroke;
}

.campaign-roadmap__edges--place .campaign-roadmap__edge-hit,
.campaign-roadmap__edges--interactive .campaign-roadmap__edge-hit {
  cursor: pointer;
}

.campaign-roadmap__edge-group--selected .campaign-roadmap__edge-hit {
  stroke: color-mix(in srgb, var(--page-accent, var(--accent)) 22%, transparent);
}

.campaign-roadmap__edge-x {
  opacity: 0;
  cursor: pointer;
  transition: opacity 140ms ease;
}

.campaign-roadmap__edge-group:hover .campaign-roadmap__edge-x {
  opacity: 1;
}

.campaign-roadmap__connecting line {
  pointer-events: none;
}
</style>
