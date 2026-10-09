<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ClanProfileForm from '@/components/domain/ClanProfileForm.vue'
import RulesButton from '@/components/domain/RulesButton.vue'
import { CLAN_RULES, CLAN_RULES_LEAD, CLAN_RULES_NOTE, emptyClanDraft, type ClanProfileDraft } from '@/utils/clans'

const auth = useAuthStore()
const router = useRouter()

const breadcrumbs: Crumb[] = [{ label: 'Clans', to: { name: 'clans' } }, { label: 'Create' }]

usePageMeta({
  title: 'Create a clan | AccSaber',
  description: 'Found a new AccSaber clan.',
})

const draft = ref<ClanProfileDraft>(emptyClanDraft())
const iconFile = ref<File | null>(null)
const iconPreview = ref<string | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const currentClan = computed(() => auth.userProfile?.clan ?? null)
const ready = computed(() => draft.value.name.trim().length >= 3 && draft.value.tag.length >= 2)

async function stageIcon(file: File | null) {
  if (iconPreview.value) URL.revokeObjectURL(iconPreview.value)
  iconFile.value = file
  iconPreview.value = file ? URL.createObjectURL(file) : null
}

onUnmounted(() => stageIcon(null))

async function submit() {
  if (!ready.value || saving.value) return
  saving.value = true
  error.value = null
  fieldErrors.value = {}
  try {
    const { createClan } = await import('@/api/clans')
    const created = await createClan({
      name: draft.value.name.trim(),
      tag: draft.value.tag,
      description: draft.value.description.trim() || undefined,
      tagColor: draft.value.tagColor || undefined,
      primaryColor: draft.value.primaryColor || undefined,
      secondaryColor: draft.value.secondaryColor || undefined,
    })
    if (iconFile.value) {
      const { uploadClanIcon } = await import('@/api/cdn')
      await uploadClanIcon(created.clan.id, iconFile.value).catch(() => null)
    }
    await auth.fetchAuthMe()
    await router.push({ name: 'clan-detail', params: { slugOrId: created.clan.slug } })
  } catch (err) {
    const parsed = parseApiError(err, 'Could not create the clan.')
    const errors: Record<string, string> = {}
    for (const fe of parsed.fieldErrors) errors[fe.field] = fe.message
    fieldErrors.value = errors
    if (parsed.fieldErrors.length === 0) error.value = parsed.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="clan-create">
    <Breadcrumbs :crumbs="breadcrumbs" />
    <header class="clan-create__header">
      <h1 class="clan-create__title">Create a clan</h1>
    </header>

    <EmptyState v-if="!auth.isLoggedIn" message="Sign in to create a clan." />

    <div v-else-if="currentClan" class="clan-create__blocked">
      <p>You are already in a clan.</p>
      <RouterLink :to="{ name: 'clan-detail', params: { slugOrId: currentClan.slug } }">
        Go to {{ currentClan.name }}
      </RouterLink>
    </div>

    <form v-else class="clan-create__form" @submit.prevent="submit">
      <ClanProfileForm
        v-model="draft"
        :field-errors="fieldErrors"
        :icon-url="iconPreview"
        :upload-icon="stageIcon"
        :remove-icon="() => stageIcon(null)"
        :disabled="saving"
      />
      <p v-if="error" class="clan-create__error" role="alert">{{ error }}</p>
      <div class="clan-create__footer">
        <span class="clan-create__rules">
          <RulesButton title="Clan rules" :lead="CLAN_RULES_LEAD" :rules="CLAN_RULES" :note="CLAN_RULES_NOTE" />
        </span>
        <BaseButton :disabled="saving" @click="router.push({ name: 'clans' })">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" :disabled="!ready" @click="submit">Create clan</BaseButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.clan-create {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

.clan-create__header {
  padding: var(--space-lg) 0 var(--space-md);
  text-align: center;
}

.clan-create__title {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
}

.clan-create__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.clan-create__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.clan-create__rules {
  margin-right: auto;
}

.clan-create__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.clan-create__blocked {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-secondary);
}

.clan-create__blocked p {
  margin: 0;
}

.clan-create__blocked a {
  font-weight: 600;
  color: var(--page-accent, var(--accent));
  text-decoration: none;
}
</style>
