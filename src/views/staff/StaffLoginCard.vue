<script setup lang="ts">
import logoUrl from '@/assets/logo.png'
import { buildOAuthStartUrl } from '@/api/auth'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import ProviderButton from '@/components/domain/ProviderButton.vue'
import { useAuthStore } from '@/stores/auth'
import type { OAuthProvider } from '@/types/api/player-auth'
import type { StaffRole } from '@/types/enums'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type Mode = 'providers' | 'password'

const props = defineProps<{
  title: string
  subtitle: string
  intro: string
  deniedNote?: string
  granted: boolean
  dashboardRoute: string
  passwordRoles?: StaffRole[]
}>()

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const mode = ref<Mode>('providers')

const identifier = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const hasPasswordFallback = computed(() => (props.passwordRoles?.length ?? 0) > 0)

function safeRedirect(): string | null {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.includes('login')
    ? redirect
    : null
}

function redirectAfterLogin() {
  router.replace(safeRedirect() ?? { name: props.dashboardRoute })
}

onMounted(async () => {
  if (auth.accessToken && !auth.authMe) {
    await auth.fetchAuthMe()
  }
  if (props.granted) redirectAfterLogin()
})

watch(
  () => props.granted,
  (allowed) => {
    if (allowed) redirectAfterLogin()
  },
)

function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`
}

function startProvider(provider: OAuthProvider) {
  error.value = ''
  const safe = safeRedirect()
  if (safe) sessionStorage.setItem('authRedirectTo', safe)
  window.location.href = buildOAuthStartUrl(provider, callbackUrl())
}

async function handleLogin() {
  const roles = props.passwordRoles ?? []
  if (!identifier.value || !password.value || roles.length === 0) return
  loading.value = true
  error.value = ''
  try {
    let lastError: unknown = null
    for (const role of roles) {
      try {
        await auth.login(identifier.value, password.value, role)
        lastError = null
        break
      } catch (err) {
        lastError = err
      }
    }
    if (lastError) throw lastError

    if (!props.granted) {
      auth.clearStaffAuth()
      error.value = `Access denied - this area requires the ${roles.join(' or ')} role.`
      return
    }

    redirectAfterLogin()
  } catch {
    error.value = 'Invalid credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="staff-login">
    <div class="staff-login__card">
      <header class="staff-login__header">
        <div class="staff-login__logo">
          <img :src="logoUrl" alt="AccSaber" class="staff-login__logo-img" fetchpriority="high" decoding="async" />
        </div>
        <div>
          <h1 class="staff-login__title">{{ title }}</h1>
          <p class="staff-login__subtitle">{{ subtitle }}</p>
        </div>
      </header>

      <div v-if="$slots.body" class="staff-login__form">
        <slot name="body" />
      </div>

      <template v-else-if="mode === 'providers'">
        <p class="staff-login__intro">{{ intro }}</p>

        <ProviderButton provider="discord" variant="primary" @click="startProvider('discord')">
          Continue with Discord
        </ProviderButton>

        <div class="provider-row">
          <ProviderButton provider="beatleader" @click="startProvider('beatleader')">BeatLeader</ProviderButton>
          <ProviderButton provider="steam" @click="startProvider('steam')">Steam</ProviderButton>
        </div>

        <p v-if="deniedNote && auth.isLoggedIn && !granted" class="caption">{{ deniedNote }}</p>

        <template v-if="hasPasswordFallback">
          <div class="staff-login__divider"><span>or</span></div>

          <button class="staff-login__secondary" @click="mode = 'password'">
            Sign in with username &amp; password
          </button>
        </template>

        <slot name="footer" />
      </template>

      <form v-else class="staff-login__form" @submit.prevent="handleLogin">
        <BaseInput v-model="identifier" label="Username" placeholder="Username or email"
          autocomplete="username" :disabled="loading" />
        <BaseInput v-model="password" label="Password" type="password" placeholder="Password"
          autocomplete="current-password" :disabled="loading" />

        <div v-if="error" class="staff-login__error" role="alert">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {{ error }}
        </div>

        <BaseButton type="submit" variant="primary" size="lg" :loading="loading"
          :disabled="!identifier || !password" style="width: 100%">
          Sign In
        </BaseButton>

        <button type="button" class="staff-login__link" @click="mode = 'providers'">
          Back to OAuth
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.staff-login {
  min-height: 100vh;
  margin-top: calc(-1 * var(--navbar-height, 64px));
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  padding: var(--space-lg);
}

.staff-login__card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.staff-login__header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}

.staff-login__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.staff-login__logo-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.staff-login__title {
  font-size: var(--text-section);
  line-height: 1.2;
}

.staff-login__subtitle {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 2px 0 0;
}

.staff-login__intro {
  color: var(--text-secondary);
  font-size: var(--text-body);
  line-height: 1.55;
  margin: 0;
}

.provider-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.staff-login__divider {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin: var(--space-xs) 0;
}

.staff-login__divider::before,
.staff-login__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--bg-overlay);
}

.staff-login__secondary,
:slotted(.staff-login__secondary) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 var(--space-md);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}

.staff-login__secondary:hover,
:slotted(.staff-login__secondary:hover) {
  border-color: var(--text-tertiary);
  background: var(--bg-elevated);
}

.staff-login__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.staff-login__error,
:slotted(.staff-login__error) {
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


.staff-login__link,
:slotted(.staff-login__link) {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  cursor: pointer;
  padding: 0;
  text-align: center;
  transition: color 120ms ease;
}

.staff-login__link:hover,
:slotted(.staff-login__link:hover) {
  color: var(--accent);
}
</style>
