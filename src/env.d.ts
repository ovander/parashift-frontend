/// <reference types="vite/client" />

declare const __APP_VERSION__:    string
declare const __APP_COMMIT__:     string
declare const __APP_BUILD_TIME__: string

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL:       string
  readonly VITE_AUTH_CLIENT_ID:     string
  readonly VITE_AUTH_BASE_URL:      string
  readonly VITE_AUTH_REDIRECT_URI:  string
  readonly VITE_DEFAULT_LOCALE:     string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
