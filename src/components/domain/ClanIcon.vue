<script setup lang="ts">
import BorderComposition from '@/components/domain/BorderComposition.vue'
import type { PublicClanResponse } from '@/types/api/clans'
import type { BorderColorValue } from '@/types/api/items'
import { clanColorVars } from '@/utils/clans'
import { readBorderShapeValue, readClanEquipped, valueFxLayers } from '@/utils/items'
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    clan: Pick<PublicClanResponse, 'tag' | 'iconUrl'> &
      Partial<Pick<PublicClanResponse, 'equipped' | 'tagColor' | 'primaryColor' | 'secondaryColor'>>
    size?: number | string
  }>(),
  { size: 32 },
)

const FRAME_COLOR: BorderColorValue = {
  states: [{ atMs: 0, fill: { type: 'solid', hex: 'var(--clan-accent, var(--bg-overlay))' } }],
}

const failed = ref(false)
watch(() => props.clan.iconUrl, () => (failed.value = false))

const initials = computed(() => props.clan.tag.slice(0, 2))
const imageUrl = computed(() => (failed.value ? null : props.clan.iconUrl))
const shape = computed(() => readClanEquipped(props.clan.equipped, 'clan_border', readBorderShapeValue))
const effects = computed(() => valueFxLayers(shape.value))
const box = computed(() => ({
  ...clanColorVars({
    tagColor: props.clan.tagColor ?? null,
    primaryColor: props.clan.primaryColor ?? null,
    secondaryColor: props.clan.secondaryColor ?? null,
  }),
  width: typeof props.size === 'number' ? `${props.size}px` : props.size,
  height: typeof props.size === 'number' ? `${props.size}px` : props.size,
}))
</script>

<template>
  <BorderComposition
    v-if="shape"
    class="clan-icon clan-colors"
    :style="box"
    :shape="shape"
    :color="FRAME_COLOR"
    :avatar-url="imageUrl"
    :effects="effects"
    aria-hidden="true"
  >
    <template v-if="!imageUrl" #default="{ maskPath, clipId }">
      <svg class="clan-icon__art" viewBox="0 0 100 100">
        <defs>
          <clipPath :id="clipId" clipPathUnits="userSpaceOnUse"><path :d="maskPath" /></clipPath>
        </defs>
        <g :clip-path="`url(#${clipId})`">
          <rect width="100" height="100" class="clan-icon__bg" />
          <text x="50" y="50" class="clan-icon__initials">{{ initials }}</text>
        </g>
      </svg>
    </template>
  </BorderComposition>
  <img
    v-else-if="imageUrl"
    class="clan-icon clan-colors clan-icon--plain"
    :style="box"
    :src="imageUrl"
    alt=""
    :width="size"
    :height="size"
    loading="lazy"
    decoding="async"
    @error="failed = true"
  />
  <span
    v-else
    class="clan-icon clan-colors clan-icon--plain clan-icon--blank"
    :style="{ ...box, fontSize: typeof size === 'number' ? `${Math.round(size * 0.36)}px` : undefined }"
    aria-hidden="true"
  >{{ initials }}</span>
</template>

<style scoped>
.clan-icon {
  flex-shrink: 0;
}

.clan-icon--plain {
  border-radius: var(--radius-avatar);
  object-fit: cover;
  outline: 2px solid var(--clan-accent, transparent);
  outline-offset: -2px;
}

.clan-icon--blank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--clan-accent, var(--text-tertiary));
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
}

.clan-icon__art {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 88.6%;
  height: 88.6%;
  transform: translate(-50%, -50%);
  overflow: visible;
}

.clan-icon__bg {
  fill: var(--bg-elevated);
}

.clan-icon__initials {
  font-size: 36px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: central;
  fill: var(--clan-accent, var(--text-tertiary));
}
</style>
