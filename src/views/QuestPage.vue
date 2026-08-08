<script setup lang="ts">
import { getApiErrorMessage, parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import PseudoLoginModal from '@/components/domain/PseudoLoginModal.vue'
import PageSection from '@/components/layout/PageSection.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import type { QuestReleaseResponse } from '@/types/api/quest'
import type { UserRefDisplay } from '@/types/display'
import { saveBlob } from '@/utils/download'
import { computed, onMounted, ref } from 'vue'
import QuestInstallStep from './quest/QuestInstallStep.vue'
import QuestReleasesStep from './quest/QuestReleasesStep.vue'
import QuestSignInStep from './quest/QuestSignInStep.vue'
import QuestStepper from './quest/QuestStepper.vue'

const STEPS = ['Sign in', 'Generate', 'Install']
const STEP_TITLES = ['Sign in', 'Generate your download', 'Install on your headset']

const GENERATE_ERRORS: Record<number, string> = {
  401: 'Your session expired. Sign in again to generate a download.',
  404: 'That release is no longer available. Reload the page and try again.',
  429: "You've generated 5 downloads in the last hour. Try again in an hour.",
}

usePageMeta({
  title: 'AccSaber on Quest | AccSaber',
  description: 'Generate a personalized AccSaber mod for your Quest headset.',
})

const authStore = useAuthStore()

const step = ref(0)
const loginOpen = ref(false)
const releases = ref<QuestReleaseResponse[]>([])
const loading = ref(true)
const listError = ref<string | null>(null)
const generatingTag = ref<string | null>(null)
const feedback = ref<{ variant: 'error' | 'success'; text: string } | null>(null)

const signedIn = computed(() => authStore.isLoggedIn)
const unlocked = computed(() => (signedIn.value ? STEPS.length - 1 : 0))

const user = computed<UserRefDisplay | null>(() => {
  const me = authStore.authMe
  if (!me) return null
  return {
    id: me.userId,
    name: me.name,
    avatarUrl: me.avatarUrl,
    cdnAvatarUrl: me.cdnAvatarUrl,
    country: me.country,
  }
})

async function loadReleases() {
  loading.value = true
  listError.value = null
  try {
    const { getQuestReleases } = await import('@/api/quest')
    releases.value = await getQuestReleases()
  } catch (err) {
    listError.value = getApiErrorMessage(err, "Couldn't load releases - try again in a moment.")
  } finally {
    loading.value = false
  }
}

async function generate(tag: string) {
  if (generatingTag.value) return
  generatingTag.value = tag
  feedback.value = null
  try {
    const { downloadQuestMod } = await import('@/api/quest')
    const { blob, filename } = await downloadQuestMod(tag)
    const name = filename ?? `AccSaber-Lite_${tag}.qmod`
    saveBlob(blob, name)
    feedback.value = { variant: 'success', text: `${name} saved. Keep it to yourself.` }
  } catch (err) {
    const parsed = parseApiError(err, 'Download failed - try again.')
    feedback.value = { variant: 'error', text: GENERATE_ERRORS[parsed.status] ?? parsed.message }
  } finally {
    generatingTag.value = null
  }
}

function goTo(next: number) {
  step.value = Math.min(Math.max(next, 0), unlocked.value)
}

onMounted(loadReleases)
</script>

<template>
  <div class="quest" :style="{ '--page-accent': 'var(--accent-overall)' }">
    <PageHeaderBleed title="AccSaber on Quest"
      subtitle="Three steps to a headset that uploads your scores" />

    <QuestStepper :steps="STEPS" :current="step" :unlocked="unlocked" @select="goTo" />

    <PageSection :title="STEP_TITLES[step]">
      <QuestSignInStep v-if="step === 0" :user="user" @sign-in="loginOpen = true" />

      <QuestReleasesStep v-else-if="step === 1" :releases="releases" :loading="loading"
        :list-error="listError" :feedback="feedback" :signed-in="signedIn"
        :generating-tag="generatingTag" @generate="generate" @sign-in="loginOpen = true" />

      <QuestInstallStep v-else />
    </PageSection>

    <nav class="quest__nav">
      <BaseButton :disabled="step === 0" @click="goTo(step - 1)">Previous</BaseButton>
      <BaseButton variant="primary" :disabled="step >= unlocked" @click="goTo(step + 1)">
        Next
      </BaseButton>
    </nav>

    <PseudoLoginModal :open="loginOpen" @close="loginOpen = false" />
  </div>
</template>

<style scoped>
.quest {
  max-width: 880px;
  margin: 0 auto;
  padding: 0 var(--space-lg) var(--space-2xl);
}

.quest__nav {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--bg-overlay);
}

@media (max-width: 767px) {
  .quest {
    padding: 0 var(--space-md) var(--space-xl);
  }
}
</style>
