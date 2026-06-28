import { useAuth } from '@clerk/expo';
import { useCallback } from 'react';
import { type ProgramsStatus } from '@/data/types';
import { updateEquipment } from '@/data/update-equipment';
import { useAppStore } from '@/state/useAppStore';

export interface EquipmentProfileState {
  items: string[];
  status: ProgramsStatus;
  save: (items: string[]) => Promise<void>;
}

/**
 * Read + persist the boot-hydrated equipment profile (042). `items` / `status` come from the global
 * store slice (hydrated once at boot, like the program catalog), so the routine intake can pre-fill
 * instantly with no per-screen fetch. `save` PUTs the new list and, on success, dispatches
 * `SET_EQUIPMENT` so the slice (and therefore the intake pre-fill) reflects the change without a
 * refetch. The Settings screen owns its own ephemeral editing state; this hook is the durable side.
 */
export const useEquipmentProfile = (): EquipmentProfileState => {
  const { getToken } = useAuth();
  const { state, dispatch } = useAppStore();
  const save = useCallback(
    async (items: string[]): Promise<void> => {
      const saved = await updateEquipment(getToken, items);
      dispatch({ type: 'SET_EQUIPMENT', items: saved.items });
    },
    [getToken, dispatch],
  );
  return { items: state.equipment, status: state.equipmentStatus, save };
};
