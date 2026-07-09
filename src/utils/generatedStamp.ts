/**
 * An ISO timestamp as a short date + time, e.g. "JUL 9 · 2:34 PM" (046). Used on generated program
 * cards to distinguish two routines the LLM may have named identically — the time component keeps
 * same-day generations distinguishable. Rendered inside an uppercase `tag` text style.
 */
export const generatedStamp = (iso: string): string => {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
};
