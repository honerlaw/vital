# 029 — followups

- **Numeric per-week cadence on home (review finding F3, SUGGEST).** Removing the "Up next"
  section row (per explicit product direction) also removed the only place the home screen
  showed the raw cadence, `${program.perWeek}×/wk`. Relative weekday hints
  (`cadenceDayLabel`) still render on the upcoming list, and the numeric cadence is still on
  program detail (`N days per week`) and the program cards. If product later wants the numeric
  form back on home, add a small cadence summary line above the upcoming list — not a bug, a
  deliberate-removal note kept so a future reviewer doesn't re-raise it.
