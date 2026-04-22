/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_MAIN_SITE_URL?: string
  readonly VITE_OAUTH_CALLBACK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
