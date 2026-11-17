<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import NewsResourceSelector, { type ResourceKind } from '@/components/domain/NewsResourceSelector.vue'
import type { CreateNewsRequest, NewsResponse } from '@/types/api/news'
import type { Tab } from '@/types/display'
import type { NewsStatus, NewsType } from '@/types/enums'
import { NEWS_STATUS_LABELS, STANDALONE_NEWS_TYPES } from '@/utils/constants'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  editing: NewsResponse | null
  allowed: ResourceKind[]
  allowedStandalone?: NewsType[]
  loading?: boolean
  error?: string
  uploadImage?: (id: string, file: File) => Promise<NewsResponse>
  deleteImage?: (id: string) => Promise<NewsResponse>
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: CreateNewsRequest]
  imageChanged: [news: NewsResponse]
}>()

const STATUS_TABS: Tab[] = (Object.keys(NEWS_STATUS_LABELS) as NewsStatus[]).map((key) => ({
  key,
  label: NEWS_STATUS_LABELS[key],
}))

const title = ref('')
const slug = ref('')
const description = ref('')
const content = ref('')
const imageUrl = ref('')
const status = ref<NewsStatus>('DRAFT')
const pinned = ref(false)
const resourceType = ref<NewsType>('GENERAL')
const resourceId = ref<string | null>(null)
const formError = ref('')

function reset() {
  const n = props.editing
  title.value = n?.title ?? ''
  slug.value = n?.slug ?? ''
  description.value = n?.description ?? ''
  content.value = n?.content ?? ''
  imageUrl.value = n?.imageUrl ?? ''
  status.value = n?.status ?? 'DRAFT'
  pinned.value = n?.pinned ?? false
  resourceType.value = n?.type ?? 'GENERAL'
  resourceId.value = n?.batchId ?? n?.campaignId ?? n?.milestoneSetId ?? n?.curveId ?? null
  formError.value = ''
}

watch(() => [props.open, props.editing], ([open]) => { if (open) reset() }, { immediate: true })

function validate(): string {
  if (!title.value.trim()) return 'A title is needed'
  if (!content.value.trim()) return 'The content is empty'
  if (!STANDALONE_NEWS_TYPES.includes(resourceType.value) && !resourceId.value) {
    return 'Pick what this article is about, or a type that stands alone'
  }
  return ''
}

function submit() {
  formError.value = validate()
  if (formError.value) return
  const linked = (type: NewsType) => (resourceType.value === type ? resourceId.value : null)
  emit('submit', {
    title: title.value.trim(),
    slug: slug.value.trim() || undefined,
    description: description.value.trim() || undefined,
    content: content.value,
    imageUrl: imageUrl.value.trim() || undefined,
    status: status.value,
    pinned: pinned.value,
    type: resourceType.value,
    batchId: linked('BATCH'),
    campaignId: linked('CAMPAIGN'),
    milestoneSetId: linked('MILESTONE_SET'),
    curveId: linked('CURVE'),
  })
}

const canUploadImage = computed(() => props.editing !== null && !!props.uploadImage)

async function handleImageUpload(file: File) {
  if (!props.editing || !props.uploadImage) return
  const updated = await props.uploadImage(props.editing.id, file)
  imageUrl.value = updated.imageUrl ?? ''
  emit('imageChanged', updated)
}

async function handleImageRemove() {
  if (!props.editing || !props.deleteImage) return
  const updated = await props.deleteImage(props.editing.id)
  imageUrl.value = updated.imageUrl ?? ''
  emit('imageChanged', updated)
}
</script>

<template>
  <BaseModal :open="open" :title="editing ? 'Edit Article' : 'New Article'" max-width="640px" @close="emit('close')">
    <form class="news-form" @submit.prevent="submit">
      <BaseInput v-model="title" label="Title" />
      <BaseInput v-model="slug" label="Slug" placeholder="Made from the title when blank" />
      <BaseInput v-model="description" label="Description" />
      <BaseTextarea v-model="content" label="Content (Markdown)" :rows="10" />
      <BaseInput v-model="imageUrl" label="Image URL" placeholder="https://" />

      <ImageUploader
        v-if="canUploadImage"
        label="Cover Image"
        :image-url="imageUrl || null"
        :upload-handler="handleImageUpload"
        :remove-handler="deleteImage ? handleImageRemove : undefined"
      />

      <div class="news-form__row">
        <div class="news-form__field">
          <span class="field-label">Status</span>
          <BaseTabs v-model="status" variant="segmented" label="Status" :tabs="STATUS_TABS" />
        </div>
        <BaseSwitch v-model="pinned" label="Pinned" />
      </div>

      <NewsResourceSelector
        v-model:resource-type="resourceType"
        v-model:resource-id="resourceId"
        :allowed="allowed"
        :allowed-standalone="allowedStandalone"
      />

      <p class="caption news-form__error" role="alert">{{ formError || error }}</p>
    </form>

    <template #footer>
      <BaseButton @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="loading" @click="submit">{{ editing ? 'Save' : 'Create' }}</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.news-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.news-form__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-md) var(--space-lg);
}

.news-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.news-form__row :deep(.base-switch) {
  height: var(--control-h);
}

.news-form__error {
  min-height: 1lh;
  color: var(--error);
}
</style>
