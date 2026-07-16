interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

declare module '*.css';

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
