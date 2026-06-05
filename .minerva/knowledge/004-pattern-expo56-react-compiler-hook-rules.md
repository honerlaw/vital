# Pattern: eslint-config-expo 56 ships React-Compiler-era react-hooks rules

- Type: pattern
- Date: 2026-05-31
- Work unit: 002-ui-component-library
- Related: [[003-pattern-conforming-code-under-strict-guardrails]] (other code-author lint techniques),
  [[001-constraint-strict-eslint-guardrails]] (these rules also run at `--max-warnings 0`, so they
  are errors, not advice)

`eslint-config-expo@56` (the repo's base) bundles the modern, React-Compiler-aware `react-hooks`
plugin, and this app runs with `experiments.reactCompiler: true` in `app.json`. Two of its rules are
**stricter than the classic react-hooks rules** and will fire on the next animation or timer anyone
writes. Both are hard errors under `eslint . --max-warnings 0`. There is no inline disable (001), so
write to them.

## `react-hooks/refs` — no `.current` access during render
Reading a ref's `.current` in the render body is flagged ("Cannot access refs during render"). The
classic `const v = useRef(new Animated.Value(0)).current;` idiom for a stable mutable value now
errors. **Fix:** hold the stable value in lazy state instead —
`const [v] = useState(() => new Animated.Value(0));`. The lazy initializer runs once, the value is
stable across renders, and it is state (not a ref), so reading it in render and in `style` is fine.

## `react-hooks/set-state-in-effect` — no synchronous setState in an effect body
Calling `setState(...)` synchronously inside a `useEffect` body is flagged as cascading-render risk.
A countdown that did `if (seconds <= 0) setVisible(false);` directly in the effect errors. **Fix:**
defer every state update into an asynchronous callback (a `setTimeout`/event handler), not the
synchronous effect body. A self-scheduling countdown that works:

```ts
useEffect(() => {
  if (!visible || seconds <= 0) return;
  const id = setTimeout(() => {
    if (seconds <= 1) { setSeconds(0); setVisible(false); }  // setState in the deferred callback — OK
    else { setSeconds(seconds - 1); }
  }, 1000);
  return () => clearTimeout(id);
}, [visible, seconds]);            // `seconds` in deps → next tick reads fresh value, no stale closure
```

Putting `seconds` in the dep array (rather than a functional `setSeconds(s => s-1)`) keeps each tick
reading the current value while satisfying the rule, and is compiler-safe under `reactCompiler`.

## `react-hooks/exhaustive-deps` — a re-run-key dep must be READ inside the effect

Adding a dep purely to re-trigger an effect (a `retryCount` / `hydrateAttempt` counter the body
never reads) fires "unnecessary dependency" — a hard error under `--max-warnings 0`, like the rules
above. **Fix:** key the re-run on a value the effect genuinely consumes — typically a status field
the body guards on (`if (status !== 'loading') return;` with deps `[status]`), which is
exhaustive-deps-exact by construction. First hit in 011's catalog retry, where it forced the
status-keyed effect over a counter (see [[016-pattern-ssr-safe-startup-hydration-gate]]).
