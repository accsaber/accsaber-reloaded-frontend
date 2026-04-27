<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MapCardCompact from '@/components/domain/MapCardCompact.vue'
import MilestoneCard from '@/components/domain/MilestoneCard.vue'
import { useCategoryStore } from '@/stores/categories'
import type { PublicBatchResponse } from '@/types/api/batches'
import type { CampaignDetailResponse } from '@/types/api/campaigns'
import type { CurveResponse } from '@/types/api/categories'
import type { MilestoneResponse, MilestoneSetResponse } from '@/types/api/milestones'
import type { PublicNewsResponse } from '@/types/api/news'
import type { MilestoneDisplay } from '@/types/display'
import { groupBatchByCategory } from '@/utils/batches'
import { formatRelativeDate } from '@/utils/formatters'
import { formatDifficulty } from '@/utils/mappers'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

type Resource =
  | { kind: 'batch'; data: PublicBatchResponse }
  | { kind: 'campaign'; data: CampaignDetailResponse }
  | { kind: 'milestoneSet'; data: { set: MilestoneSetResponse; milestones: MilestoneResponse[] } }
  | { kind: 'curve'; data: CurveResponse }

const props = defineProps<{
  news: PublicNewsResponse
}>()

const router = useRouter()
const categoryStore = useCategoryStore()

const resource = ref<Resource | null>(null)
const loading = ref(false)
const error = ref('')

const linkedKind = computed<Resource['kind'] | null>(() => {
  if (props.news.batchId) return 'batch'
  if (props.news.campaignId) return 'campaign'
  if (props.news.milestoneSetId) return 'milestoneSet'
  if (props.news.curveId) return 'curve'
  return null
})

const batchGroups = computed(() => {
  if (resource.value?.kind !== 'batch') return []
  return groupBatchByCategory(
    resource.value.data,
    (id) => categoryStore.getCategoryCode(id),
    (code) => categoryStore.getAccent(code),
    (code) => categoryStore.getCategoryInfo(code)?.name ?? code,
  )
})

const milestoneDisplays = computed<MilestoneDisplay[]>(() => {
  if (resource.value?.kind !== 'milestoneSet') return []
  return resource.value.data.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    type: m.type,
    tier: m.tier,
    xp: m.xp,
    targetValue: m.targetValue,
    completionPercent: m.completionPercentage,
    categoryCode: m.categoryId ? categoryStore.getCategoryCode(m.categoryId) : undefined,
  }))
})

async function loadBatch(id: string) {
  const { getBatch } = await import('@/api/batches')
  resource.value = { kind: 'batch', data: await getBatch(id) }
}

async function loadCampaign(id: string) {
  const { getCampaign } = await import('@/api/campaigns')
  resource.value = { kind: 'campaign', data: await getCampaign(id) }
}

async function loadMilestoneSet(id: string) {
  const { getMilestoneSets, getMilestonesBySet } = await import('@/api/milestones')
  const [setsRes, milestones] = await Promise.all([
    getMilestoneSets({ size: 200 }),
    getMilestonesBySet(id),
  ])
  const set = setsRes.content.find((s) => s.id === id)
  if (!set) throw new Error('Set not found')
  resource.value = { kind: 'milestoneSet', data: { set, milestones } }
}

async function loadCurve(id: string) {
  const { getCurve } = await import('@/api/curves')
  resource.value = { kind: 'curve', data: await getCurve(id) }
}

async function load() {
  resource.value = null
  error.value = ''
  const kind = linkedKind.value
  if (!kind) return
  loading.value = true
  try {
    if (kind === 'batch') await loadBatch(props.news.batchId!)
    else if (kind === 'campaign') await loadCampaign(props.news.campaignId!)
    else if (kind === 'milestoneSet') await loadMilestoneSet(props.news.milestoneSetId!)
    else if (kind === 'curve') await loadCurve(props.news.curveId!)
  } catch {
    error.value = 'Failed to load related resource.'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.news.batchId, props.news.campaignId, props.news.milestoneSetId, props.news.curveId],
  () => load(),
  { immediate: true },
)

function navigateToMap(mapId: string, difficultyId?: string) {
  router.push({ name: 'map-detail', params: { mapId }, query: difficultyId ? { difficultyId } : undefined })
}

const sectionTitle = computed(() => {
  switch (linkedKind.value) {
    case 'batch': return 'Batch'
    case 'campaign': return 'Campaign'
    case 'milestoneSet': return 'Milestone set'
    case 'curve': return 'Curve'
    default: return ''
  }
})
</script>

<template>
  <section v-if="linkedKind" class="linked-resource">
    <h2 class="linked-resource__title">{{ sectionTitle }}</h2>

    <div v-if="loading" class="linked-resource__loading">
      <SkeletonLoader variant="card" style="height: 60px" />
      <SkeletonLoader variant="card" style="height: 60px" />
    </div>

    <p v-else-if="error" class="linked-resource__error">{{ error }}</p>

    <template v-else-if="resource?.kind === 'batch'">
      <header class="linked-resource__header">
        <div>
          <h3 class="linked-resource__name">{{ resource.data.name }}</h3>
          <p v-if="resource.data.description" class="linked-resource__desc">{{ resource.data.description }}</p>
        </div>
        <div class="linked-resource__meta">
          <span>{{ resource.data.difficulties.length }} difficulties</span>
          <span v-if="resource.data.releasedAt"> · {{ formatRelativeDate(resource.data.releasedAt) }}</span>
        </div>
      </header>

      <div v-for="group in batchGroups" :key="group.categoryCode" class="batch-category">
        <div class="batch-category__header">
          <span class="batch-category__dot" :style="{ background: group.accent }" />
          <span class="batch-category__name">{{ group.name }}</span>
        </div>
        <div class="batch-category__cards">
          <MapCardCompact
            v-for="m in group.diffs"
            :key="m.difficultyId"
            :map="m"
            @click="navigateToMap(m.id, m.difficultyId)"
          />
        </div>
      </div>
    </template>

    <template v-else-if="resource?.kind === 'campaign'">
      <header class="linked-resource__header">
        <div>
          <h3 class="linked-resource__name">{{ resource.data.name }}</h3>
          <p v-if="resource.data.description" class="linked-resource__desc">{{ resource.data.description }}</p>
        </div>
        <div class="linked-resource__meta">
          <span>{{ resource.data.mapCount }} maps · {{ resource.data.difficulty }}</span>
          <span v-if="resource.data.verified"> · Verified</span>
        </div>
      </header>

      <div class="campaign-rows">
        <router-link
          v-for="m in resource.data.maps"
          :key="m.id"
          :to="`/campaigns/${resource.data.id}`"
          class="campaign-row"
        >
          <img :src="m.coverUrl" class="campaign-row__cover" :alt="m.songName" loading="lazy" />
          <div class="campaign-row__info">
            <span class="campaign-row__song">{{ m.songName }}</span>
            <span class="campaign-row__sub">{{ m.songAuthor }} · {{ m.mapAuthor }}</span>
          </div>
          <span class="campaign-row__diff">{{ formatDifficulty(m.difficulty) }}</span>
          <span class="campaign-row__req">{{ (m.accuracyRequirement * 100).toFixed(1) }}%</span>
          <span class="campaign-row__xp">+{{ m.xp }} XP</span>
        </router-link>
      </div>
    </template>

    <template v-else-if="resource?.kind === 'milestoneSet'">
      <header class="linked-resource__header">
        <div>
          <h3 class="linked-resource__name">{{ resource.data.set.title }}</h3>
          <p v-if="resource.data.set.description" class="linked-resource__desc">{{ resource.data.set.description }}</p>
        </div>
        <div class="linked-resource__meta">
          <span>{{ resource.data.milestones.length }} milestones</span>
          <span v-if="resource.data.set.setBonusXp"> · +{{ resource.data.set.setBonusXp }} XP bonus</span>
        </div>
      </header>

      <div class="milestone-grid">
        <MilestoneCard v-for="m in milestoneDisplays" :key="m.id" :milestone="m" />
      </div>
    </template>

    <template v-else-if="resource?.kind === 'curve'">
      <header class="linked-resource__header">
        <div>
          <h3 class="linked-resource__name">{{ resource.data.name }}</h3>
          <p class="linked-resource__desc">{{ resource.data.type === 'FORMULA' ? 'Formula curve' : 'Point lookup curve' }}</p>
        </div>
      </header>

      <div class="curve-info">
        <div v-if="resource.data.formula" class="curve-info__row">
          <span class="curve-info__label">Formula</span>
          <code class="curve-info__value">{{ resource.data.formula }}</code>
        </div>
        <div v-if="resource.data.scale != null" class="curve-info__row">
          <span class="curve-info__label">Scale</span>
          <span class="curve-info__value">{{ resource.data.scale }}</span>
        </div>
        <div v-if="resource.data.shift != null" class="curve-info__row">
          <span class="curve-info__label">Shift</span>
          <span class="curve-info__value">{{ resource.data.shift }}</span>
        </div>
        <div v-if="resource.data.points?.length" class="curve-info__row">
          <span class="curve-info__label">Points</span>
          <span class="curve-info__value">{{ resource.data.points.length }} samples</span>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.linked-resource {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--bg-overlay);
}

.linked-resource__title {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0;
}

.linked-resource__loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.linked-resource__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.linked-resource__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.linked-resource__name {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.linked-resource__desc {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
}

.linked-resource__meta {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.batch-category {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.batch-category__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.batch-category__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.batch-category__name {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.batch-category__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-sm);
}

.campaign-rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.campaign-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  text-decoration: none;
  color: inherit;
  transition: border-color 120ms ease, background 120ms ease;
}

.campaign-row:hover {
  border-color: var(--text-tertiary);
  background: var(--bg-elevated);
}

.campaign-row__cover {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-btn);
  object-fit: cover;
  flex-shrink: 0;
}

.campaign-row__info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.campaign-row__song {
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.campaign-row__sub {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.campaign-row__diff,
.campaign-row__req {
  font-size: var(--text-caption);
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.campaign-row__xp {
  font-size: var(--text-caption);
  font-family: var(--font-mono);
  color: var(--accent);
  font-weight: 600;
}

.milestone-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}

.curve-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.curve-info__row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.curve-info__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 80px;
}

.curve-info__value {
  font-family: var(--font-mono);
  color: var(--text-primary);
  font-size: var(--text-caption);
}
</style>
