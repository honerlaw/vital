# Followups: food-tracking-foundation

Forward-looking items surfaced during 032 that are out of scope for Unit 1 but worth revisiting.

- **USDA household-portion enrichment.** v1 search `servingOptions` come only from the search
  payload (always a `100 g` base + the food's own gram `servingSize` when present), so household
  portions ("1 cup", "1 medium") appear only when USDA returns a gram serving. A `/food/{fdcId}`
  detail proxy on result-selection would surface `foodPortions` for richer serving choices. Small,
  additive; deferred because the grilled plan accepted the `100 g` / enter-grams fallback for v1.

- **Units 2–4** are the planned decomposition (barcode via Open Food Facts, AI capture via the LLM,
  targets + in-vs-out dashboard). Each gets its own `minerva:propose` run; they are not seeded here.
