/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth 2.0 Web client ID used by the Curate tool. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** URL of the google-git-proxy Cloudflare Worker. */
  readonly VITE_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
