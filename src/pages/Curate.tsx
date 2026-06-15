import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken, login, logout } from '../lib/githubAuth';
import { fetchGallery, commitDecisions, cdnUrl } from '../lib/galleryRepo';
import type { GalleryItem } from './Gallery';
import type { Decision } from '../lib/galleryRepo';
import './Curate.css';

const AUTO_FLUSH_AT = 10;

const AUTH_BASE = 'https://sveltia-cms-auth.dudas-adam99.workers.dev';
const AUTH_ORIGIN = AUTH_BASE;

interface CardState {
  offset: number;
  dragging: boolean;
}

export default function Curate() {
  const [token, setToken] = useState<string | null>(getToken);
  const [allItems, setAllItems] = useState<GalleryItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Queue of pending items (status === 'pending'), sorted score desc
  const [queue, setQueue] = useState<GalleryItem[]>([]);
  const [index, setIndex] = useState(0);

  // Buffered decisions (not yet committed)
  const [decisions, setDecisions] = useState<Map<string, Decision>>(new Map());
  // Ordered stack of IDs for undo (same order decisions were made)
  const [undoStack, setUndoStack] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'pending' | 'rejected'>('pending');
  const [editingCaption, setEditingCaption] = useState(false);
  const [draftCaption, setDraftCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [card, setCard] = useState<CardState>({ offset: 0, dragging: false });
  const dragOrigin = useRef<number | null>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  // ── Load gallery after login ────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    fetchGallery(token)
      .then(({ items }) => {
        setAllItems(items);
        const pending = items
          .filter(
            (i) => i.status === 'pending' || (i.status == null && !i.approved),
          )
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        setQueue(pending);
        setIndex(0);
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Current card ────────────────────────────────────────────────────────
  const currentItem = queue[index] ?? null;

  const currentCaption = (() => {
    if (editingCaption) return draftCaption;
    const d = currentItem ? decisions.get(currentItem.id) : undefined;
    return d ? d.caption : (currentItem?.name ?? '');
  })();

  // ── Decision helpers ────────────────────────────────────────────────────
  const decide = useCallback(
    (status: 'approved' | 'rejected', caption?: string) => {
      if (!currentItem) return;
      const cap = caption ?? currentCaption;
      setDecisions((prev) => {
        const next = new Map(prev);
        next.set(currentItem.id, { status, caption: cap });
        return next;
      });
      setUndoStack((prev) => [...prev, currentItem.id]);
      setEditingCaption(false);
      setCard({ offset: 0, dragging: false });
      setIndex((i) => i + 1);
    },
    [currentItem, currentCaption],
  );

  const handleApprove = useCallback(() => decide('approved'), [decide]);
  const handleReject = useCallback(() => decide('rejected'), [decide]);

  const handleSkip = useCallback(() => {
    setEditingCaption(false);
    setCard({ offset: 0, dragging: false });
    setIndex((i) => i + 1);
  }, []);

  const handleUndo = useCallback(() => {
    if (!undoStack.length) return;
    const lastId = undoStack[undoStack.length - 1];
    setDecisions((prev) => {
      const next = new Map(prev);
      next.delete(lastId);
      return next;
    });
    setUndoStack((prev) => prev.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
    setEditingCaption(false);
    setCard({ offset: 0, dragging: false });
  }, [undoStack]);

  // ── Commit ──────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!token || decisions.size === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await commitDecisions(token, decisions);
      const { items } = await fetchGallery(token);
      setAllItems(items);
      setDecisions(new Map());
      setUndoStack([]);
      // Refresh pending queue from new data, skipping already-processed IDs
      const remaining = items
        .filter(
          (i) => i.status === 'pending' || (i.status == null && !i.approved),
        )
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      setQueue(remaining);
      setIndex(0);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setSaving(false);
    }
  }, [token, decisions]);

  // Auto-flush at AUTO_FLUSH_AT decisions
  useEffect(() => {
    if (decisions.size >= AUTO_FLUSH_AT && !saving) {
      void handleSave();
    }
  }, [decisions.size, saving, handleSave]);

  // ── Keyboard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingCaption) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); handleApprove(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handleReject(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); handleSkip(); }
      else if (e.key === 'z' && !e.metaKey && !e.ctrlKey) handleUndo();
      else if (e.key === 'e') {
        e.preventDefault();
        if (currentItem) {
          setDraftCaption(decisions.get(currentItem.id)?.caption ?? currentItem.name);
          setEditingCaption(true);
          setTimeout(() => captionRef.current?.focus(), 0);
        }
      }
      else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingCaption, handleApprove, handleReject, handleSkip, handleUndo, handleSave, currentItem, decisions]);

  // ── Touch / pointer swipe ───────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragOrigin.current = e.clientX;
    setCard((c) => ({ ...c, dragging: true }));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragOrigin.current === null) return;
    setCard({ offset: e.clientX - dragOrigin.current, dragging: true });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragOrigin.current === null) return;
    const dx = e.clientX - dragOrigin.current;
    dragOrigin.current = null;
    if (Math.abs(dx) > 100) {
      if (dx > 0) handleApprove();
      else handleReject();
    } else {
      setCard({ offset: 0, dragging: false });
    }
  };

  // ── Rejected tab items ──────────────────────────────────────────────────
  const rejectedIds = [...decisions.entries()]
    .filter(([, d]) => d.status === 'rejected')
    .map(([id]) => id);
  const rejectedItems = allItems.filter((i) => rejectedIds.includes(i.id));

  const restoreFromRejected = (id: string) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setUndoStack((prev) => prev.filter((x) => x !== id));
    setIndex((i) => {
      const pos = queue.findIndex((q) => q.id === id);
      return pos !== -1 && pos < i ? i - 1 : i;
    });
  };

  // ── OAuth login helpers ─────────────────────────────────────────────────
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
        // Handshake: popup sends "authorizing:github" first; we must echo it back
        // before it will release the token.
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

  // ── Render helpers ──────────────────────────────────────────────────────
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

  const pendingInQueue = queue.length - index;

  return (
    <main className="curate-shell">
      {/* Header */}
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

      {/* Tabs */}
      <nav className="curate-tabs">
        <button
          className={`curate-tab${activeTab === 'pending' ? ' curate-tab--active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Jóváhagyásra vár{pendingInQueue > 0 ? ` (${pendingInQueue})` : ''}
        </button>
        <button
          className={`curate-tab${activeTab === 'rejected' ? ' curate-tab--active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Elutasítottak{rejectedItems.length > 0 ? ` (${rejectedItems.length})` : ''}
        </button>
      </nav>

      {/* Pending tab */}
      {activeTab === 'pending' && (
        <div className="curate-stage">
          {!currentItem ? (
            <div className="curate-done">
              <p>Nincs több jóváhagyásra váró fotó.</p>
              {decisions.size > 0 && (
                <button
                  className="curate-btn curate-btn--primary"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? 'Mentés…' : `Változtatások mentése (${decisions.size})`}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Card */}
              <div
                className="curate-card-wrap"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                <div
                  className="curate-card"
                  style={{
                    transform: `translateX(${card.offset}px) rotate(${card.offset * 0.04}deg)`,
                    transition: card.dragging ? 'none' : 'transform 0.3s ease',
                  }}
                >
                  <div
                    className="curate-card__approve-hint"
                    style={{ opacity: Math.min(1, Math.max(0, card.offset / 120)) }}
                  >
                    ✓ Jóváhagyás
                  </div>
                  <div
                    className="curate-card__reject-hint"
                    style={{ opacity: Math.min(1, Math.max(0, -card.offset / 120)) }}
                  >
                    ✗ Elutasítás
                  </div>

                  <img
                    className="curate-card__img"
                    src={cdnUrl(currentItem.id, 800)}
                    srcSet={`${cdnUrl(currentItem.id, 400)} 400w, ${cdnUrl(currentItem.id, 800)} 800w`}
                    sizes="(max-width: 600px) 400px, 800px"
                    alt={currentItem.name}
                    draggable={false}
                  />

                  <div className="curate-card__meta">
                    <div className="curate-card__chips">
                      {currentItem.year && <span className="curate-chip">{currentItem.year}</span>}
                      {currentItem.event && <span className="curate-chip">{currentItem.event}</span>}
                      {currentItem.score != null && (
                        <span className="curate-chip curate-chip--score">{currentItem.score} pont</span>
                      )}
                    </div>

                    {editingCaption ? (
                      <textarea
                        ref={captionRef}
                        className="curate-card__caption-edit"
                        value={draftCaption}
                        onChange={(e) => setDraftCaption(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            setEditingCaption(false);
                          }
                          if (e.key === 'Escape') setEditingCaption(false);
                        }}
                        rows={2}
                      />
                    ) : (
                      <p
                        className="curate-card__caption"
                        title="Kattints a szerkesztéshez"
                        onClick={() => {
                          setDraftCaption(decisions.get(currentItem.id)?.caption ?? currentItem.name);
                          setEditingCaption(true);
                          setTimeout(() => captionRef.current?.focus(), 0);
                        }}
                      >
                        {currentCaption}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="curate-controls">
                <button
                  className="curate-ctrl curate-ctrl--reject"
                  onClick={handleReject}
                  title="Elutasítás (←)"
                >✗</button>
                <button
                  className="curate-ctrl curate-ctrl--undo"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  title="Visszavonás (Z)"
                >↩</button>
                <button
                  className="curate-ctrl curate-ctrl--skip"
                  onClick={handleSkip}
                  title="Kihagyás (↑)"
                >↑</button>
                <button
                  className="curate-ctrl curate-ctrl--approve"
                  onClick={handleApprove}
                  title="Jóváhagyás (→)"
                >✓</button>
              </div>

              <p className="curate-progress">
                {index + 1} / {queue.length} · {decisions.size} döntés
              </p>
            </>
          )}
        </div>
      )}

      {/* Rejected tab */}
      {activeTab === 'rejected' && (
        <div className="curate-rejected">
          {rejectedItems.length === 0 ? (
            <p className="curate-status">Nincs elutasított fotó ebben a munkamenetben.</p>
          ) : (
            <div className="curate-rejected-grid">
              {rejectedItems.map((item) => (
                <div key={item.id} className="curate-rejected-card">
                  <img
                    className="curate-rejected-card__img"
                    src={cdnUrl(item.id, 400)}
                    alt={item.name}
                    loading="lazy"
                  />
                  <p className="curate-rejected-card__name">{decisions.get(item.id)?.caption ?? item.name}</p>
                  <button
                    className="curate-btn curate-btn--ghost"
                    onClick={() => restoreFromRejected(item.id)}
                  >
                    Visszaállítás
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
