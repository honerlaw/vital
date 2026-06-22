/**
 * Validate + normalize the LLM's generated program JSON into a typed `Program` (030). The raw
 * value is `unknown`; every field is narrowed cast-free (strict-writer, 028) and a malformed shape
 * throws — the route then 502s and the client retries / falls back. `id` is assigned by the caller
 * (a server-minted uuid) so a draft is stable before save; `cred` is forced to a constant (never
 * trusted from the model). Schemes are normalized to the '×' separator so prefill works (022).
 */
import { isProgramTag, isWorkoutDayArray } from '@/data/guards';
import { normalizeScheme } from '@/server/llm/normalize-scheme';
import { type Program } from '@/data/types';

const CRED = 'Generated for you';

export function mapLlmProgram(raw: unknown, id: string): Program {
  if (typeof raw !== 'object' || raw === null) throw new Error('LLM program is not an object');
  const name = 'name' in raw ? raw.name : undefined;
  const tag = 'tag' in raw ? raw.tag : undefined;
  const perWeek = 'perWeek' in raw ? raw.perWeek : undefined;
  const blurb = 'blurb' in raw ? raw.blurb : undefined;
  const days = 'days' in raw ? raw.days : undefined;

  if (typeof name !== 'string' || name.length === 0) throw new Error('LLM program name invalid');
  if (!isProgramTag(tag)) throw new Error('LLM program tag invalid');
  if (typeof perWeek !== 'number' || !Number.isInteger(perWeek) || perWeek <= 0) {
    throw new Error('LLM program perWeek invalid');
  }
  if (typeof blurb !== 'string') throw new Error('LLM program blurb invalid');
  if (!isWorkoutDayArray(days)) throw new Error('LLM program days invalid');

  const normalized = days.map((d) => ({
    name: d.name,
    exercises: d.exercises.map((e) => ({ ...e, scheme: normalizeScheme(e.scheme) })),
  }));
  return { id, name, tag, cred: CRED, perWeek, blurb, days: normalized };
}
