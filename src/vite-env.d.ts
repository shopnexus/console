/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/react" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** '1' serves the AI paths from fixtures until the server has them. */
  readonly VITE_MOCK_AI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
