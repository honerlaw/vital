# 012 — followups

Forward work deliberately deferred out of this unit.

## T1 — SC#3 manual attestation (release gate on PR; pointer)

The five-scenario authed end-to-end attestation could not run in-unit (host port 5432 was held
by an unrelated container; a real Clerk sign-in is required). **The exact steps live in the PR
body** — attest there. Scenarios: new-user GET defaults; finish → atomic POST visible in DB;
program switch → PUT; sign-out/in restores state; app restart restores history.

## T2 — Per-program cursor memory (product change)

Switching programs and back loses your place (cursor resets to 0 on switch, and 012 persists
that reset — current semantics, deliberately). Restoring a per-program cursor changes in-app
semantics and needs an **additive** migration (per-(user, program) cursor rows). See
[[017-pattern-per-user-state-persistence]].

## T3 — Offline-durable write queue

v1 write-through is best-effort fire-and-forget: an offline FINISH_WORKOUT followed by an app
kill before reconnect drops that session. A durable queue (retry on reconnect) closes it.

## T4 — AsyncStorage offline cache

Rejected as the primary store (rationale in 012's proposal Why); still viable as a cache layer
so a cold launch can render last-known state before the network round-trip.

## T5 — History pagination

`GET /api/me/state` returns the full history; fine at current volumes, paginate when it isn't.
