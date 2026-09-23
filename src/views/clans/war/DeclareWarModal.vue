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
  PublicClanResponse,
} from '@/types/api/clans'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { attackerPickCount, CLAN_ARENA_LABEL, CLAN_RULESET_LABEL } from '@/utils/clans'
import { COMPLEXITY_MAX } from '@/utils/complexity'
import { computed, ref, watch } from 'vue'
import ClanPicker from '../ClanPicker.vue'
import WarMapPicker from './WarMapPicker.vue'

const ARENAS: ClanArena[] = ['mixed', 'random', 'category_turf', 'complexity_turf']
const RULESETS: ClanRuleset[] = ['duel', 'berserker']

const props = defineProps<{
  open: boolean
  ownClanId: string
  preselected?: PublicClanResponse | null
}>()

const emit = defineEmits<{
  close: []
  declared: [detail: ClanWarDetailResponse]
}>()

const categoryStore = useCategoryStore()

const own = ref<ClanResponse | null>(null)
const unlocked = ref<ClanUnlocksResponse | null>(null)
const steps = ref<ClanLevelStepResponse[]>([])
const target = ref<PublicClanResponse | null>(null)
const targetStanding = ref<number | null>(null)
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
  if (arena.value === 'random' || !own.value || targetStanding.value === null) return 0
  return attackerPickCount(own.value.standing, targetStanding.value)
})

const turfCategoryId = computed(() => (arena.value === 'category_turf' ? categoryId.value || null : null))
const turfMin = computed(() => (arena.value === 'complexity_turf' ? complexity.value[0] : null))
const turfMax = computed(() => (arena.value === 'complexity_turf' ? complexity.value[1] : null))

const ready = computed(() => {
  if (!target.value || !unlocked.value) return false
  if (!unlocked.value.arenas.includes(arena.value) || !unlocked.value.rulesets.includes(ruleset.value)) return false
  if (arena.value === 'category_turf' && !categoryId.value) return false
  if (arena.value === 'complexity_turf' && complexity.value[0] >= complexity.value[1]) return false
  return arena.value === 'random' || picks.value.length === pickCount.value
})

function unlockLevel(axis: 'arenas' | 'rulesets', mode: string): number | null {
  const step = steps.value.find((s) => (s.unlocks[axis] as string[]).includes(mode))
  return step ? step.level : null
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const api = await import('@/api/clans')
    const [clan, level, table] = await Promise.all([
      api.getClan(props.ownClanId),
      api.getClanLevel(props.ownClanId),
      api.getClanLevels(),
    ])
    own.value = clan
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

async function selectTarget(clan: PublicClanResponse | null) {
  target.value = clan
  targetStanding.value = null
  if (!clan) return
  try {
    const { getClan } = await import('@/api/clans')
    targetStanding.value = (await getClan(clan.id)).standing
  } catch {
    targetStanding.value = 0
  }
}

async function submit() {
  if (!ready.value || saving.value || !target.value) return
  saving.value = true
  error.value = null
  fieldErrors.value = {}
  try {
    const { declareClanWar } = await import('@/api/clans')
    const detail = await declareClanWar(props.ownClanId, {
      clanId: target.value.id,
      arena: arena.value,
      ruleset: ruleset.value,
      categoryId: turfCategoryId.value ?? undefined,
      complexityMin: turfMin.value ?? undefined,
      complexityMax: turfMax.value ?? undefined,
      mapDifficultyIds: arena.value === 'random' ? [] : picks.value.map((d) => d.id),
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
    void selectTarget(props.preselected ?? null)
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

    <div v-else-if="own && unlocked" class="declare">
      <section class="declare__step">
        <h3 class="declare__label">Target</h3>
        <div v-if="target" class="declare__target">
          <ClanIcon :clan="target" :size="32" />
          <ClanTag :clan="target" size="md" />
          <span class="declare__target-name">{{ target.name }}</span>
          <BaseButton size="sm" :disabled="saving" @click="selectTarget(null)">Change</BaseButton>
        </div>
        <ClanPicker v-else :exclude-ids="[ownClanId]" placeholder="Search a clan to attack..." @select="selectTarget" />
        <p v-if="fieldErrors.clanId" class="declare__error" role="alert">{{ fieldErrors.clanId }}</p>
      </section>

      <section class="declare__step">
        <h3 class="declare__label">Arena</h3>
        <div class="declare__tiles" role="radiogroup">
          <button
            v-for="option in ARENAS"
            :key="option"
            type="button"
            role="radio"
            class="declare__tile"
            :class="{ 'declare__tile--active': arena === option }"
            :aria-checked="arena === option"
            :disabled="saving || !unlocked.arenas.includes(option)"
            @click="arena = option"
          >
            <span>{{ CLAN_ARENA_LABEL[option] }}</span>
            <span v-if="!unlocked.arenas.includes(option)" class="declare__lock">
              {{ unlockLevel('arenas', option) === null ? 'Locked' : `Level ${unlockLevel('arenas', option)}` }}
            </span>
          </button>
        </div>
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
        <h3 class="declare__label">Ruleset</h3>
        <div class="declare__tiles" role="radiogroup">
          <button
            v-for="option in RULESETS"
            :key="option"
            type="button"
            role="radio"
            class="declare__tile"
            :class="{ 'declare__tile--active': ruleset === option }"
            :aria-checked="ruleset === option"
            :disabled="saving || !unlocked.rulesets.includes(option)"
            @click="ruleset = option"
          >
            <span>{{ CLAN_RULESET_LABEL[option] }}</span>
            <span v-if="!unlocked.rulesets.includes(option)" class="declare__lock">
              {{ unlockLevel('rulesets', option) === null ? 'Locked' : `Level ${unlockLevel('rulesets', option)}` }}
            </span>
          </button>
        </div>
      </section>

      <section v-if="arena !== 'random'" class="declare__step">
        <h3 class="declare__label">Your picks</h3>
        <p v-if="!target" class="declare__hint">Pick a target first, the pick count depends on both Standings.</p>
        <p v-else-if="targetStanding === null" class="declare__hint">Working out the pick count...</p>
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
      <p v-else class="declare__hint">A random arena takes no picks, the whole pool rolls at random.</p>

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
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
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

.declare__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--space-sm);
}

.declare__tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: var(--space-sm) var(--space-md);
  font: inherit;
  font-size: var(--text-body);
  font-weight: 600;
  text-align: left;
  color: var(--text-primary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.declare__tile:hover:not(:disabled) {
  border-color: var(--text-tertiary);
}

.declare__tile--active {
  color: var(--page-accent, var(--accent));
  border-color: var(--page-accent, var(--accent));
}

.declare__tile:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.declare__lock {
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-tertiary);
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
