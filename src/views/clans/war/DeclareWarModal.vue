<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import RangeSlider from '@/components/common/RangeSlider.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import { useCategoryStore } from '@/stores/categories'
import type {
  ClanArena,
  ClanLevelStepResponse,
  ClanResponse,
  ClanRuleset,
  ClanUnlocksResponse,
  ClanWarDetailResponse,
} from '@/types/api/clans'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { attackerPickCount, CLAN_ARENA_LABEL, CLAN_RULESET_LABEL, isRandomArena } from '@/utils/clans'
import { COMPLEXITY_MAX } from '@/utils/complexity'
import { computed, ref, watch } from 'vue'
import ClanPicker from '../ClanPicker.vue'
import { loadClanLevels } from '../clanLevels'
import WarMapPicker from './WarMapPicker.vue'
import WarOptionTiles, { type WarOption } from './WarOptionTiles.vue'

const ARENAS: ClanArena[] = ['mixed', 'random', 'modern_random', 'category_turf', 'complexity_turf']
const RULESETS: ClanRuleset[] = ['duel', 'berserker']

const props = defineProps<{
  open: boolean
  ownClan: ClanResponse
  preselected?: ClanResponse | null
}>()

const emit = defineEmits<{
  close: []
  declared: [detail: ClanWarDetailResponse]
}>()

const categoryStore = useCategoryStore()

const unlocked = ref<ClanUnlocksResponse | null>(null)
const steps = ref<ClanLevelStepResponse[]>([])
const target = ref<ClanResponse | null>(null)
const arena = ref<ClanArena>('mixed')
const ruleset = ref<ClanRuleset>('duel')
const categoryId = ref('')
const complexity = ref<[number, number]>([0, COMPLEXITY_MAX])
const picks = ref<PublicMapDifficultyResponse[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const categoryOptions = computed(() =>
  categoryStore.categories.filter((c) => c.countForOverall).map((c) => ({ value: c.id, label: c.name })),
)

const pickCount = computed(() => {
  if (isRandomArena(arena.value) || !target.value) return 0
  return attackerPickCount(props.ownClan.standing, target.value.standing)
})

const turfCategoryId = computed(() => (arena.value === 'category_turf' ? categoryId.value || null : null))
const turfMin = computed(() => (arena.value === 'complexity_turf' ? complexity.value[0] : null))
const turfMax = computed(() => (arena.value === 'complexity_turf' ? complexity.value[1] : null))

const ready = computed(() => {
  if (!target.value || !unlocked.value) return false
  if (!unlocked.value.arenas.includes(arena.value) || !unlocked.value.rulesets.includes(ruleset.value)) return false
  if (arena.value === 'category_turf' && !categoryId.value) return false
  if (arena.value === 'complexity_turf' && complexity.value[0] >= complexity.value[1]) return false
  return isRandomArena(arena.value) || picks.value.length === pickCount.value
})

function lockLabel(axis: 'arenas' | 'rulesets', mode: string): string {
  const step = steps.value.find((s) => (s.unlocks[axis] as string[]).includes(mode))
  return step ? `Level ${step.level}` : 'Locked'
}

function modeOptions(axis: 'arenas' | 'rulesets', modes: string[], labels: Record<string, string>): WarOption[] {
  return modes.map((mode) => {
    const locked = !(unlocked.value?.[axis] as string[] | undefined)?.includes(mode)
    return { key: mode, label: labels[mode], disabled: locked, note: locked ? lockLabel(axis, mode) : undefined }
  })
}

const arenaOptions = computed(() => modeOptions('arenas', ARENAS, CLAN_ARENA_LABEL))
const rulesetOptions = computed(() => modeOptions('rulesets', RULESETS, CLAN_RULESET_LABEL))

async function load() {
  loading.value = true
  error.value = null
  try {
    const api = await import('@/api/clans')
    const [level, table] = await Promise.all([api.getClanLevel(props.ownClan.clan.id), loadClanLevels()])
    unlocked.value = level.unlocked
    steps.value = table
    arena.value = level.unlocked.arenas.includes('mixed') ? 'mixed' : (level.unlocked.arenas[0] ?? 'mixed')
    ruleset.value = level.unlocked.rulesets[0] ?? 'duel'
  } catch (err) {
    error.value = parseApiError(err, 'Could not load your clan.').message
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!ready.value || saving.value || !target.value) return
  saving.value = true
  error.value = null
  fieldErrors.value = {}
  try {
    const { declareClanWar } = await import('@/api/clans')
    const detail = await declareClanWar(props.ownClan.clan.id, {
      clanId: target.value.clan.id,
      arena: arena.value,
      ruleset: ruleset.value,
      categoryId: turfCategoryId.value ?? undefined,
      complexityMin: turfMin.value ?? undefined,
      complexityMax: turfMax.value ?? undefined,
      mapDifficultyIds: isRandomArena(arena.value) ? [] : picks.value.map((d) => d.id),
    })
    emit('declared', detail)
  } catch (err) {
    const parsed = parseApiError(err, 'Could not declare that war.')
    const errors: Record<string, string> = {}
    for (const fe of parsed.fieldErrors) errors[fe.field] = fe.message
    fieldErrors.value = errors
    error.value = parsed.fieldErrors.length === 0 ? parsed.message : null
  } finally {
    saving.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    picks.value = []
    categoryId.value = ''
    complexity.value = [0, COMPLEXITY_MAX]
    fieldErrors.value = {}
    target.value = props.preselected ?? null
    void load()
  },
  { immediate: true },
)

watch(arena, () => {
  picks.value = []
})
</script>

<template>
  <BaseModal :open="open" title="Declare war" max-width="640px" @close="emit('close')">
    <div v-if="loading" class="declare__skeleton">
      <SkeletonLoader variant="text" :lines="3" />
      <SkeletonLoader variant="card" height="120px" />
    </div>

    <div v-else-if="unlocked" class="declare">
      <section class="declare__step">
        <h3 class="declare__label field-label">Target</h3>
        <div v-if="target" class="declare__target">
          <ClanIcon :clan="target.clan" :size="32" />
          <ClanTag :clan="target.clan" size="md" />
          <span class="declare__target-name">{{ target.clan.name }}</span>
          <BaseButton size="sm" :disabled="saving" @click="target = null">Change</BaseButton>
        </div>
        <ClanPicker
          v-else
          :exclude-ids="[ownClan.clan.id]"
          placeholder="Search a clan to attack..."
          @select="target = $event"
        />
        <p v-if="fieldErrors.clanId" class="declare__error" role="alert">{{ fieldErrors.clanId }}</p>
      </section>

      <section class="declare__step">
        <h3 class="declare__label field-label">Arena</h3>
        <WarOptionTiles
          :model-value="arena"
          :options="arenaOptions"
          label="Arena"
          :disabled="saving"
          @update:model-value="arena = $event as ClanArena"
        />
        <p v-if="fieldErrors.arena" class="declare__error" role="alert">{{ fieldErrors.arena }}</p>

        <BaseSelect
          v-if="arena === 'category_turf'"
          v-model="categoryId"
          label="Category"
          placeholder="Pick a category"
          :options="categoryOptions"
        />
        <p v-if="fieldErrors.categoryId" class="declare__error" role="alert">{{ fieldErrors.categoryId }}</p>

        <RangeSlider
          v-if="arena === 'complexity_turf'"
          v-model="complexity"
          label="Complexity range"
          :min="0"
          :max="COMPLEXITY_MAX"
          :step="0.5"
        />
        <p v-if="fieldErrors.complexityMin" class="declare__error" role="alert">{{ fieldErrors.complexityMin }}</p>
      </section>

      <section class="declare__step">
        <h3 class="declare__label field-label">Ruleset</h3>
        <WarOptionTiles
          :model-value="ruleset"
          :options="rulesetOptions"
          label="Ruleset"
          :disabled="saving"
          @update:model-value="ruleset = $event as ClanRuleset"
        />
      </section>

      <section v-if="!isRandomArena(arena)" class="declare__step">
        <h3 class="declare__label field-label">Your picks</h3>
        <p v-if="!target" class="declare__hint">Pick a target first.</p>
        <WarMapPicker
          v-else
          v-model="picks"
          :count="pickCount"
          :category-id="turfCategoryId"
          :complexity-min="turfMin"
          :complexity-max="turfMax"
          :disabled="saving"
        />
        <p v-if="fieldErrors.mapDifficultyIds" class="declare__error" role="alert">{{ fieldErrors.mapDifficultyIds }}</p>
      </section>

      <p v-if="error" class="declare__error" role="alert">{{ error }}</p>
    </div>

    <p v-else class="declare__error" role="alert">{{ error }}</p>

    <template #footer>
      <BaseButton :disabled="saving" @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="destructive" :loading="saving" :disabled="!ready" @click="submit">Declare war</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.declare,
.declare__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.declare__step {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.declare__label {
  margin: 0;
}

.declare__target {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-card-title);
}

.declare__target-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.declare__hint {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.declare__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}
</style>
