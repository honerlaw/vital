# Pattern: URLSearchParams encodes spaces as `+` — some gateways 400 it; build query strings with `encodeURIComponent`

> ⚠ **SUPERSEDED by [[039-pattern-usda-gateway-intermittent-400-post-fix]] (2026-06-24).** The
> core diagnosis below is **wrong**. The USDA 400 is **not** deterministic and **not** caused by
> the `+`-vs-`%20` space encoding — it is an **intermittent (~50%) load-balanced flake** at USDA's
> `api.data.gov` gateway, triggered by the parenthesized `dataType=Survey (FNDDS)` value in *any*
> encoding (`%20%28` and raw `(` both flake). The single-row bisect table below was sampled
> single-shot and got lucky 200s — re-running each row ×12 shows ~50% 400s. The `encodeURIComponent`
> URL builder this entry recommends was deleted in 039; the durable fix is **POST with a JSON body**.
> The one still-correct lesson here — *single-shot live verification is insufficient* — is carried
> forward (and corrected) in 039. Kept for the audit trail of the second failed fix.

- Type: pattern
- Date: 2026-06-24
- Work unit: 038-usda-search-space-encoding
- Superseded-by: [[039-pattern-usda-gateway-intermittent-400-post-fix]]
- Related: [[036-pattern-food-tracking-foundation]] (the USDA `/api/me/food-search` proxy whose
  request URL this fixes)

## The gotcha
`URLSearchParams.toString()` serializes a space as `+` (the `application/x-www-form-urlencoded`
rule), not `%20`. That is spec-correct for form bodies, but some upstream HTTP gateways reject the
resulting query string. USDA FoodData Central's **nginx** gateway returns a **400 Bad Request** for
the `+%28` sequence specifically — the `+`-encoded space immediately followed by an encoded `(`.

The `dataType=Survey (FNDDS)` value triggered it: `URLSearchParams` produced
`dataType=Survey+%28FNDDS%29` → nginx 400. Bisected live, one variable at a time:

| Query-string fragment | USDA status |
|---|---|
| `dataType=Survey+%28FNDDS%29` (`+` space) | **400** |
| `dataType=Survey%20%28FNDDS%29` (`%20` space) | 200 |
| `dataType=Survey (FNDDS)` (raw) | 200 |
| `query=a+%28b%29` (isolated `+%28`) | **400** |
| `query=a%20%28b%29` | 200 |
| `dataType=SR+Legacy` (plain `+`, no adjacent paren) | 200 |
| `dataType=Foundation%2CSR+Legacy` (comma `%2C`) | 200 |

So plain `+` alone is fine; the rejected token is `+` adjacent to `%28`. The robust fix is simply
to never emit `+` for spaces.

## The fix
Assemble the query string by hand with `encodeURIComponent` (which emits `%20` for spaces and
leaves `(` `)` raw — both accepted by USDA), instead of `URLSearchParams`. See
`src/server/build-usda-search-url.ts`. The builder is pure (no fetch / no env read) so the
URL-shape contract is unit-testable; the regression test pins **no `+` in the output**.

## Why the first fix missed it (process lesson)
The original 032 hotfix (commit `4bae14e`) blamed the comma-joined `dataType` value (`%2C` after
encoding) and switched to repeated params — but `%2C` is harmless (USDA returns 200 for it). It
kept the `+`-space encoding, so the 400, and the 502 it caused on every search, survived. Its test
only asserted "no `%2C`", so it passed against a still-broken URL. The miss came from fixing a
hypothesis that was never verified against the live seam. **CI never hits the live USDA API** (the
known untested seam), so neither the bug nor the bad fix was caught automatically — the URL-shape
unit test is the closest available guard.

## Scope
As of 038, `buildUsdaSearchUrl` is the only `URLSearchParams`-based query-string builder in `src/`
(other outbound calls are POSTs with JSON bodies). If another GET-with-query proxy is added against
a strict gateway, prefer the manual `encodeURIComponent` form for the same reason.
