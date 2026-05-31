import { LiveSession, Program } from '@/data/types';

export const startSession = (program: Program, dayIndex: number): LiveSession => ({
  programId: program.id,
  dayIndex,
  completed: program.days[dayIndex].exercises.map((e) =>
    Array.from({ length: e.sets }, () => false),
  ),
});
