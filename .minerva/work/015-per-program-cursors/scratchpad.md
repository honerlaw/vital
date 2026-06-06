# 015 — per-program-cursors · scratchpad

## Panel decisions 2026-06-06

- [1/3 accept → revision round] scope check: single unit affirmed by all three in prose;
  revise votes demanded three under-specs folded in (legacy-body partial-deploy window,
  finishSession gate reconciliation, stale-knowledge enumeration).
- [2/3 accept; proceeded — ≤1/3 escalation threshold not met; all six agents across both
  rounds affirmed single-unit; lone revise targeted proposal-body content] scope check
  (revised): one type-widening invariant (scalar cursor → per-program map) threaded
  through migration→routes→mapper→reducer→wrapper→screens; Arbiter independently verified
  the no-legacy-POST corruption path is unreachable in any shipped build.
- [skipped — small] approach selection: A′ (JSONB map, clean cutover + tolerant-reader
  PUT + legacy cursor field in GET for one release) strictly dominant (rejected: B —
  keep-column-synced compat shim: same coverage as A′'s tolerant reader with added
  dual-write drift; C — derive-from-history: couples cursor correctness to full-history
  fetch that pagination breaks, dead columns). Evidence: A′'s mechanics adversarially
  examined by the 6 scope-round agents; the GET-legacy-field necessity (old guard requires
  cursor:number at boot) surfaced during enumeration.
- [2/3 accept → revision round] whole-proposal: Skeptic demanded a completeness pass
  (9 items: finishSession wording, pre-reduce closure pins, wire-fn enumeration, GET
  null branch, breaking-test map, up-next read site, shared isCursorMap, down-migration
  COALESCE + immutable-comment caveat, 017 closure widened).
- [accepted (Proponent + Arbiter on fixed artifact; Skeptic's single blocking item closed
  by their own stated one-sentence condition)] whole-proposal (revised): the blocking
  catch — HYDRATE_USER_STATE persist-after-normalize must forward `action.payload.cursors`
  (pre-reduce state.cursors is the stale boot seed), while the HYDRATE_PROGRAMS site
  correctly uses pre-reduce state.cursors (its ready-guard implies user-state already
  landed) — verified by the Arbiter against the boot-order invariant (reducer line 51/53).

## Panel concerns 2026-06-06

- (proposal Skeptic, logged) finishSession.test.ts must assert the NEW contract's
  load-bearing case: a non-active finish advances its OWN key, leaves the active key
  untouched. (Folded into SC#1.)
- (proposal Skeptic, logged) first-run choose PUTs `{}` — the server row lacks the chosen
  key until the first FINISH; `?? 0` must hold end-to-end. (Folded into SC#3.)
- (scope Skeptic, logged) 017's "additive migration" framing must become
  additive-then-cutover at promote; 019's cancel-keeps-switch body claim must be
  REWRITTEN, not just linked.

## Implementation log 2026-06-06

- Implemented per proposal Approach 1–10. One environmental note (not a divergence): the
  worktree has no node_modules — npm-script binaries resolve from the main checkout via
  ancestor resolution; `npm run migrate`'s explicit relative path does not, so the SC#3
  migration test ran node-pg-migrate via the main checkout's bin. Host port 5432 is owned
  by another project's postgres (seekless), so the migration test used a THROWAWAY pg
  container on :5434 with a fresh volume (real local data untouched; container removed
  after).
- SC#3 evidence (live pg): backfill `{"bbr": 4}` / `{"gzclp": 7}` from seeded scalar rows;
  down restores 4/7 and COALESCEs a missing key to 0; re-up clean. Route SQL validated
  live: legacy PUT merge preserved siblings `{bbr:2, ppl:5}` + set `gzclp:0`; sessions CTE
  merged only `ppl:6`; first-ever finish seeded `{"bbr": 1}` with the NOT NULL active id.
- Gates: `npm test` 45/45 (4 new 015 cases: switch preserves both cursors; composite
  resumes + records switchedFrom + in-catalog guard; cancel reverts vs plain cancel;
  finishSession advances own key only). `tsc --noEmit` clean. `eslint --max-warnings 0`
  clean.
