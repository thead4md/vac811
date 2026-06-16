/**
 * Thin wrapper around Google Identity Services (GSI) for the Curate tool.
 *
 * Usage:
 *   const credential = await signInWithGoogle(CLIENT_ID);
 *   // credential is a JWT ID token — pass it as Bearer to the proxy Worker.
 *
 * The GSI <script> is loaded lazily on first call so the 50 KB library never
 * touches non-admin visitors.
 */

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const SESSION_KEY = 'gsi_credential';

let _credential: string | null = sessionStorage.getItem(SESSION_KEY);

export function getCredential(): string | null {
  return _credential;
}

export function clearCredential(): void {
  _credential = null;
  sessionStorage.removeItem(SESSION_KEY);
}

function saveCredential(cred: string): void {
  _credential = cred;
  sessionStorage.setItem(SESSION_KEY, cred);
}

function loadGsiScript(): Promise<void> {
  if ((window as unknown as Record<string, unknown>).google) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services betöltése sikertelen.'));
    document.head.appendChild(script);
  });
}

interface GsiGoogle {
  accounts: {
    id: {
      initialize(cfg: {
        client_id: string;
        callback: (resp: { credential: string }) => void;
        auto_select?: boolean;
        hd?: string;
      }): void;
      prompt(cb?: (notification: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void): void;
      cancel(): void;
    };
  };
}

export async function signInWithGoogle(clientId: string): Promise<string> {
  await loadGsiScript();
  const google = (window as unknown as { google: GsiGoogle }).google;

  return new Promise((resolve, reject) => {
    google.accounts.id.initialize({
      client_id: clientId,
      hd: 'vac811.hu',
      callback: (response) => {
        if (!response.credential) {
          reject(new Error('Nem érkezett hitelesítési adat.'));
          return;
        }
        saveCredential(response.credential);
        resolve(response.credential);
      },
    });

    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One-tap was suppressed (browser policy, dismissed before, etc.).
        // Fall back to the explicit renderButton flow by rejecting with a
        // special marker the caller can detect.
        reject(new Error('ONE_TAP_SUPPRESSED'));
      }
    });
  });
}

export async function renderGoogleButton(
  clientId: string,
  container: HTMLElement,
): Promise<string> {
  await loadGsiScript();
  const google = (window as unknown as { google: GsiGoogle }).google;

  return new Promise((resolve, reject) => {
    google.accounts.id.initialize({
      client_id: clientId,
      hd: 'vac811.hu',
      callback: (response) => {
        if (!response.credential) {
          reject(new Error('Nem érkezett hitelesítési adat.'));
          return;
        }
        saveCredential(response.credential);
        resolve(response.credential);
      },
    });

    // @ts-expect-error — renderButton is real but not in @types/google yet
    google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      locale: 'hu',
    });
  });
}
