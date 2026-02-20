/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DADATA_KEY?: string;
  readonly VITE_DADATA_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
