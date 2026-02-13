/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BOF_POLL_MS: string;
  readonly VITE_BOF_SECTIONS_URL: string;
  readonly VITE_BOF_LOGS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
