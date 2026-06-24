# Scratchpad: usda-household-portions

## Quick decisions 2026-06-24
- [decided] scope: single additive unit — server-only enrichment of USDA `servingOptions` (one new pure helper + test, one mapper edit). No schema/migration, no type/guard/route/client change, no public-interface change. Clearly small.
- [decided] approach: parse USDA `foodMeasures[]` into `servingOptions` (dominant). Rejected: client-side density-based unit picker (needs per-food density, inaccurate, cross-cutting contract); rejected: hardcoded beverage presets (not data-driven, arbitrary).
- [decided] ordering: household portions lead by USDA `rank`, then top-level gram `servingSize`, then `100 g` base last — so default chip is a real consumer portion when USDA exposes one. Directly serves the stated goal.
- [decided] label = USDA `disseminationText` verbatim; filter `"Quantity not specified"`; dedup by label (case-insensitive); cap household portions at 6.
- [decided] whole-proposal soundness: confident — `FoodServingOption {label,grams}` unchanged, guards already validate, client renders for free, macro math (per-100g × grams) unchanged. No public interface touched. Decide directly, no escalation.

- [decided] review triage: 1 FIX applied — rank sort used `Infinity` for unranked measures, so two unranked entries hit `Infinity - Infinity = NaN` (undefined sort order). Replaced with `Number.MAX_SAFE_INTEGER` sentinel + a two-unranked regression test. Other observations (label-only dedup, rare servingSize/portion gram overlap) IGNORE — by-design, harmless.
- [decided] completion verification: all 5 success criteria met against the diff (lint/typecheck clean, 119 tests pass incl. 9 new). No divergence, no replan.
- [synthesis] refreshed overview.md (watermark 037→040; folded in 038 SSE-streaming, 038 URLSearchParams-400, 040 household-portions; link_rot empty).

## Review finding 2026-06-24
- [FIX, applied] usda-serving-options.ts: `Infinity` unranked-rank sentinel → NaN comparator for multiple unranked measures; switched to `Number.MAX_SAFE_INTEGER`, regression test added.

Ground truth (live USDA call, Doppler key): "Iced Coffee, brewed" (FNDDS) has `servingSize: null`
and `foodMeasures` = [1 fl oz/30g rank1, 1 cup (8 fl oz)/240g rank2, 1 small/360g rank3,
1 medium/480g rank4, 1 large/600g rank5, "Quantity not specified"/360g rank6]. Confirms the bug
(only "100 g" shown today) and the fix data source.
