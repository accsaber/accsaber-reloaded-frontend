import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

import '@/assets/styles/global.css'

import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useLevelStore } from '@/stores/levels'
import { useModifierStore } from '@/stores/modifiers'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

const categoryStore = useCategoryStore(pinia)
const modifierStore = useModifierStore(pinia)
const levelStore = useLevelStore(pinia)
const authStore = useAuthStore(pinia)

void Promise.all([
    categoryStore.fetchCategories(),
    modifierStore.fetchModifiers(),
    levelStore.fetchThresholds(),
])

await authStore.bootstrap()

app.use(router)
app.mount('#app')
