-- Up Migration
--
-- GENERATED FILE — do not edit by hand. Regenerate with `npm run gen:programs-seed`.
-- Source of record: src/data/programs.ts. The drift-guard test asserts byte-equality.

CREATE TABLE programs (
  id         text    PRIMARY KEY,
  name       text    NOT NULL,
  tag        text    NOT NULL,
  cred       text    NOT NULL,
  per_week   integer NOT NULL,
  blurb      text    NOT NULL,
  sort_order integer NOT NULL,
  days       jsonb   NOT NULL
);

INSERT INTO programs (id, name, tag, cred, per_week, blurb, sort_order, days) VALUES
  ('bbr', 'Basic Beginner Routine', 'Full Body', 'r/Fitness wiki', 3, 'The wiki''s primary beginner program. Two workouts that alternate, three days a week, six core lifts.', 0, '[{"name":"Workout A","exercises":[{"name":"Squat","sets":3,"scheme":"3×5"},{"name":"Bench Press","sets":3,"scheme":"3×5"},{"name":"Barbell Row","sets":3,"scheme":"3×5"}]},{"name":"Workout B","exercises":[{"name":"Squat","sets":3,"scheme":"3×5"},{"name":"Overhead Press","sets":3,"scheme":"3×5"},{"name":"Deadlift","sets":1,"scheme":"1×5"}]}]'),
  ('gzclp', 'GZCLP', 'Strength', 'u/gzcl', 4, 'A tiered system — heavy T1, volume T2, isolation T3 — rotating across four sessions. The community''s go-to next step.', 1, '[{"name":"A1","exercises":[{"name":"Squat (T1)","sets":5,"scheme":"5×3+"},{"name":"Bench Press (T2)","sets":3,"scheme":"3×10"},{"name":"Lat Pulldown (T3)","sets":3,"scheme":"3×15"}]},{"name":"B1","exercises":[{"name":"Overhead Press (T1)","sets":5,"scheme":"5×3+"},{"name":"Deadlift (T2)","sets":3,"scheme":"3×10"},{"name":"DB Row (T3)","sets":3,"scheme":"3×15"}]},{"name":"A2","exercises":[{"name":"Bench Press (T1)","sets":5,"scheme":"5×3+"},{"name":"Squat (T2)","sets":3,"scheme":"3×10"},{"name":"Lat Pulldown (T3)","sets":3,"scheme":"3×15"}]},{"name":"B2","exercises":[{"name":"Deadlift (T1)","sets":5,"scheme":"5×3+"},{"name":"Overhead Press (T2)","sets":3,"scheme":"3×10"},{"name":"DB Row (T3)","sets":3,"scheme":"3×15"}]}]'),
  ('ppl', 'Reddit PPL', 'Muscle Growth', 'u/Metallicadpa', 6, 'The most-shared hypertrophy program on Reddit. Push / Pull / Legs run twice a week — heavy compounds plus high-rep accessory volume.', 2, '[{"name":"Pull","exercises":[{"name":"Deadlift","sets":1,"scheme":"1×5+"},{"name":"Barbell Row","sets":4,"scheme":"4×5"},{"name":"Lat Pulldown","sets":3,"scheme":"3×8-12"},{"name":"Face Pull","sets":5,"scheme":"5×15"},{"name":"Bicep Curl","sets":4,"scheme":"4×8-12"}]},{"name":"Push","exercises":[{"name":"Bench Press","sets":3,"scheme":"3×5+"},{"name":"Overhead Press","sets":3,"scheme":"3×8-12"},{"name":"Incline DB Press","sets":3,"scheme":"3×8-12"},{"name":"Triceps Pushdown","sets":3,"scheme":"3×8-12"},{"name":"Lateral Raise","sets":3,"scheme":"3×15"}]},{"name":"Legs","exercises":[{"name":"Squat","sets":3,"scheme":"3×5+"},{"name":"Romanian Deadlift","sets":3,"scheme":"3×8-12"},{"name":"Leg Press","sets":3,"scheme":"3×8-12"},{"name":"Leg Curl","sets":3,"scheme":"3×8-12"},{"name":"Calf Raise","sets":5,"scheme":"5×8-12"}]}]'),
  ('wendler', '5/3/1 for Beginners', 'Strength', 'Jim Wendler', 3, 'Percentage-based main lifts that step up each week. The clearest example of ''next session = next set of numbers''.', 3, '[{"name":"Day 1","exercises":[{"name":"Squat","sets":3,"scheme":"5/3/1"},{"name":"Bench Press","sets":5,"scheme":"5×5"}]},{"name":"Day 2","exercises":[{"name":"Deadlift","sets":3,"scheme":"5/3/1"},{"name":"Overhead Press","sets":5,"scheme":"5×5"}]},{"name":"Day 3","exercises":[{"name":"Bench Press","sets":3,"scheme":"5/3/1"},{"name":"Squat","sets":5,"scheme":"5×5"}]}]'),
  ('nsuns', 'nSuns LP', 'Strength', 'u/nSuns · 5-day', 5, 'A high-volume 5/3/1 offshoot famous for fast big-three progress. The advanced strength variation once linear gains slow.', 4, '[{"name":"Bench / OHP","exercises":[{"name":"Bench Press","sets":9,"scheme":"9 sets"},{"name":"Overhead Press","sets":8,"scheme":"8 sets"}]},{"name":"Squat / Sumo DL","exercises":[{"name":"Squat","sets":9,"scheme":"9 sets"},{"name":"Sumo Deadlift","sets":8,"scheme":"8 sets"}]},{"name":"OHP / Incline","exercises":[{"name":"Overhead Press","sets":9,"scheme":"9 sets"},{"name":"Incline Bench","sets":8,"scheme":"8 sets"}]},{"name":"Deadlift / Front Squat","exercises":[{"name":"Deadlift","sets":9,"scheme":"9 sets"},{"name":"Front Squat","sets":8,"scheme":"8 sets"}]},{"name":"Bench / CGBP","exercises":[{"name":"Bench Press","sets":9,"scheme":"9 sets"},{"name":"Close-Grip Bench","sets":8,"scheme":"8 sets"}]}]');

-- Down Migration

DROP TABLE programs;
