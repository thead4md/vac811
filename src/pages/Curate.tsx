import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getToken, login as ghLogin, logout as ghLogout } from '../lib/githubAuth';
import {
  getCredential,
  clearCredential,
  signInWithGoogle,
  renderGoogleButton,
} from '../lib/googleAuth';
import {
  fetchGallery,
  commitDecisions,
  fetchGalleryViaProxy,
  commitDecisionsViaProxy,
  cdnUrl,
} from '../lib/galleryRepo';
import type { GalleryItem } from './Gallery';
import type { Decision } from '../lib/galleryRepo';
import './Curate.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const PROXY_URL = import.meta.env.VITE_PROXY_URL ?? '';

// Auth mode: 'google' when proxy is configured, 'github' as dev fallback.
type AuthMode = 'google' | 'github';
function detectMode(): AuthMode {
  return GOOGLE_CLIENT_ID && PROXY_URL ? 'google' : 'github';
}

// Unified "token" type passed down to fetch/commit helpers.
interface Auth {
  mode: AuthMode;
  value: string; // Google ID token OR GitHub PAT
}

function effectiveStatus(item: GalleryItem, decisions: Map<string, Decision>): string {
  const d = decisions.get(item.id);
  if (d) return d.status;
  if (item.status) return item.status;
  return item.approved ? 'approved' : 'pending';
}

function initialAuth(): Auth | null {
  const mode = detectMode();
  if (mode === 'google') {
    const cred = getCredential();
    return cred ? { mode: 'google', value: cred } : null;
  }
  const tok = getToken();
  return tok ? { mode: 'github', value: tok } : null;
}

export default function Curate() {
  const [auth, setAuth] = useState<Auth | null>(initialAuth);
  const [allItems, setAllItems] = useState<GalleryItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [decisions, setDecisions] = useState<Map<string, Decision>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'rejected'>('pending');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const captionEscaped = useRef(false);

  // ── Load gallery after login ──────────────────────────────────────────────
  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setLoadError(null);
    });
    const load =
      auth.mode === 'google'
        ? fetchGalleryViaProxy(PROXY_URL, auth.value)
        : fetchGallery(auth.value);
    load
      .then(({ items }) => { if (!cancelled) setAllItems(items); })
      .catch((err: Error) => { if (!cancelled) setLoadError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [auth]);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const pendingItems = useMemo(
    () =>
      allItems
        .filter((i) => effectiveStatus(i, decisions) === 'pending')
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [allItems, decisions],
  );

  const publishedItems = useMemo(
    () => allItems.filter((i) => effectiveStatus(i, decisions) === 'approved'),
    [allItems, decisions],
  );

  const rejectedItems = useMemo(
    () => allItems.filter((i) => effectiveStatus(i, decisions) === 'rejected'),
    [allItems, decisions],
  );

  const activeItems =
    activeTab === 'pending' ? pendingItems
    : activeTab === 'published' ? publishedItems
    : rejectedItems;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getEffectiveCaption = (item: GalleryItem) =>
    decisions.get(item.id)?.caption ?? item.name;

  const confirmOpenEdit = useCallback(() => {
    if (editingId !== null) {
      const item = allItems.find((i) => i.id === editingId);
      if (item) {
        setDecisions((prev) => {
          const next = new Map(prev);
          const existing = prev.get(editingId);
          next.set(editingId, {
            status: (existing?.status ?? effectiveStatus(item, prev)) as Decision['status'],
            caption: draftCaption,
          });
          return next;
        });
      }
      setEditingId(null);
    }
  }, [editingId, draftCaption, allItems]);

  const toggleSelect = useCallback(
    (id: string) => {
      confirmOpenEdit();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [confirmOpenEdit],
  );

  const selectAll = useCallback(() => {
    confirmOpenEdit();
    setSelectedIds(new Set(activeItems.map((i) => i.id)));
  }, [confirmOpenEdit, activeItems]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const applyBatch = useCallback(
    (status: Decision['status']) => {
      setDecisions((prev) => {
        const next = new Map(prev);
        for (const id of selectedIds) {
          const item = allItems.find((i) => i.id === id);
          if (!item) continue;
          const caption = prev.get(id)?.caption ?? item.name;
          next.set(id, { status, caption });
        }
        return next;
      });
      setSelectedIds(new Set());
    },
    [selectedIds, allItems],
  );

  const commitCaption = useCallback(
    (id: string, caption: string) => {
      const item = allItems.find((i) => i.id === id);
      if (!item) return;
      setDecisions((prev) => {
        const next = new Map(prev);
        const existing = prev.get(id);
        const status = (existing?.status ?? effectiveStatus(item, prev)) as Decision['status'];
        next.set(id, { status, caption });
        return next;
      });
    },
    [allItems],
  );

  // ── Commit ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!auth || decisions.size === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (auth.mode === 'google') {
        await commitDecisionsViaProxy(PROXY_URL, auth.value, decisions);
        const { items } = await fetchGalleryViaProxy(PROXY_URL, auth.value);
        setAllItems(items);
      } else {
        await commitDecisions(auth.value, decisions);
        const { items } = await fetchGallery(auth.value);
        setAllItems(items);
      }
      setDecisions(new Map());
      setSelectedIds(new Set());
      setEditingId(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setSaving(false);
    }
  }, [auth, decisions]);

  // ── Login screen ─────────────────────────────────────────────────────────
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const mode = detectMode();

  // Render the Google Sign-In button into its container once the login screen mounts.
  useEffect(() => {
    if (auth || mode !== 'google' || !googleBtnRef.current) return;
    const container = googleBtnRef.current;
    renderGoogleButton(GOOGLE_CLIENT_ID, container)
      .then((cred) => setAuth({ mode: 'google', value: cred }))
      .catch((err: Error) => setLoginError(err.message));
  }, [auth, mode]);

  const handleGoogleOneTap = useCallback(async () => {
    setSigningIn(true);
    setLoginError(null);
    try {
      const cred = await signInWithGoogle(GOOGLE_CLIENT_ID);
      setAuth({ mode: 'google', value: cred });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Hitelesítési hiba';
      // ONE_TAP_SUPPRESSED is not a real error — the button handles sign-in instead.
      if (msg !== 'ONE_TAP_SUPPRESSED') setLoginError(msg);
    } finally {
      setSigningIn(false);
    }
  }, []);

  if (!auth) {
    return (
      <main className="curate-shell curate-shell--center">
        <div className="curate-login">
          <h1 className="curate-login__title">Fotókuráció</h1>

          {mode === 'google' ? (
            <>
              <p className="curate-login__sub">
                Jelentkezz be @vac811.hu Google-fiókoddal.
              </p>
              {/* One-tap trigger button */}
              <button
                className="curate-btn curate-btn--primary curate-btn--oauth"
                onClick={() => void handleGoogleOneTap()}
                disabled={signingIn}
              >
                {signingIn ? 'Belépés…' : 'Belépés Google-fiókkal'}
              </button>
              {/* Rendered by GSI SDK as fallback */}
              <div ref={googleBtnRef} className="curate-login__gsi-btn" />
            </>
          ) : (
            <p className="curate-login__sub">
              Fejlesztői mód — GitHub Personal Access Tokennel.
            </p>
          )}

          {loginError && (
            <p className="curate-status curate-status--error">{loginError}</p>
          )}

          {/* PAT fallback — always shown in github mode, hidden behind toggle in google mode */}
          {(mode === 'github' || showPat) ? (
            <form
              className="curate-login__pat"
              onSubmit={(e) => {
                e.preventDefault();
                if (!pat.trim()) return;
                ghLogin(pat.trim());
                setAuth({ mode: 'github', value: pat.trim() });
              }}
            >
              <input
                className="curate-pat-input"
                type="password"
                placeholder="ghp_..."
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button className="curate-btn curate-btn--ghost" type="submit" disabled={!pat.trim()}>
                Belépés tokennel
              </button>
            </form>
          ) : (
            mode === 'google' && (
              <button
                className="curate-btn curate-btn--ghost curate-login__pat-toggle"
                onClick={() => setShowPat(true)}
              >
                Fejlesztői belépés (PAT token)
              </button>
            )
          )}
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="curate-shell curate-shell--center">
        <p className="curate-status">Galéria betöltése…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="curate-shell curate-shell--center">
        <p className="curate-status curate-status--error">Hiba: {loadError}</p>
        <button className="curate-btn" onClick={() => { setLoadError(null); setAuth(null); clearCredential(); ghLogout(); }}>
          Kijelentkezés
        </button>
      </main>
    );
  }

  return (
    <main className="curate-shell">
      <header className="curate-header">
        <h1 className="curate-header__title">Fotókuráció</h1>
        <div className="curate-header__actions">
          {auth && decisions.size > 0 && (
            <button
              className="curate-btn curate-btn--save"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? 'Mentés…' : `Mentés (${decisions.size})`}
            </button>
          )}
          <button className="curate-btn curate-btn--ghost" onClick={() => { clearCredential(); ghLogout(); setAuth(null); }}>
            Kijelentkezés
          </button>
        </div>
      </header>

      {saveError && (
        <div className="curate-error-bar">Mentési hiba: {saveError}</div>
      )}

      <nav className="curate-tabs">
        <button
          className={`curate-tab${activeTab === 'pending' ? ' curate-tab--active' : ''}`}
          onClick={() => { setActiveTab('pending'); setSelectedIds(new Set()); }}
        >
          Jóváhagyásra vár{pendingItems.length > 0 ? ` (${pendingItems.length})` : ''}
        </button>
        <button
          className={`curate-tab${activeTab === 'published' ? ' curate-tab--active' : ''}`}
          onClick={() => { setActiveTab('published'); setSelectedIds(new Set()); }}
        >
          Megjelent{publishedItems.length > 0 ? ` (${publishedItems.length})` : ''}
        </button>
        <button
          className={`curate-tab${activeTab === 'rejected' ? ' curate-tab--active' : ''}`}
          onClick={() => { setActiveTab('rejected'); setSelectedIds(new Set()); }}
        >
          Elutasítottak{rejectedItems.length > 0 ? ` (${rejectedItems.length})` : ''}
        </button>
      </nav>

      <div className="cms-content">
        {selectedIds.size > 0 && (
          <div className="cms-action-bar">
            {activeTab === 'pending' && (
              <>
                <button
                  className="curate-btn curate-btn--approve"
                  onClick={() => applyBatch('approved')}
                >
                  Jóváhagyás ({selectedIds.size})
                </button>
                <button
                  className="curate-btn curate-btn--reject"
                  onClick={() => applyBatch('rejected')}
                >
                  Elutasítás ({selectedIds.size})
                </button>
              </>
            )}
            {activeTab === 'published' && (
              <button
                className="curate-btn curate-btn--ghost"
                onClick={() => applyBatch('pending')}
              >
                Visszavonás ({selectedIds.size})
              </button>
            )}
            {activeTab === 'rejected' && (
              <button
                className="curate-btn curate-btn--primary"
                onClick={() => applyBatch('pending')}
              >
                Visszaállítás ({selectedIds.size})
              </button>
            )}
          </div>
        )}

        <div className="cms-toolbar">
          <button className="curate-btn curate-btn--ghost" onClick={selectAll}>
            Összes kijelölése
          </button>
          {selectedIds.size > 0 && (
            <button className="curate-btn curate-btn--ghost" onClick={deselectAll}>
              Kijelölés törlése
            </button>
          )}
          <span className="cms-toolbar__count">{activeItems.length} fotó</span>
        </div>

        {activeItems.length === 0 ? (
          <p className="curate-status" style={{ padding: 'var(--space-6)' }}>
            Nincs megjeleníthető fotó.
          </p>
        ) : (
          <div className="cms-grid">
            {activeItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isEditing = editingId === item.id;
              return (
                <div
                  key={item.id}
                  className={`cms-card${isSelected ? ' cms-card--selected' : ''}`}
                >
                  <div className="cms-card__thumb-wrap" onClick={() => toggleSelect(item.id)}>
                    <img
                      className="cms-card__img"
                      src={cdnUrl(item.id, 400)}
                      alt={item.name}
                      loading="lazy"
                    />
                    <label className="cms-card__checkbox-wrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </label>
                    {item.score != null && (
                      <span className="cms-card__score-chip">{item.score}</span>
                    )}
                  </div>

                  <div className="cms-card__chips">
                    {item.year && <span className="curate-chip">{item.year}</span>}
                    {item.event && <span className="curate-chip">{item.event}</span>}
                  </div>

                  {isEditing ? (
                    <textarea
                      className="cms-card__caption-edit"
                      autoFocus
                      value={draftCaption}
                      onChange={(e) => setDraftCaption(e.target.value)}
                      onBlur={() => {
                        if (!captionEscaped.current) commitCaption(item.id, draftCaption);
                        captionEscaped.current = false;
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          commitCaption(item.id, draftCaption);
                          setEditingId(null);
                        }
                        if (e.key === 'Escape') {
                          captionEscaped.current = true;
                          setEditingId(null);
                        }
                      }}
                      rows={2}
                    />
                  ) : (
                    <p
                      className="cms-card__caption"
                      title="Kattints a szerkesztéshez"
                      onClick={() => {
                        confirmOpenEdit();
                        setDraftCaption(getEffectiveCaption(item));
                        setEditingId(item.id);
                      }}
                    >
                      {getEffectiveCaption(item)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
