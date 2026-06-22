/**
 * Build the `/plan` prompt (030): ask Claude to design the adaptive intake as a typed
 * `QuestionGraph`. The output is validated by `isQuestionGraph` before the client trusts it; on
 * failure the client falls back to the deterministic fixed spine. Each line stays within the
 * 100-column source cap, so the prompt is assembled from an array of short single-quoted lines
 * (single quotes let the embedded JSON keep its double quotes unescaped).
 */
const SYSTEM_LINES = [
  'You design a short intake questionnaire for a personalized workout-program generator.',
  'Return ONLY a JSON object: { "questions": Question[] }.',
  'Each Question has: id (snake_case string), kind, prompt (string), plus the per-kind fields:',
  '  kind "single-select": options: [{ "value": string, "label": string }]',
  '  kind "multi-select":  options: [{ "value": string, "label": string }]',
  '  kind "number":        optional "min", "max" (numbers), optional "unit" (string)',
  '  kind "text":          "maxLength" (positive integer)',
  'Optional "showWhen": { "questionId": string, "equals": string } — show this question only when',
  'that earlier answer equals the value (single-equality only; for a multi-select prior answer it',
  'matches when the selection includes the value). SPINE questions omit showWhen.',
  'Always include spine questions (no showWhen) covering, with these exact ids:',
  '  primary_goal (single-select: lose fat / build muscle / get stronger / general fitness)',
  '  days_per_week (single-select: 2,3,4,5,6)',
  '  session_length (single-select: 30, 45, 60, 75+ minutes)',
  '  equipment (multi-select: barbell, dumbbells, machines, cables, bodyweight, kettlebell)',
  '  experience (single-select: beginner / intermediate / advanced)',
  '  sex (single-select: male / female / other)',
  '  bodyweight_lb (number, unit "lb"), height_in (number, unit "in")',
  '  injuries (text, maxLength 200)',
  '  current working weights (number, unit "lb") for squat, bench, deadlift, overhead press',
  'Add 2-4 BRANCH questions via showWhen (e.g. a barbell-specific question when equipment includes',
  'barbell). Keep the whole thing to 12-18 questions. Output ONLY the JSON object.',
];

export function planPrompt(): { system: string; user: string } {
  return {
    system: SYSTEM_LINES.join('\n'),
    user: 'Design the intake questionnaire now.',
  };
}
