<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { rankingDashboardRoute } from '@/router'
import { useAuthStore } from '@/stores/auth'
import type { StaffRole } from '@/types/enums'
import StaffLoginCard from '@/views/staff/StaffLoginCard.vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

usePageMeta({
  title: 'Login | AccSaber Ranking',
  description: 'Sign-in for AccSaber ranking staff.',
})

const auth = useAuthStore()
const route = useRoute()

const PASSWORD_ROLES: StaffRole[] = ['RANKING', 'RANKING_HEAD']

const requesting = ref(route.query.requestAccess === '1')

const requestUsername = ref('')
const requestEmail = ref('')
const requestPassword = ref('')
const requestConfirmPassword = ref('')
const requestError = ref('')
const requestSuccess = ref(false)
const requestLoading = ref(false)

const staffStatus = computed(() => auth.authMe?.staff?.status ?? null)

function backToSignIn() {
  requesting.value = false
  requestSuccess.value = false
}

async function handleRequestAccess() {
  if (!requestUsername.value || !requestPassword.value) return
  if (requestPassword.value !== requestConfirmPassword.value) {
    requestError.value = 'Passwords do not match.'
    return
  }
  requestLoading.value = true
  requestError.value = ''
  try {
    const { requestAccess } = await import('@/api/staff-auth')
    await requestAccess({
      username: requestUsername.value,
      email: requestEmail.value || undefined,
      password: requestPassword.value,
      role: 'RANKING',
    })
    requestSuccess.value = true
  } catch (e) {
    const { status } = parseApiError(e)
    if (status === 401) {
      requestError.value = 'Please log in first so we can link your request to your player.'
    } else if (status === 409) {
      requestError.value = 'You already have a staff record. Contact an administrator.'
    } else {
      requestError.value = 'Failed to submit request. Try again later.'
    }
  } finally {
    requestLoading.value = false
  }
}
</script>

<template>
  <StaffLoginCard
    title="AccSaber Ranking"
    subtitle="Ranking team access"
    intro="Log in with the account you already use on AccSaber. Your ranking team role is attached automatically if your player is on the roster."
    :granted="auth.isStaffAuthorized"
    :dashboard-route="rankingDashboardRoute"
    :password-roles="PASSWORD_ROLES"
  >
    <template #footer>
      <button class="staff-login__link" @click="requesting = true">Request Access</button>
    </template>

    <template v-if="requesting" #body>
      <template v-if="!requestSuccess">
        <p class="ranking-request__info">
          Submit a request to join the ranking team. An administrator will review your application.
        </p>

        <div v-if="!auth.isLoggedIn" class="ranking-request__notice">
          You must log in with your AccSaber account first so we can link the request to your player.
          <div class="ranking-request__notice-actions">
            <button type="button" class="staff-login__secondary" @click="requesting = false">
              Log in first
            </button>
          </div>
        </div>

        <form v-else @submit.prevent="handleRequestAccess">
          <div class="ranking-request__fields">
            <BaseInput v-model="requestUsername" label="Username" placeholder="Your username"
              autocomplete="username" :disabled="requestLoading" />
            <div class="ranking-request__field">
              <BaseInput v-model="requestEmail" label="Email (optional)" type="email"
                placeholder="your@email.com" autocomplete="email" :disabled="requestLoading" />
              <span class="ranking-request__field-hint">
                Optional - only used if an admin needs to reach you about your request.
              </span>
            </div>
            <BaseInput v-model="requestPassword" label="Password" type="password" placeholder="Password"
              autocomplete="new-password" :disabled="requestLoading" />
            <BaseInput v-model="requestConfirmPassword" label="Confirm Password" type="password"
              placeholder="Confirm password" autocomplete="new-password" :disabled="requestLoading" />
          </div>

          <div v-if="requestError" class="staff-login__error" role="alert">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {{ requestError }}
          </div>

          <BaseButton type="submit" variant="primary" size="lg" :loading="requestLoading"
            :disabled="!requestUsername || !requestPassword || !requestConfirmPassword"
            style="width: 100%; margin-top: var(--space-md)">
            Submit Request
          </BaseButton>
        </form>

        <p v-if="staffStatus === 'REQUESTED'" class="ranking-request__note">
          A request is already on file for your account - check back once it has been approved.
        </p>

        <button type="button" class="staff-login__link" @click="backToSignIn">
          Back to Sign In
        </button>
      </template>

      <div v-else class="ranking-request__success">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p class="ranking-request__success-text">
          Your request has been submitted. An administrator will review it shortly.
        </p>
        <button type="button" class="staff-login__link" @click="backToSignIn">
          Back to Sign In
        </button>
      </div>
    </template>
  </StaffLoginCard>
</template>

<style scoped>
.ranking-request__info {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.55;
}

.ranking-request__notice {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  line-height: 1.55;
}

.ranking-request__notice-actions {
  display: flex;
  gap: var(--space-sm);
}

.ranking-request__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.ranking-request__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.ranking-request__field-hint {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  line-height: 1.4;
}

.ranking-request__note {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 0;
  text-align: center;
}

.ranking-request__success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  text-align: center;
  padding: var(--space-lg) 0;
}

.ranking-request__success-text {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
</style>
