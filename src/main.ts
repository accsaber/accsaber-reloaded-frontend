import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

import '@/assets/styles/global.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')

import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useLevelStore } from '@/stores/levels'
import { useModifierStore } from '@/stores/modifiers'

const categoryStore = useCategoryStore(pinia)
const modifierStore = useModifierStore(pinia)
const levelStore = useLevelStore(pinia)
const authStore = useAuthStore(pinia)

Promise.all([
    categoryStore.fetchCategories(),
    modifierStore.fetchModifiers(),
    levelStore.fetchThresholds(),
    authStore.isLoggedIn ? authStore.fetchProfile() : Promise.resolve(),
])
