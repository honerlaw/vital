/**
 * VITAL — AI routine generator wire contracts (030).
 *
 * These are the typed shapes that cross the LLM trust boundary. The server validates every LLM
 * response against the matching guard (`@/data/guards`) before it is trusted — a malformed
 * response 400s (strict-writer, 028). The intake is an ADAPTIVE STRUCTURED flow: a one-shot
 * `/plan` call returns a `QuestionGraph` the client renders as native controls (never a chat),
 * walks deterministically (branches via `showWhen`), and the collected `IntakeSpec` feeds the
 * one-shot `/generate` call. `/refine` re-runs generation with knob deltas; the client owns the
 * draft and re-sends the full spec on every call, so the server stays stateless.
 */
import { type Program } from '@/data/types';

/** One choice in a select question. */
export interface QuestionOption {
  value: string;
  label: string;
}

/**
 * A branch condition (030): show this question only when a prior answer equals `equals`. A
 * single-equality grammar by design — NOT an arbitrary expression evaluator — so the guard can
 * validate it and the client can evaluate it against the live answer map. Spine questions omit it.
 */
export interface ShowCondition {
  questionId: string;
  equals: string;
}

/**
 * One intake question, a discriminated union on `kind`. The client renders each kind as a native
 * control: a single/multi chip group, a numeric stepper/field, or a capped free-text field. The
 * LLM planner emits these; a `text` question is the only place free-form input enters, and its
 * value is delimited as data + length-capped before it ever reaches a generation prompt.
 */
export type Question =
  | {
      id: string;
      kind: 'single-select';
      prompt: string;
      options: QuestionOption[];
      showWhen?: ShowCondition;
    }
  | {
      id: string;
      kind: 'multi-select';
      prompt: string;
      options: QuestionOption[];
      showWhen?: ShowCondition;
    }
  | {
      id: string;
      kind: 'number';
      prompt: string;
      min?: number;
      max?: number;
      unit?: string;
      showWhen?: ShowCondition;
    }
  | {
      id: string;
      kind: 'text';
      prompt: string;
      maxLength: number;
      showWhen?: ShowCondition;
    };

/** The ordered plan returned by `/plan` (030): spine questions first, branches interleaved. */
export interface QuestionGraph {
  questions: Question[];
}

/**
 * One captured answer. `value` shape follows the question kind (string / string[] / number).
 * `label` is the question's prompt text, denormalized into the answer so the persisted spec is
 * self-describing — the generator reads readable Q&A pairs, and a refine replays the same spec
 * verbatim (no answer-to-question remapping).
 */
export interface IntakeAnswer {
  questionId: string;
  label: string;
  value: string | string[] | number;
}

/** The full set of answers — input to `/generate` and persisted alongside the saved program. */
export interface IntakeSpec {
  answers: IntakeAnswer[];
}

/**
 * A structured re-prompt "knob" (030). Button-driven refinement, never free-form chat. `emphasize`
 * and `swap-equipment` carry a small bounded payload; the rest are pure directives.
 */
export type RoutineKnob =
  | { kind: 'more-volume' }
  | { kind: 'less-time' }
  | { kind: 'emphasize'; muscleGroup: string }
  | { kind: 'swap-equipment'; note: string };

/**
 * The generated program. Structurally a `Program` whose exercises carry optional `progression`
 * metadata; the server assigns a uuid `id` at generation so a draft is stable before it is saved.
 */
export type GeneratedProgram = Program;

/** `POST /api/me/routine/generate` request body. */
export interface GenerateRequest {
  spec: IntakeSpec;
}

/** `POST /api/me/routine/refine` request body — full spec + the knob deltas to apply. */
export interface RefineRequest {
  spec: IntakeSpec;
  knobs: RoutineKnob[];
}

/** `POST /api/me/programs` request body — persist a generated draft with the spec that made it. */
export interface SaveProgramRequest {
  program: GeneratedProgram;
  spec: IntakeSpec;
}
