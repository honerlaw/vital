/**
 * Deterministic fixed-spine intake (030) — the fallback question graph used when `POST /plan`
 * fails or the LLM is unavailable. Mirrors the spine the planner is asked to produce (same ids),
 * with no branch questions, so the wizard always has something to render and `/generate` always
 * receives a usable spec. Pure data — no LLM involved.
 *
 * Equipment is NO LONGER a question here (042): it comes from the user's saved equipment profile
 * and is injected into the spec by the intake screen (with an inline, pre-filled override editor),
 * so neither the spine nor the planner asks about it.
 */
import { type QuestionGraph } from '@/data/routine-types';

export const FIXED_SPINE: QuestionGraph = {
  questions: [
    {
      id: 'primary_goal',
      kind: 'single-select',
      prompt: 'What is your primary goal?',
      options: [
        { value: 'lose_fat', label: 'Lose fat' },
        { value: 'build_muscle', label: 'Build muscle' },
        { value: 'get_stronger', label: 'Get stronger' },
        { value: 'general_fitness', label: 'General fitness' },
      ],
    },
    {
      id: 'days_per_week',
      kind: 'single-select',
      prompt: 'How many days per week can you train?',
      options: [
        { value: '2', label: '2 days' },
        { value: '3', label: '3 days' },
        { value: '4', label: '4 days' },
        { value: '5', label: '5 days' },
        { value: '6', label: '6 days' },
      ],
    },
    {
      id: 'session_length',
      kind: 'single-select',
      prompt: 'How long can each session be?',
      options: [
        { value: '30', label: '30 min' },
        { value: '45', label: '45 min' },
        { value: '60', label: '60 min' },
        { value: '75+', label: '75+ min' },
      ],
    },
    {
      id: 'experience',
      kind: 'single-select',
      prompt: 'How experienced are you with lifting?',
      options: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
      ],
    },
    {
      id: 'sex',
      kind: 'single-select',
      prompt: 'What is your sex?',
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Prefer not to say' },
      ],
    },
    { id: 'bodyweight_lb', kind: 'number', prompt: 'Your bodyweight?', min: 0, unit: 'lb' },
    { id: 'height_in', kind: 'number', prompt: 'Your height?', min: 0, unit: 'in' },
    {
      id: 'injuries',
      kind: 'text',
      prompt: 'Any injuries or limitations? (optional)',
      maxLength: 200,
    },
    {
      id: 'squat_lb',
      kind: 'number',
      prompt: 'Current squat working weight? (optional)',
      unit: 'lb',
    },
    {
      id: 'bench_lb',
      kind: 'number',
      prompt: 'Current bench working weight? (optional)',
      unit: 'lb',
    },
    {
      id: 'deadlift_lb',
      kind: 'number',
      prompt: 'Current deadlift working weight? (optional)',
      unit: 'lb',
    },
    {
      id: 'ohp_lb',
      kind: 'number',
      prompt: 'Current overhead press working weight? (optional)',
      unit: 'lb',
    },
  ],
};
