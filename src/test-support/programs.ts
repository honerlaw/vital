/**
 * A small, representative program catalog for offline tests. Replaces the former in-memory
 * `PROGRAMS` constant (retired in 010 when Postgres became the single runtime source) as the
 * fixture for guard and reducer tests. Not imported by any app code.
 */
import { type Program } from '@/data/types';

export const SAMPLE_PROGRAMS: Program[] = [
  {
    id: 'bbr',
    name: 'Basic Beginner Routine',
    tag: 'Full Body',
    cred: 'r/Fitness wiki',
    perWeek: 3,
    blurb: 'Two alternating full-body workouts, three days a week.',
    days: [
      {
        name: 'Workout A',
        exercises: [
          { name: 'Squat', sets: 3, scheme: '3×5' },
          { name: 'Bench Press', sets: 3, scheme: '3×5' },
        ],
      },
      {
        name: 'Workout B',
        exercises: [
          { name: 'Squat', sets: 3, scheme: '3×5' },
          { name: 'Deadlift', sets: 1, scheme: '1×5' },
        ],
      },
    ],
  },
  {
    id: 'gzclp',
    name: 'GZCLP',
    tag: 'Strength',
    cred: 'u/gzcl',
    perWeek: 4,
    blurb: 'A tiered linear progression across four sessions.',
    days: [
      {
        name: 'A1',
        exercises: [{ name: 'Squat (T1)', sets: 5, scheme: '5×3+' }],
      },
    ],
  },
];
