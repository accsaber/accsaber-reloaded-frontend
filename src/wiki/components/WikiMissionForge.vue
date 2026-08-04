<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import UserPicker from '@/components/domain/UserPicker.vue'
import MissionCard from '@/components/domain/MissionCard.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { BAND_WEIGHTS, TEMPLATES, type ForgeMissionType } from '@/wiki/missionSim'
import ForgeBars from '@/wiki/components/forge/ForgeBars.vue'
import ForgeBoard from '@/wiki/components/forge/ForgeBoard.vue'
import ForgeChain from '@/wiki/components/forge/ForgeChain.vue'
import ForgeMapPool from '@/wiki/components/forge/ForgeMapPool.vue'
import ForgeRoll from '@/wiki/components/forge/ForgeRoll.vue'
import ForgeWindow from '@/wiki/components/forge/ForgeWindow.vue'
import { useMissionForge, type ForgeProfile } from '@/wiki/useMissionForge'
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  profile: ForgeProfile | null
  target: string | null
  targetNotice?: string | null
}>()

const emit = defineEmits<{
  'update:target': [value: string | null]
  pick: [user: { userId: string; userName: string } | null]
}>()

const AUTO_MS = 7000

interface TypeOption {
  type: ForgeMissionType
  pool: 'daily' | 'weekly'
  label: string
  description: string
  needsHistory: boolean
}

const TYPE_OPTIONS: TypeOption[] = [
  { type: 'AP_ON_MAP', pool: 'daily', label: 'Score AP on a map', description: 'the full pipeline', needsHistory: false },
  { type: 'ACC_ON_MAP', pool: 'daily', label: 'Hit an accuracy', description: 'same, as a percentage', needsHistory: false },
  { type: 'PB_SPECIFIC_MAP', pool: 'daily', label: 'Beat your best', description: 'must clear your own score', needsHistory: false },
  { type: 'SNIPE_PLAYER_ON_MAP', pool: 'daily', label: 'Snipe a player', description: 'picks a real rival', needsHistory: false },
  { type: 'STREAK_ON_MAP', pool: 'daily', label: 'Streak on a map', description: 'reads your streak history', needsHistory: true },
  { type: 'STREAK_N_IN_CATEGORY', pool: 'weekly', label: 'Streak across a category', description: 'no map involved', needsHistory: true },
  { type: 'PB_ABOVE_THRESHOLD', pool: 'daily', label: 'Push your top plays', description: 'reads your score list', needsHistory: true },
  { type: 'COMEBACK_PB', pool: 'daily', label: 'Comeback', description: 'a play over a year old', needsHistory: true },
  { type: 'PLAY_N_MAPS', pool: 'daily', label: 'Play N maps', description: 'just a count', needsHistory: false },
  { type: 'SCORES_N', pool: 'daily', label: 'Set N scores', description: 'the simplest one', needsHistory: false },
  { type: 'XP_IN_WINDOW', pool: 'daily', label: 'Earn XP', description: 'sized off your pace', needsHistory: false },
]

const GHOST_STATIONS = ['Template', 'Category', 'Band', 'Starting point', 'Range', 'Map', 'Target', 'Reward', 'Mission']
const GHOST_BARS = [62, 40, 78, 55, 34, 70, 48, 88, 44, 58]

const STATION_LABELS: Record<string, string> = {
  template: 'Template',
  category: 'Category',
  band: 'Band',
  anchor: 'Starting point',
  window: 'Range',
  pool: 'Map',
  existing: 'Your play',
  chain: 'Target',
  board: 'Rival',
  streak: 'Streaks',
  percentile: 'Top plays',
  count: 'Count',
  xpwindow: 'Goal',
  reward: 'Reward',
  result: 'Mission',
}

const selectOptions = computed(() => [
  { value: 'random', label: 'Surprise me', description: 'rolled like the game rolls it' },
  ...TYPE_OPTIONS.map((o) => ({
    value: o.type as string,
    label: o.label,
    description: o.description,
  })),
])

const MAX_ATTEMPTS = 6

const NON_RETRYABLE = new Set(['needs-real-profile', 'no-category', 'unsupported-type'])

const FAILURE_LABELS: Record<string, string> = {
  'no-eligible-map': 'no map fit the complexity range',
  'map-wr-below-user-tier': 'every sampled map had a world record below your tier',
  'no-snipe-candidate-within-band': 'no snipe target survived the filters',
  'target-below-existing-after-caps': 'the target landed under a score already on the board',
  'target-below-min-meaningful': 'the target came out too small to be worth setting',
  'user-streak-too-low': 'not enough streak history in the rolled category',
  'user-streak-too-low-for-complexity': 'not enough streak history at that map difficulty',
  'too-few-scores-in-category': 'not enough scores in the rolled category',
  'no-old-scores-for-comeback': 'no plays old enough for a comeback',
  'needs-real-profile': 'this type needs a logged-in score history',
  'no-category': 'no playable category to build against',
  'unsupported-type': 'this type cannot be simulated',
}

const choice = ref('random')
const activeType = ref<ForgeMissionType>('AP_ON_MAP')
const index = ref(0)
const furthest = ref(0)
const playing = ref(false)
const attemptCount = ref(0)
const discarded = ref<string[]>([])

const profileRef = () => props.profile
const { stages, loading, error, failure, run } = useMissionForge(profileRef)

const reduceMotion = useReducedMotion()

let timer: number | null = null

function clearTimer() {
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
}

function scheduleNext() {
  clearTimer()
  if (!playing.value) return
  if (index.value >= stages.value.length - 1) {
    playing.value = false
    return
  }
  timer = window.setTimeout(() => {
    goTo(index.value + 1, true)
    scheduleNext()
  }, AUTO_MS)
}

onUnmounted(clearTimer)

function goTo(next: number, keepPlaying = false) {
  if (!keepPlaying) {
    playing.value = false
    clearTimer()
  }
  index.value = Math.max(0, Math.min(stages.value.length - 1, next))
  if (index.value > furthest.value) furthest.value = index.value
}

function rollWeightedType(): ForgeMissionType {
  const pool = TEMPLATES.filter((t) => t.pool === 'daily')
  const total = pool.reduce((sum, t) => sum + t.weight, 0)
  let roll = Math.random() * total
  for (const template of pool) {
    roll -= template.weight
    if (roll <= 0) return template.type
  }
  return pool[0].type
}

async function forge() {
  clearTimer()
  playing.value = false
  index.value = 0
  furthest.value = 0
  discarded.value = []
  attemptCount.value = 0
  const surprise = choice.value === 'random'
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attemptCount.value = attempt
    const type = surprise ? rollWeightedType() : (choice.value as ForgeMissionType)
    activeType.value = type
    const option = TYPE_OPTIONS.find((o) => o.type === type) ?? TYPE_OPTIONS[0]
    await run(type, option.pool, Math.floor(Math.random() * 2 ** 31))
    if (error.value) return
    if (!failure.value) break
    if (!surprise && NON_RETRYABLE.has(failure.value)) break
    if (attempt < MAX_ATTEMPTS) {
      discarded.value.push(FAILURE_LABELS[failure.value] ?? failure.value)
    }
  }
  if (!stages.value.length) return
  if (failure.value) return
  if (reduceMotion.value) {
    furthest.value = stages.value.length - 1
    return
  }
  playing.value = true
  scheduleNext()
}

function togglePlay() {
  playing.value = !playing.value
  if (playing.value) scheduleNext()
  else clearTimer()
}

watch(choice, () => {
  if (props.profile && stages.value.length) void forge()
})

watch(() => props.profile?.userId, (next, prev) => {
  if (next === prev || !stages.value.length) return
  clearTimer()
  playing.value = false
  stages.value = []
  error.value = null
  failure.value = null
  index.value = 0
  furthest.value = 0
  discarded.value = []
  attemptCount.value = 0
})

const stage = computed(() => stages.value[index.value] ?? null)
const atStart = computed(() => index.value === 0)
const atEnd = computed(() => index.value >= stages.value.length - 1)

const activeOption = computed(
  () => TYPE_OPTIONS.find((o) => o.type === activeType.value) ?? TYPE_OPTIONS[0],
)

const historyBlocked = computed(
  () => activeOption.value.needsHistory && props.profile !== null && !props.profile.userId,
)

const targetPlaceholder = computed(() => {
  if (!props.profile) return 'Loading...'
  return props.profile.real ? 'your profile' : props.profile.name
})

const failureLabel = computed(() =>
  failure.value ? (FAILURE_LABELS[failure.value] ?? failure.value) : null,
)

const stations = computed(() =>
  stages.value.map((s, i) => ({
    key: `${s.key}-${i}`,
    label: STATION_LABELS[s.key] ?? s.title,
    index: i,
    done: i < index.value,
    current: i === index.value,
    reached: i <= furthest.value,
  })),
)

function bandSegmentsFor(band: string) {
  return (Object.keys(BAND_WEIGHTS) as (keyof typeof BAND_WEIGHTS)[]).map((key) => ({
    key,
    label: key,
    weight: BAND_WEIGHTS[key],
    active: key === band,
  }))
}

function templateSegments(data: Extract<(typeof stages.value)[number]['data'], { kind: 'template' }>) {
  return data.templates.map((t) => ({
    key: t.code,
    label: t.name,
    weight: t.weight,
    active: t.chosen,
  }))
}
</script>

<template>
  <section class="forge" aria-label="Mission builder">
    <header class="forge__head">
      <BaseButton
        class="forge__cta"
        variant="primary"
        size="sm"
        :disabled="loading || !profile"
        @click="forge"
      >
        {{ loading ? 'Forging' : stages.length ? 'Forge another' : 'Forge a mission' }}
      </BaseButton>
      <BaseSelect v-model="choice" :options="selectOptions" placeholder="Mission type" />
      <span class="forge__against">against</span>
      <UserPicker
        class="forge__picker"
        :model-value="target"
        :placeholder="targetPlaceholder"
        @update:model-value="emit('update:target', $event)"
        @select="emit('pick', $event)"
      />
    </header>

    <p v-if="targetNotice" class="forge__notice">{{ targetNotice }}</p>
    <p v-if="!profile" class="forge__notice">Loading a profile to build against.</p>
    <p v-else-if="error" class="forge__notice forge__notice--bad">{{ error }}</p>
    <p v-else-if="historyBlocked" class="forge__notice">
      This one reads a real score history. Log in and it will build against yours.
    </p>

    <button
      v-if="profile && !stages.length"
      type="button"
      class="poster"
      :disabled="loading"
      aria-label="Forge a mission"
      @click="forge"
    >
      <span class="poster__ghost" aria-hidden="true">
        <span class="poster__rail">
          <span v-for="(label, i) in GHOST_STATIONS" :key="label" class="poster__station">
            <span class="poster__node">{{ i + 1 }}</span>
            <span class="poster__station-label">{{ label }}</span>
          </span>
        </span>
        <span class="poster__readout">
          <span class="poster__line poster__line--title" />
          <span class="poster__bars">
            <span
              v-for="(height, i) in GHOST_BARS"
              :key="i"
              class="poster__bar"
              :style="{ height: `${height}%` }"
            />
          </span>
          <span class="poster__line" style="width: 88%" />
          <span class="poster__line" style="width: 72%" />
          <span class="poster__line" style="width: 55%" />
        </span>
      </span>
      <span class="poster__play" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
      <span class="poster__hint" aria-hidden="true">
        {{ loading ? 'Forging' : 'Forge a mission' }}
      </span>
    </button>

    <template v-if="stages.length">
      <p v-if="failure && !historyBlocked" class="forge__notice forge__notice--bad">
        {{
          attemptCount > 1
            ? `Rolled ${attemptCount} times and every build died, the last one because ${failureLabel}.`
            : `This build died mid-forge: ${failureLabel}.`
        }}
        The stages below show exactly where it stopped. That is the system refusing to hand out a
        junk mission, hit forge and roll again.
      </p>
      <p v-else-if="discarded.length" class="forge__notice">
        Landed on roll {{ attemptCount }}. Thrown out on the way: {{ discarded.join('; ') }}. The
        real assigner sifts exactly the same way every morning.
      </p>

      <nav class="chainrail" aria-label="Build stages">
        <button
          v-for="station in stations"
          :key="station.key"
          type="button"
          class="chainrail__station"
          :class="{
            'chainrail__station--done': station.done,
            'chainrail__station--current': station.current,
            'chainrail__station--ahead': !station.reached,
          }"
          :aria-current="station.current ? 'step' : undefined"
          @click="goTo(station.index)"
        >
          <span class="chainrail__node">{{ station.index + 1 }}</span>
          <span class="chainrail__label">{{ station.label }}</span>
        </button>
      </nav>

      <div v-if="stage" class="readout">
        <div class="readout__body">
          <h4 class="readout__title">{{ stage.title }}</h4>

          <div class="readout__visual">
            <ForgeRoll
              v-if="stage.data.kind === 'template'"
              :segments="templateSegments(stage.data)"
              :caption="`weighted against every other ${stage.data.pool} template`"
            />

            <div v-else-if="stage.data.kind === 'category'" class="chips">
              <span
                v-for="option in stage.data.options"
                :key="option.code"
                class="chips__chip"
                :class="{ 'chips__chip--active': option.chosen }"
              >
                {{ option.name }}
                <span class="chips__meta">{{ option.plays }} plays</span>
              </span>
              <span v-if="!stage.data.options.length" class="chips__chip">No category</span>
            </div>

            <ForgeRoll
              v-else-if="stage.data.kind === 'band'"
              :segments="bandSegmentsFor(stage.data.band)"
              caption="how a daily slot rolls its band"
            />

            <div v-else-if="stage.data.kind === 'anchor'" class="figures">
              <span class="figures__item">
                <span class="figures__label">AP for one gain</span>
                <span class="figures__value">{{ Math.round(stage.data.base).toLocaleString() }}</span>
              </span>
              <span v-if="stage.data.lifted !== stage.data.base" class="figures__item">
                <span class="figures__label">Lifted from {{ stage.data.fromCategory }}</span>
                <span class="figures__value">{{ Math.round(stage.data.lifted).toLocaleString() }}</span>
              </span>
              <span v-if="stage.data.ceiling !== null" class="figures__item">
                <span class="figures__label">Ceiling for this band</span>
                <span class="figures__value">{{ Math.round(stage.data.ceiling).toLocaleString() }}</span>
              </span>
              <span class="figures__item figures__item--strong">
                <span class="figures__label">Starting point</span>
                <span class="figures__value">{{ Math.round(stage.data.anchored).toLocaleString() }} AP</span>
              </span>
            </div>

            <ForgeWindow
              v-else-if="stage.data.kind === 'window'"
              :min="stage.data.poolMin - 0.5"
              :max="stage.data.poolMax + 0.5"
              :window-min="stage.data.min"
              :window-max="stage.data.max"
              :empty="stage.data.empty"
              axis-label="Map complexity"
            />

            <ForgeMapPool
              v-else-if="stage.data.kind === 'pool'"
              :total="stage.data.total"
              :sample="stage.data.sample"
              :picked="stage.data.picked"
            />

            <ForgeRoll
              v-else-if="stage.data.kind === 'existing'"
              :segments="bandSegmentsFor(stage.data.blended)"
              :caption="stage.data.caption"
            />

            <ForgeChain
              v-else-if="stage.data.kind === 'chain'"
              :steps="stage.data.steps"
              :final="stage.data.final"
              :accuracy="stage.data.accuracy"
            />

            <ForgeBoard
              v-else-if="stage.data.kind === 'board'"
              :entries="stage.data.entries"
              :target="stage.data.target"
              :floor="stage.data.floor"
              :cap="stage.data.cap"
              :user-skill="stage.data.userSkill"
              :max-skill-distance="stage.data.maxSkillDistance"
            />

            <ForgeBars
              v-else-if="stage.data.kind === 'streak'"
              :values="stage.data.sample"
              :highlight-index="stage.data.pickIndex"
              :marker-value="stage.data.target || null"
              :marker-label="`asks for ${stage.data.target}`"
              :caption="
                stage.data.complexityBand
                  ? `your best streaks on complexity ${stage.data.complexityBand[0]} to ${stage.data.complexityBand[1]} maps`
                  : 'your best streaks in this category'
              "
            />

            <ForgeBars
              v-else-if="stage.data.kind === 'percentile'"
              :values="stage.data.scores"
              :highlight-index="stage.data.index"
              :marker-value="stage.data.threshold"
              :marker-label="`${Math.round(stage.data.threshold)} AP`"
              caption="your scores in this category, best first"
            />

            <ForgeWindow
              v-else-if="stage.data.kind === 'count'"
              :min="stage.data.min - 1"
              :max="stage.data.max + 1"
              :window-min="stage.data.min"
              :window-max="stage.data.max"
              :markers="[
                { value: stage.data.center, label: 'center', muted: true },
                { value: stage.data.count, label: String(stage.data.count) },
              ]"
              axis-label="How many"
              integer
            />

            <div v-else-if="stage.data.kind === 'xpwindow'" class="figures">
              <span class="figures__item">
                <span class="figures__label">Your daily pace</span>
                <span class="figures__value">{{ Math.round(stage.data.rolling).toLocaleString() }} XP</span>
              </span>
              <span class="figures__item">
                <span class="figures__label">Band multiplier</span>
                <span class="figures__value">{{ stage.data.multiplier.toFixed(2) }}x</span>
              </span>
              <span class="figures__item figures__item--strong">
                <span class="figures__label">Goal</span>
                <span class="figures__value">{{ stage.data.target.toLocaleString() }} XP</span>
              </span>
            </div>

            <div v-else-if="stage.data.kind === 'reward'" class="figures">
              <span class="figures__item">
                <span class="figures__label">Skill curve</span>
                <span class="figures__value">{{ Math.round(stage.data.base).toLocaleString() }}</span>
              </span>
              <span class="figures__item">
                <span class="figures__label">Template</span>
                <span class="figures__value">{{ stage.data.xpMultiplier.toFixed(2) }}x</span>
              </span>
              <span class="figures__item">
                <span class="figures__label">Band</span>
                <span class="figures__value">{{ stage.data.bandMultiplier.toFixed(2) }}x</span>
              </span>
              <span v-if="stage.data.boost > 1" class="figures__item">
                <span class="figures__label">Distance</span>
                <span class="figures__value">{{ stage.data.boost.toFixed(2) }}x</span>
              </span>
              <span class="figures__item figures__item--strong">
                <span class="figures__label">Pays</span>
                <span class="figures__value">{{ stage.data.total.toLocaleString() }} XP</span>
              </span>
            </div>

            <div v-else-if="stage.data.kind === 'result'" class="result">
              <MissionCard :mission="stage.data.mission" />
            </div>
          </div>

          <p class="readout__note">{{ stage.note }}</p>
        </div>

        <div class="controls">
          <span
            v-if="playing && !atEnd"
            :key="index"
            class="controls__tick"
            :style="{ animationDuration: `${AUTO_MS}ms` }"
          />
          <div class="controls__row">
            <button
              type="button"
              class="controls__btn"
              aria-label="Previous stage"
              :disabled="atStart"
              @click="goTo(index - 1)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              class="controls__btn controls__btn--wide"
              :disabled="atEnd"
              @click="togglePlay"
            >
              <svg v-if="playing" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="7 4 20 12 7 20" />
              </svg>
              {{ playing ? 'Pause' : 'Play' }}
            </button>
            <button
              type="button"
              class="controls__btn"
              aria-label="Next stage"
              :disabled="atEnd"
              @click="goTo(index + 1)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <span class="controls__count">{{ index + 1 }} / {{ stages.length }}</span>
          </div>
        </div>
      </div>
    </template>


    <p class="forge__aside">
      The map pool, the leaderboards, the world records and the covers above are fetched live as it
      runs, and the maths is the same maths the server uses. The dice are the one exception: this
      rolls its own instead of replaying the roll behind today's missions, so two runs give you two
      different missions.
    </p>
  </section>
</template>

<style scoped>
.forge {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin: 0 0 var(--space-lg);
}

.forge__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.forge__head :deep(.forge__cta) {
  min-width: 138px;
  justify-content: center;
}

.forge__head :deep(.base-select__trigger) {
  min-width: 264px;
}

.forge__against {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.forge__head :deep(.forge__picker) {
  width: 240px;
}

.forge__head :deep(.forge__picker .user-picker__input),
.forge__head :deep(.forge__picker .user-picker__selected) {
  padding-top: 6px;
  padding-bottom: 6px;
}

.forge__notice {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.forge__notice--bad {
  color: var(--error);
}

.chainrail {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.chainrail::-webkit-scrollbar {
  display: none;
}

.chainrail__station {
  flex: 1 0 auto;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 58px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
  color: var(--text-tertiary);
}

.chainrail__station::before,
.chainrail__station::after {
  content: '';
  position: absolute;
  top: 11px;
  width: 50%;
  height: 1px;
  background: var(--bg-overlay);
}

.chainrail__station::before {
  left: 0;
}

.chainrail__station::after {
  left: 50%;
}

.chainrail__station:first-child::before,
.chainrail__station:last-child::after {
  display: none;
}

.chainrail__station--done::before,
.chainrail__station--current::before,
.chainrail__station--done::after {
  background: var(--accent);
}

.chainrail__node {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--bg-overlay);
  background: var(--bg-base);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: inherit;
  transition: border-color 140ms ease, background-color 140ms ease, color 140ms ease;
}

.chainrail__label {
  font-size: 0.625rem;
  letter-spacing: 0.04em;
  text-align: center;
  line-height: 1.3;
  transition: color 140ms ease;
}

.chainrail__station--done {
  color: var(--text-secondary);
}

.chainrail__station--done .chainrail__node {
  border-color: var(--accent);
  color: var(--accent);
}

.chainrail__station--current {
  color: var(--text-primary);
}

.chainrail__station--current .chainrail__node {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--bg-base);
  font-weight: 700;
}

.chainrail__station--ahead {
  color: var(--text-tertiary);
  opacity: 0.55;
}

.chainrail__station:hover .chainrail__label {
  color: var(--text-primary);
}

.chainrail__station:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius-btn);
}

.readout {
  display: flex;
  flex-direction: column;
  min-height: 340px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.readout__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  flex: 1;
  padding: var(--space-lg);
  padding-bottom: var(--space-sm);
}

.readout__title {
  margin: 0;
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.readout__note {
  margin: 0;
  max-width: 68ch;
  font-size: var(--text-body);
  line-height: 1.65;
  color: var(--text-secondary);
}

.controls {
  position: sticky;
  bottom: var(--space-md);
  z-index: 1;
  align-self: flex-end;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  margin: 0 var(--space-md) var(--space-md);
}

.controls__tick {
  height: 1px;
  background: var(--accent);
  transform-origin: left center;
  animation: controls-tick linear forwards;
}

@keyframes controls-tick {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

.controls__row {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: var(--bg-elevated);
}

.controls__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 28px;
  height: 26px;
  padding: 0 7px;
  border: none;
  border-radius: 2px;
  background: transparent;
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--text-caption);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.controls__btn--wide {
  min-width: 62px;
}

.controls__btn:hover:not(:disabled) {
  background: var(--bg-overlay);
}

.controls__btn:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.controls__btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

.controls__count {
  padding: 0 var(--space-sm) 0 6px;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.chips__chip {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.chips__chip--active {
  color: var(--text-primary);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.chips__meta {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--text-tertiary);
}

.figures {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.figures__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.figures__label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
}

.figures__value {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--text-primary);
}

.figures__item--strong .figures__value {
  color: var(--accent);
  font-size: 1.375rem;
  font-weight: 600;
}

.result {
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-base);
}

.forge__aside {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  line-height: 1.6;
}

@media (prefers-reduced-motion: reduce) {
  .controls__tick {
    animation: none;
    transform: scaleX(1);
  }

  .chainrail__node,
  .chainrail__label,
  .controls__btn {
    transition: none;
  }
}

@media (max-width: 640px) {
  .readout__body {
    padding: var(--space-md);
    padding-bottom: var(--space-sm);
  }

  .controls {
    margin: 0 var(--space-sm) var(--space-sm);
  }
}

.poster {
  position: relative;
  display: block;
  width: 100%;
  min-height: 420px;
  padding: 0;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 120ms ease;
}

.poster:hover:not(:disabled) {
  border-color: var(--text-tertiary);
}

.poster:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}

.poster:disabled {
  cursor: wait;
}

.poster__ghost {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  filter: blur(5px);
  opacity: 0.45;
  pointer-events: none;
  user-select: none;
}

.poster__rail {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.poster__station {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.poster__node {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--text-tertiary);
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--text-secondary);
}

.poster__station-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.poster__readout {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-base);
}

.poster__line {
  display: block;
  height: 8px;
  border-radius: 2px;
  background: var(--bg-overlay);
}

.poster__line--title {
  width: 34%;
  height: 12px;
}

.poster__bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 56px;
}

.poster__bar {
  flex: 1;
  background: var(--bg-overlay);
  border-radius: 1px 1px 0 0;
}

.poster__play {
  position: absolute;
  top: calc(50% - 12px);
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border: 1px solid var(--text-secondary);
  border-radius: 50%;
  background: color-mix(in srgb, var(--bg-base) 85%, transparent);
  color: var(--text-primary);
  transition: border-color 120ms ease, color 120ms ease, transform 120ms ease;
}

.poster__play svg {
  margin-left: 3px;
}

.poster:hover:not(:disabled) .poster__play {
  border-color: var(--accent);
  color: var(--accent);
  transform: translate(-50%, -50%) scale(1.05);
}

.poster__hint {
  position: absolute;
  top: calc(50% + 34px);
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
}

.poster:hover:not(:disabled) .poster__hint {
  color: var(--text-primary);
}

@media (prefers-reduced-motion: reduce) {
  .poster__play,
  .poster {
    transition: none;
  }

  .poster:hover:not(:disabled) .poster__play {
    transform: translate(-50%, -50%);
  }
}
</style>
