import { isProgram } from '@/data/guards/isProgram';
import { type Program } from '@/data/types';

export function isProgramArray(value: unknown): value is Program[] {
  return Array.isArray(value) && value.every(isProgram);
}
