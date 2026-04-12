<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import { rankingDashboardRoute } from '@/router'
import logoUrl from '@/assets/logo.png'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const identifier = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const showRequestAccess = ref(false)
const requestUsername = ref('')
const requestEmail = ref('')
const requestPassword = ref('')
const requestConfirmPassword = ref('')
const requestError = ref('')
const requestSuccess = ref(false)
const requestLoading = ref(false)

async function handleLogin() {
  if (!identifier.value || !password.value) return
  loading.value = true
  error.value = ''
  try {
    try {
      await auth.login(identifier.value, password.value, 'RANKING')
    } catch {
      await auth.login(identifier.value, password.value, 'RANKING_HEAD')
    }

    if (!auth.hasRole('RANKING')) {
      auth.clearStaffAuth()
      error.value = 'Access denied - this panel requires the RANKING role or higher.'
      return
    }

    const redirect = route.query.redirect as string | undefined
    const safe = redirect && !redirect.startsWith('/login') && !redirect.startsWith('/staff/ranking/login') ? redirect : undefined
    if (safe) {
      router.push(safe)
    } else {
      router.push({ name: rankingDashboardRoute })
    }
  } catch {
    error.value = 'Invalid credentials.'
  } finally {
    loading.value = false
  }
}

async function handleRequestAccess() {
  if (!requestUsername.value || !requestEmail.value || !requestPassword.value) return
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
      email: requestEmail.value,
      password: requestPassword.value,
      role: 'RANKING',
    })
    requestSuccess.value = true
  } catch {
    requestError.value = 'Failed to submit request. Try again later.'
  } finally {
    requestLoading.value = false
  }
}
</script>

<template>
  <div class="ranking-login">
    <div class="ranking-login__card">
      <div class="ranking-login__header">
        <div class="ranking-login__logo">
          <img :src="logoUrl" alt="AccSaber" class="ranking-login__logo-img" />
        </div>
        <div>
          <h1 class="ranking-login__title">AccSaber Ranking</h1>
          <p class="ranking-login__subtitle">Ranking team access</p>
        </div>
      </div>

      <form v-if="!showRequestAccess" class="ranking-login__form" @submit.prevent="handleLogin">
        <BaseInput
          v-model="identifier"
          label="Username"
          placeholder="Username or email"
          autocomplete="username"
          :disabled="loading"
        />
        <BaseInput
          v-model="password"
          label="Password"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
          :disabled="loading"
        />

        <div v-if="error" class="ranking-login__error" role="alert">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {{ error }}
        </div>

        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="loading"
          :disabled="!identifier || !password"
          style="width: 100%"
        >
          Sign In
        </BaseButton>

        <button type="button" class="ranking-login__link" @click="showRequestAccess = true">
          Request Access
        </button>
      </form>

      <div v-else class="ranking-login__form">
        <template v-if="!requestSuccess">
          <p class="ranking-login__request-info">
            Submit a request to join the ranking team. An administrator will review your application.
          </p>
          <form @submit.prevent="handleRequestAccess">
            <div class="ranking-login__form-fields">
              <BaseInput
                v-model="requestUsername"
                label="Username"
                placeholder="Your username"
                autocomplete="username"
                :disabled="requestLoading"
              />
              <BaseInput
                v-model="requestEmail"
                label="Email"
                type="email"
                placeholder="your@email.com"
                autocomplete="email"
                :disabled="requestLoading"
              />
              <BaseInput
                v-model="requestPassword"
                label="Password"
                type="password"
                placeholder="Password"
                autocomplete="new-password"
                :disabled="requestLoading"
              />
              <BaseInput
                v-model="requestConfirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Confirm password"
                autocomplete="new-password"
                :disabled="requestLoading"
              />
            </div>

            <div v-if="requestError" class="ranking-login__error" role="alert">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {{ requestError }}
            </div>

            <BaseButton
              type="submit"
              variant="primary"
              size="lg"
              :loading="requestLoading"
              :disabled="!requestUsername || !requestEmail || !requestPassword || !requestConfirmPassword"
              style="width: 100%; margin-top: var(--space-md)"
            >
              Submit Request
            </BaseButton>
          </form>

          <button type="button" class="ranking-login__link" @click="showRequestAccess = false">
            Back to Sign In
          </button>
        </template>

        <template v-else>
          <div class="ranking-login__success">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p class="ranking-login__success-text">
              Your request has been submitted. An administrator will review it shortly.
            </p>
            <button type="button" class="ranking-login__link" @click="showRequestAccess = false; requestSuccess = false">
              Back to Sign In
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ranking-login {
  min-height: 100vh;
  margin-top: calc(-1 * var(--navbar-height, 64px));
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  padding: var(--space-lg);
}

.ranking-login__card {
  width: 100%;
  max-width: 380px;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
  padding: var(--space-xl);
  box-shadow: 0 0 40px color-mix(in srgb, var(--accent) 6%, transparent);
}

.ranking-login__header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.ranking-login__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.ranking-login__logo-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.ranking-login__title {
  font-size: var(--text-section);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.2;
}

.ranking-login__subtitle {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 2px 0 0;
}

.ranking-login__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.ranking-login__form-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.ranking-login__error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 25%, transparent);
  border-radius: var(--radius-btn);
  color: var(--error);
  font-size: var(--text-caption);
}

.ranking-login__link {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  cursor: pointer;
  padding: 0;
  text-align: center;
  transition: color 120ms ease;
}

.ranking-login__link:hover {
  color: var(--accent);
}

.ranking-login__request-info {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0 0 var(--space-sm);
  line-height: 1.5;
}

.ranking-login__success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  text-align: center;
  padding: var(--space-lg) 0;
}

.ranking-login__success-text {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
</style>
