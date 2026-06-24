/**
 * Builds the `text/event-stream` Response shared by the three routine routes (034). It drives the
 * streaming LLM call, scans the accumulating buffer for structural progress, and emits typed SSE
 * events:
 *   - `progress` {count, scalar?}  — emitted whenever the structural snapshot changes.
 *   - `retry`    {}                — the first streamed attempt failed to parse; a non-streamed
 *                                    retry is now running (the client holds last progress).
 *   - `done`     <validated obj>   — the fully validated + mapped Program / QuestionGraph.
 *   - `error`    {reason}          — generation failed after the retry.
 *
 * Retry ownership lives HERE, not in `requestJson` (whose opaque internal retry would double the
 * upstream call count): `progress` events come only from the first streaming attempt; on an
 * end-of-stream parse/validation failure we run exactly ONE non-streamed `callLlm` retry. A client
 * disconnect aborts `request.signal` → `streamLlm`'s upstream fetch aborts; we then close quietly
 * without an `error` frame. Periodic `:` heartbeats keep the connection open through the DO ingress
 * (006) during the long initial latency before the first token.
 *
 * Auth + the daily cap are enforced by the caller BEFORE this runs, so a 401/429/400 is always a
 * plain JSON Response, never a stream (034 proposal).
 */
import { callLlm } from '@/server/llm/call-llm';
import { extractJson } from '@/server/llm/extract-json';
import { scanProgress } from '@/server/llm/scan-progress';
import { streamLlm } from '@/server/llm/stream-llm';

const RETRY_NUDGE = '\n\nReturn ONLY the JSON object — no prose, no markdown fences.';
const HEARTBEAT_MS = 10000;

interface RoutineStreamConfig {
  system: string;
  user: string;
  signal: AbortSignal;
  arrayKey: string;
  scalarKey?: string;
  /** Validates + maps the parsed JSON; throws on a malformed shape (triggers the retry). */
  finalize: (raw: unknown) => unknown;
}

export function buildRoutineStream(config: RoutineStreamConfig): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (frame: string): void => {
        try {
          controller.enqueue(encoder.encode(frame));
        } catch {
          // Controller already closed (client gone) — nothing to flush to.
        }
      };
      const send = (event: string, data: unknown): void => {
        enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
      const heartbeat = setInterval(() => enqueue(': keep-alive\n\n'), HEARTBEAT_MS);
      try {
        let buffer = '';
        let lastCount = -1;
        let lastScalar: number | undefined;
        for await (const delta of streamLlm(config.system, config.user, config.signal)) {
          buffer += delta;
          const scan = scanProgress(buffer, config.arrayKey, config.scalarKey);
          if (scan.count !== lastCount || scan.scalar !== lastScalar) {
            lastCount = scan.count;
            lastScalar = scan.scalar;
            send('progress', scan);
          }
        }
        let result: unknown;
        try {
          result = config.finalize(extractJson(buffer));
        } catch {
          send('retry', {});
          const retryText = await callLlm(config.system, config.user + RETRY_NUDGE, config.signal);
          result = config.finalize(extractJson(retryText));
        }
        send('done', result);
      } catch {
        if (!config.signal.aborted) send('error', { reason: 'generation_failed' });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
