-- Up Migration
--
-- Rebuild the Reddit PPL catalog entry as the canonical 6-day Metallicadpa A/B program (041).
-- The seed's source-of-record is the migration SQL itself (the TS generator was retired in 010,
-- see knowledge 015), and an applied migration is immutable — so this is a NEW migration that
-- UPDATEs the row rather than an edit to 1780279974623_create-programs.sql.
--
-- The original seed modeled PPL as a 3-day rotation (Pull/Push/Legs) with abbreviated exercise
-- lists and `per_week: 6` — inconsistent (6 training days, 3 rotation days) and missing the
-- accessory volume the real program prescribes. The true program runs Pull/Push/Legs twice with
-- the main barbell lift ALTERNATING between the A and B session (Deadlift↔Barbell Row on pull,
-- Bench↔OHP on push), which is why it's six distinct rotation days. `per_week` stays 6 (now
-- consistent). History rows are self-contained (program/day/scheme denormalized at finish, 022),
-- so previously-logged PPL sessions are unaffected by this catalog change.
--
-- Multi-set main lifts use a two-part display scheme ("4×5, 1×5+" = 4 straight sets then 1 AMRAP),
-- with `sets` = the total working-set count startSession seeds.

UPDATE programs SET days = '[{"name":"Pull A","exercises":[{"name":"Deadlift","sets":1,"scheme":"1×5+"},{"name":"Lat Pulldown","sets":3,"scheme":"3×8-12"},{"name":"Seated Cable Row","sets":3,"scheme":"3×8-12"},{"name":"Face Pull","sets":5,"scheme":"5×15-20"},{"name":"Hammer Curl","sets":4,"scheme":"4×8-12"},{"name":"Dumbbell Curl","sets":4,"scheme":"4×8-12"}]},{"name":"Push A","exercises":[{"name":"Bench Press","sets":5,"scheme":"4×5, 1×5+"},{"name":"Overhead Press","sets":3,"scheme":"3×8-12"},{"name":"Incline DB Press","sets":3,"scheme":"3×8-12"},{"name":"Triceps Pushdown","sets":3,"scheme":"3×8-12"},{"name":"Lateral Raise","sets":3,"scheme":"3×15-20"},{"name":"Overhead Triceps Extension","sets":3,"scheme":"3×8-12"}]},{"name":"Legs A","exercises":[{"name":"Squat","sets":3,"scheme":"2×5, 1×5+"},{"name":"Romanian Deadlift","sets":3,"scheme":"3×8-12"},{"name":"Leg Press","sets":3,"scheme":"3×8-12"},{"name":"Leg Curl","sets":3,"scheme":"3×8-12"},{"name":"Calf Raise","sets":5,"scheme":"5×8-12"}]},{"name":"Pull B","exercises":[{"name":"Barbell Row","sets":5,"scheme":"4×5, 1×5+"},{"name":"Lat Pulldown","sets":3,"scheme":"3×8-12"},{"name":"Seated Cable Row","sets":3,"scheme":"3×8-12"},{"name":"Face Pull","sets":5,"scheme":"5×15-20"},{"name":"Hammer Curl","sets":4,"scheme":"4×8-12"},{"name":"Dumbbell Curl","sets":4,"scheme":"4×8-12"}]},{"name":"Push B","exercises":[{"name":"Overhead Press","sets":5,"scheme":"4×5, 1×5+"},{"name":"Bench Press","sets":3,"scheme":"3×8-12"},{"name":"Incline DB Press","sets":3,"scheme":"3×8-12"},{"name":"Triceps Pushdown","sets":3,"scheme":"3×8-12"},{"name":"Lateral Raise","sets":3,"scheme":"3×15-20"},{"name":"Overhead Triceps Extension","sets":3,"scheme":"3×8-12"}]},{"name":"Legs B","exercises":[{"name":"Squat","sets":3,"scheme":"2×5, 1×5+"},{"name":"Romanian Deadlift","sets":3,"scheme":"3×8-12"},{"name":"Leg Press","sets":3,"scheme":"3×8-12"},{"name":"Leg Curl","sets":3,"scheme":"3×8-12"},{"name":"Calf Raise","sets":5,"scheme":"5×8-12"}]}]'::jsonb
WHERE id = 'ppl';

-- Down Migration
--
-- Restore the original 3-day seed verbatim from 1780279974623_create-programs.sql.

UPDATE programs SET days = '[{"name":"Pull","exercises":[{"name":"Deadlift","sets":1,"scheme":"1×5+"},{"name":"Barbell Row","sets":4,"scheme":"4×5"},{"name":"Lat Pulldown","sets":3,"scheme":"3×8-12"},{"name":"Face Pull","sets":5,"scheme":"5×15"},{"name":"Bicep Curl","sets":4,"scheme":"4×8-12"}]},{"name":"Push","exercises":[{"name":"Bench Press","sets":3,"scheme":"3×5+"},{"name":"Overhead Press","sets":3,"scheme":"3×8-12"},{"name":"Incline DB Press","sets":3,"scheme":"3×8-12"},{"name":"Triceps Pushdown","sets":3,"scheme":"3×8-12"},{"name":"Lateral Raise","sets":3,"scheme":"3×15"}]},{"name":"Legs","exercises":[{"name":"Squat","sets":3,"scheme":"3×5+"},{"name":"Romanian Deadlift","sets":3,"scheme":"3×8-12"},{"name":"Leg Press","sets":3,"scheme":"3×8-12"},{"name":"Leg Curl","sets":3,"scheme":"3×8-12"},{"name":"Calf Raise","sets":5,"scheme":"5×8-12"}]}]'::jsonb
WHERE id = 'ppl';
