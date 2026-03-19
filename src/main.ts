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
import { useModifierStore } from '@/stores/modifiers'

const categoryStore = useCategoryStore(pinia)
const modifierStore = useModifierStore(pinia)
const authStore = useAuthStore(pinia)

Promise.all([
    categoryStore.fetchCategories(),
    modifierStore.fetchModifiers(),
    authStore.isLoggedIn ? authStore.fetchProfile() : Promise.resolve(),
])
