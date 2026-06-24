/**
 * Client consumer of the routine SSE routes (034). Uses `expo/fetch` — NOT `apiFetch`/global
 * `fetch`, whose native implementation cannot read a response body incrementally — to POST and read
 * the `text/event-stream`, threading an `AbortController.signal` so Cancel aborts the request (and,
 * server-side, the upstream OpenRouter call). It parses the typed frames (`event:` / `data:` lines,
 * ignoring `:` keep-alive comments), forwards `progress`/`retry` to the caller, and resolves with
 * the validated `done` payload.
 *
 * The client stays dumb (034/035): the server already validated + mapped the object; `isValid` is a
 * light transport sanity check (the same role the old `isProgram` call played). A terminal `error`
 * frame, a non-2xx response (auth/cap/parse failures arrive as plain JSON, not a stream), or an EOF
 * before any `done` (a dropped connection) all reject — the caller maps that to its fallback
 * (fixed spine for plan; gen-error for generate/refine).
 */
import { fetch as expoFetch } from 'expo/fetch';
import { apiBaseUrl } from '@/auth/api-base';
import { authHeaders, type GetSessionToken } from '@/auth/auth-headers';

export interface RoutineProgress {
  count: number;
  scalar?: number;
}

/** Per-call streaming options threaded from the wizard into each data-API wrapper. */
export interface RoutineStreamOpts {
  signal: AbortSignal;
  onProgress?: (progress: RoutineProgress) => void;
  onRetry?: () => void;
}

interface StreamRoutineArgs<T> {
  path: string;
  getToken: GetSessionToken;
  body: string;
  signal: AbortSignal;
  isValid: (value: unknown) => value is T;
  onProgress?: (progress: RoutineProgress) => void;
  onRetry?: () => void;
}

export async function streamRoutine<T>(args: StreamRoutineArgs<T>): Promise<T> {
  const headers: Record<string, string> = await authHeaders(args.getToken);
  headers['Content-Type'] = 'application/json';
  headers.Accept = 'text/event-stream';

  const res = await expoFetch(`${apiBaseUrl()}${args.path}`, {
    method: 'POST',
    headers,
    body: args.body,
    signal: args.signal,
  });
  if (!res.ok || res.body === null) {
    throw new Error(`Request failed (${String(res.status)})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: T | null = null;
  let failure: string | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep = buffer.indexOf('\n\n');
    while (sep !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf('\n\n');

      let event = 'message';
      let data = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith(':')) continue; // keep-alive comment
        if (line.startsWith('event:')) event = line.slice('event:'.length).trim();
        else if (line.startsWith('data:')) data += line.slice('data:'.length).trim();
      }

      if (event === 'progress' && data.length > 0) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = null;
        }
        if (typeof parsed === 'object' && parsed !== null && 'count' in parsed) {
          const count = parsed.count;
          if (typeof count === 'number') {
            const scalar =
              'scalar' in parsed && typeof parsed.scalar === 'number' ? parsed.scalar : undefined;
            args.onProgress?.(scalar === undefined ? { count } : { count, scalar });
          }
        }
      } else if (event === 'retry') {
        args.onRetry?.();
      } else if (event === 'done' && data.length > 0) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = null;
        }
        if (args.isValid(parsed)) result = parsed;
        else failure = 'Malformed done payload';
      } else if (event === 'error') {
        failure = 'generation_failed';
      }
    }
  }

  if (failure !== null) throw new Error(failure);
  if (result === null) throw new Error('Stream ended before completion');
  return result;
}
