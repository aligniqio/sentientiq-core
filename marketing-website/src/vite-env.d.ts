/// <reference types="vite/client" />
/// <reference types="vite/client" />

// (optional) declare the vars you actually use
interface ImportMetaEnv {
  readonly VITE_STRIPE_PRICE_ID: string
  readonly VITE_SITE_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
