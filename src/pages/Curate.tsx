import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { driveImgUrl, driveSrcSet } from '../lib/drive';
import {
  clearToken,
  getToken,
  loginWithGitHub,
} from '../lib/githubAuth';
import {
  commitDecisions,
  effectiveStatus,
  fetchGallery,
  type Decision,
  type GalleryPhoto,
  type PhotoStatus,
} from '../lib/galleryRepo';
import './Curate.css';

const AUTOSAVE_AFTER = 10; // flush buffered decisions once this many pile up
const SWIPE_THRESHOLD = 110; // px drag distance to count as a decision

export default function Curate() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [decisions, setDecisions] = useState<Map<string, Decision>>(new Map());
  const [order, setOrder] = useState<string[]>([]); // decided ids, for undo
  const [captionEdits, setCaptionEdits] = useState<Map<string, string>>(new Map()); // id → edited caption
  const [tab, setTab] = useState<'pending' | 'rejected'>('pending');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [skipped, setSkipped] = useState<Set<string>>(new Set()); // moved-to-back, not decided
  const [drag, setDrag] = useState(0); // current card horizontal drag offset (px)
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  // ── auth ──────────────────────────────────────────────────────────────────
  const login = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const t = await loginWithGitHub();
      setTokenState(t);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Bejelentkezési hiba.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setPhotos([]);
    setDecisions(new Map());
    setOrder([]);
  }, []);

  // ── load gallery ────────────────────────────────────────────────────────────
  const load = useCallback(async (t: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const { photos: ps } = await fetchGallery(t);
      setPhotos(ps);
      setDecisions(new Map());
      setOrder([]);
      setCaptionEdits(new Map());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Betöltési hiba.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Data fetch on auth: load() synchronizes React state with the GitHub repo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) load(token);
  }, [token, load]);

  // Keep this leader tool out of search indexes.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  // ── derived queues ──────────────────────────────────────────────────────────
  const statusOf = useCallback(
    (p: GalleryPhoto): PhotoStatus => decisions.get(p.id)?.status ?? effectiveStatus(p),
    [decisions],
  );

  const pending = useMemo(() => {
    const ps = photos.filter((p) => statusOf(p) === 'pending');
    // skipped cards drop to the back so the queue keeps advancing
    return [...ps].sort(
      (a, b) => (skipped.has(a.id) ? 1 : 0) - (skipped.has(b.id) ? 1 : 0),
    );
  }, [photos, statusOf, skipped]);
  const rejected = useMemo(
    () => photos.filter((p) => statusOf(p) === 'rejected'),
    [photos, statusOf],
  );
  const approvedCount = useMemo(
    () => photos.filter((p) => statusOf(p) === 'approved').length,
    [photos, statusOf],
  );

  const current = pending[0] ?? null;
  const unsaved = decisions.size;
  // Caption shown for the current card: the leader's edit if any, else the AI text.
  const caption = current ? captionEdits.get(current.id) ?? current.name : '';

  // ── decide / undo / restore ─────────────────────────────────────────────────
  const decide = useCallback(
    (status: PhotoStatus) => {
      if (!current) return;
      const id = current.id;
      const trimmed = caption.trim();
      const d: Decision = { status };
      if (status === 'approved' && trimmed && trimmed !== current.name) d.name = trimmed;
      setDecisions((prev) => {
        const next = new Map(prev);
        next.set(id, d);
        return next;
      });
      setOrder((prev) => [...prev, id]);
      setDrag(0);
    },
    [current, caption],
  );

  const skip = useCallback(() => {
    if (!current) return;
    setSkipped((prev) => new Set(prev).add(current.id));
    setDrag(0);
  }, [current]);

  const undo = useCallback(() => {
    setOrder((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setDecisions((dprev) => {
        const next = new Map(dprev);
        next.delete(last);
        return next;
      });
      return prev.slice(0, -1);
    });
  }, []);

  const restore = useCallback((id: string) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(id, { status: 'pending' });
      return next;
    });
    setOrder((prev) => [...prev, id]);
  }, []);

  // ── save ────────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!token || decisions.size === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    const count = decisions.size;
    try {
      const { photos: updated } = await commitDecisions(
        token,
        decisions,
        `chore: curate gallery — ${count} döntés a /kuracio felületről`,
      );
      setPhotos(updated);
      setDecisions(new Map());
      setOrder([]);
      setCaptionEdits(new Map());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Mentési hiba.');
    } finally {
      setSaving(false);
    }
  }, [token, decisions, saving]);

  // autosave once enough decisions buffer up (side effect: commit to GitHub)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (decisions.size >= AUTOSAVE_AFTER && !saving) save();
  }, [decisions.size, saving, save]);

  // ── keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (tab !== 'pending') return;
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (typing) {
        if (e.key === 'Escape') (target as HTMLInputElement).blur();
        return;
      }
      if (e.key === 'ArrowRight') { e.preventDefault(); decide('approved'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); decide('rejected'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); skip(); }
      else if (e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if (e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, decide, skip, undo, save]);

  // warn on leaving with unsaved decisions
  useEffect(() => {
    if (!unsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsaved]);

  // ── touch swipe on the current card ─────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientX;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current == null) return;
    setDrag(e.touches[0].clientX - dragStart.current);
  };
  const onTouchEnd = () => {
    if (drag > SWIPE_THRESHOLD) decide('approved');
    else if (drag < -SWIPE_THRESHOLD) decide('rejected');
    else setDrag(0);
    dragStart.current = null;
    setDragging(false);
  };

  // ── render ──────────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <main className="curate" aria-label="Fotó kuráció">
        <div className="curate__gate">
          <h1>Fotó kuráció</h1>
          <p>Jelentkezz be a GitHub-fiókoddal a fotók jóváhagyásához.</p>
          <button className="curate__btn curate__btn--primary" onClick={login} disabled={authBusy}>
            {authBusy ? 'Bejelentkezés…' : 'Bejelentkezés GitHubbal'}
          </button>
          {authError && <p className="curate__error">{authError}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="curate" aria-label="Fotó kuráció">
      <header className="curate__bar">
        <div className="curate__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'pending'}
            className={`curate__tab${tab === 'pending' ? ' is-active' : ''}`}
            onClick={() => setTab('pending')}
          >
            Jóváhagyásra vár ({pending.length})
          </button>
          <button
            role="tab"
            aria-selected={tab === 'rejected'}
            className={`curate__tab${tab === 'rejected' ? ' is-active' : ''}`}
            onClick={() => setTab('rejected')}
          >
            Elutasítottak ({rejected.length})
          </button>
        </div>
        <div className="curate__status">
          <span className="curate__chip curate__chip--ok">✓ {approvedCount} jóváhagyva</span>
          {unsaved > 0 && <span className="curate__chip curate__chip--warn">{unsaved} mentetlen</span>}
          <button
            className="curate__btn curate__btn--primary"
            onClick={save}
            disabled={saving || unsaved === 0}
          >
            {saving ? 'Mentés…' : 'Mentés'}
          </button>
          <button className="curate__btn" onClick={logout} title="Kijelentkezés">⎋</button>
        </div>
      </header>

      {saveError && <p className="curate__error curate__error--bar">{saveError}</p>}

      {loading && <p className="curate__muted">Betöltés…</p>}
      {loadError && (
        <p className="curate__error">
          {loadError} <button className="curate__btn" onClick={() => token && load(token)}>Újra</button>
        </p>
      )}

      {!loading && !loadError && tab === 'pending' && (
        current ? (
          <section className="curate__stage">
            <div
              className="curate__card"
              style={{
                transform: `translateX(${drag}px) rotate(${drag / 40}deg)`,
                transition: dragging ? 'none' : 'transform 0.2s ease',
              }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div className="curate__imgwrap">
                <img
                  key={current.id}
                  className="curate__img"
                  src={driveImgUrl(current.id, 1000)}
                  srcSet={driveSrcSet(current.id, [600, 1000, 1400])}
                  sizes="(max-width: 700px) 92vw, 640px"
                  alt={current.name}
                  decoding="async"
                />
                {drag > 40 && <span className="curate__stamp curate__stamp--yes">JÓVÁHAGY</span>}
                {drag < -40 && <span className="curate__stamp curate__stamp--no">ELUTASÍT</span>}
              </div>
              <div className="curate__meta">
                <div className="curate__chips">
                  {current.event && <span className="curate__tag">{current.event}</span>}
                  <span className="curate__tag">{current.year}</span>
                  {current.score != null && <span className="curate__tag">⭐ {current.score}</span>}
                </div>
                <input
                  className="curate__caption"
                  value={caption}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCaptionEdits((prev) => new Map(prev).set(current.id, v));
                  }}
                  placeholder="Képaláírás…"
                  aria-label="Képaláírás"
                />
              </div>
            </div>

            <div className="curate__actions">
              <button
                className="curate__act curate__act--no"
                onClick={() => decide('rejected')}
                title="Elutasít (←)"
              >✕</button>
              <button
                className="curate__act curate__act--undo"
                onClick={undo}
                disabled={order.length === 0}
                title="Visszavonás (z)"
              >↶</button>
              <button
                className="curate__act curate__act--skip"
                onClick={skip}
                title="Kihagyás (↑)"
              >⤼</button>
              <button
                className="curate__act curate__act--yes"
                onClick={() => decide('approved')}
                title="Jóváhagy (→)"
              >✓</button>
            </div>
            <p className="curate__hint">← elutasít · → jóváhagy · ↑ kihagy · z visszavon · s mentés</p>
          </section>
        ) : (
          <section className="curate__empty">
            <p>🎉 Nincs több jóváhagyásra váró fotó.</p>
            {unsaved > 0 && <p>Ne felejtsd el menteni a {unsaved} döntést.</p>}
          </section>
        )
      )}

      {!loading && !loadError && tab === 'rejected' && (
        rejected.length ? (
          <section className="curate__grid">
            {rejected.map((p) => (
              <figure key={p.id} className="curate__gitem">
                <img
                  src={driveImgUrl(p.id, 400)}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>{p.name}</figcaption>
                <button className="curate__btn" onClick={() => restore(p.id)}>Visszaállít</button>
              </figure>
            ))}
          </section>
        ) : (
          <section className="curate__empty"><p>Nincs elutasított fotó.</p></section>
        )
      )}
    </main>
  );
}
