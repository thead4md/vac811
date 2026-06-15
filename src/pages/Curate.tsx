import { useState, useEffect, useCallback, useMemo } from 'react';
import { getToken, login, logout } from '../lib/githubAuth';
import { fetchGallery, commitDecisions, cdnUrl } from '../lib/galleryRepo';
import type { GalleryItem } from './Gallery';
import type { Decision } from '../lib/galleryRepo';
import './Curate.css';

const AUTH_BASE = 'https://sveltia-cms-auth.dudas-adam99.workers.dev';
const AUTH_ORIGIN = AUTH_BASE;

function effectiveStatus(item: GalleryItem, decisions: Map<string, Decision>): string {
  const d = decisions.get(item.id);
  if (d) return d.status;
  if (item.status) return item.status;
  return item.approved ? 'approved' : 'pending';
}

export default function Curate() {
  const [token, setToken] = useState<string | null>(getToken);
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

  // ── Load gallery after login ──────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    fetchGallery(token)
      .then(({ items }) => setAllItems(items))
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

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
    if (!token || decisions.size === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await commitDecisions(token, decisions);
      const { items } = await fetchGallery(token);
      setAllItems(items);
      setDecisions(new Map());
      setSelectedIds(new Set());
      setEditingId(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setSaving(false);
    }
  }, [token, decisions]);

  // ── OAuth login helpers ───────────────────────────────────────────────────
  const startOAuthLogin = useCallback(
    (onSuccess: (tok: string) => void, onError: (msg: string) => void) => {
      const url = `${AUTH_BASE}/auth?provider=github&scope=repo&site_id=vac811.hu%2Fbeta`;
      const popup = window.open(url, 'github-oauth', 'width=600,height=720,left=200,top=80');
      let resolved = false;

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        clearInterval(poll);
      };

      const onMessage = (e: MessageEvent) => {
        if (e.origin !== AUTH_ORIGIN) return;
        if (typeof e.data !== 'string') return;
        if (e.data === 'authorizing:github') {
          (e.source as Window)?.postMessage('authorizing:github', AUTH_ORIGIN);
          return;
        }
        const PREFIX_OK = 'authorization:github:success:';
        const PREFIX_ERR = 'authorization:github:error:';
        if (e.data.startsWith(PREFIX_OK)) {
          try {
            const { token: tok } = JSON.parse(e.data.slice(PREFIX_OK.length)) as { token: string };
            if (tok) { resolved = true; login(tok); onSuccess(tok); popup?.close(); }
          } catch { /* ignore */ }
          cleanup();
        } else if (e.data.startsWith(PREFIX_ERR)) {
          try {
            const { error: msg } = JSON.parse(e.data.slice(PREFIX_ERR.length)) as { error: string };
            onError(msg || 'Hitelesítési hiba');
          } catch { onError('Hitelesítési hiba'); }
          cleanup();
        }
      };

      window.addEventListener('message', onMessage);
      const poll = setInterval(() => {
        if (popup?.closed && !resolved) { cleanup(); onError('A belépési ablak be lett zárva.'); }
      }, 1000);
    },
    [],
  );

  // ── Render helpers ────────────────────────────────────────────────────────
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  if (!token) {
    return (
      <main className="curate-shell curate-shell--center">
        <div className="curate-login">
          <h1 className="curate-login__title">Fotókuráció</h1>
          <p className="curate-login__sub">
            GitHub-fiókkal jelentkezz be a fotók jóváhagyásához.
          </p>
          <button
            className="curate-btn curate-btn--primary curate-btn--oauth"
            onClick={() => {
              setOauthError(null);
              startOAuthLogin(
                (tok) => setToken(tok),
                (msg) => setOauthError(msg),
              );
            }}
          >
            Belépés GitHub-fiókkal
          </button>
          {oauthError && (
            <p className="curate-status curate-status--error">{oauthError}</p>
          )}
          {showPat ? (
            <form
              className="curate-login__pat"
              onSubmit={(e) => {
                e.preventDefault();
                if (!pat.trim()) return;
                login(pat.trim());
                setToken(pat.trim());
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
            <button
              className="curate-btn curate-btn--ghost curate-login__pat-toggle"
              onClick={() => setShowPat(true)}
            >
              Fejlesztői belépés (PAT token)
            </button>
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
        <button className="curate-btn" onClick={() => { setLoadError(null); setToken(null); logout(); }}>
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
          {decisions.size > 0 && (
            <button
              className="curate-btn curate-btn--save"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? 'Mentés…' : `Mentés (${decisions.size})`}
            </button>
          )}
          <button className="curate-btn curate-btn--ghost" onClick={() => { logout(); setToken(null); }}>
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
                        commitCaption(item.id, draftCaption);
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          commitCaption(item.id, draftCaption);
                          setEditingId(null);
                        }
                        if (e.key === 'Escape') setEditingId(null);
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
