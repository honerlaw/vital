import { type SessionLog } from '@/data/types';

export function isSessionLog(value: unknown): value is SessionLog {
  return (
    typeof value === 'object' &&
    value !== null &&
    'programId' in value &&
    typeof value.programId === 'string' &&
    'programName' in value &&
    typeof value.programName === 'string' &&
    'dayName' in value &&
    typeof value.dayName === 'string' &&
    'dateISO' in value &&
    typeof value.dateISO === 'string'
  );
}
