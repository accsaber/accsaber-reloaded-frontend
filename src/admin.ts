import { createPinia } from 'pinia'
import { createApp } from 'vue'

import AdminApp from './AdminApp.vue'
import adminRouter from './router/admin'

import '@/assets/styles/global.css'

const app = createApp(AdminApp)

const pinia = createPinia()
app.use(pinia)
app.use(adminRouter)

app.mount('#app')

import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'

const categoryStore = useCategoryStore(pinia)
const modifierStore = useModifierStore(pinia)

Promise.all([categoryStore.fetchCategories(), modifierStore.fetchModifiers()])
