import { useState, useEffect } from 'react';
import type { ZodType } from 'zod';

// Tiny in-memory cache so shared collections (settings, leaders, …) aren't
// refetched on every page that consumes them.
const cache = new Map<string, unknown>();

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Generic hook to fetch JSON content files managed by Decap CMS.
// An optional zod schema validates the parsed content; on mismatch the fetch
// is treated as failed (data stays null) so callers fall back to static data
// instead of rendering a malformed shape.
export function useContent<T>(file: string, key: string, schema?: ZodType<T>): State<T> {
  const cacheKey = `${file}#${key}`;
  const [state, setState] = useState<State<T>>(() =>
    cache.has(cacheKey)
      ? { data: cache.get(cacheKey) as T, loading: false, error: null }
      : { data: null, loading: true, error: null }
  );

  useEffect(() => {
    let cancelled = false;

    const source: Promise<T> = cache.has(cacheKey)
      ? Promise.resolve(cache.get(cacheKey) as T)
      : fetch(`${import.meta.env.BASE_URL}content/${file}`)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((json) => {
            const value = (json[key] ?? json) as T;
            if (schema) {
              const result = schema.safeParse(value);
              if (!result.success) throw new Error(`Invalid ${file}: ${result.error.message}`);
            }
            cache.set(cacheKey, value);
            return value;
          });

    source
      .then((value) => {
        if (!cancelled) setState({ data: value, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Hiba' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file, key, cacheKey, schema]);

  return state;
}
