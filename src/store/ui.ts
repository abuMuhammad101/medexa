import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Role } from './types';

export type Range = 'today' | 'week' | 'month';

interface UiState {
  range: Range;
  theme: 'light' | 'dark';
  role: Role;
  speed: number;
  directorOpen: boolean;
  paletteOpen: boolean;
  forcedOffline: boolean;
  locked: boolean;
  lang: 'en' | 'ar';
  toggleLang: () => void;
  setRange: (r: Range) => void;
  toggleTheme: () => void;
  setRole: (r: Role) => void;
  setSpeed: (n: number) => void;
  setDirector: (open: boolean) => void;
  setPalette: (open: boolean) => void;
  setForcedOffline: (b: boolean) => void;
  setLocked: (b: boolean) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      range: 'week',
      theme: 'light',
      role: 'Clinician',
      speed: 1,
      directorOpen: false,
      paletteOpen: false,
      forcedOffline: false,
      locked: false,
      lang: 'en',
      toggleLang: () => set((s) => ({ lang: s.lang === 'en' ? 'ar' : 'en' })),
      setRange: (range) => set({ range }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setRole: (role) => set({ role }),
      setSpeed: (speed) => set({ speed }),
      setDirector: (directorOpen) => set({ directorOpen }),
      setPalette: (paletteOpen) => set({ paletteOpen }),
      setForcedOffline: (forcedOffline) => set({ forcedOffline }),
      setLocked: (locked) => set({ locked }),
    }),
    {
      name: 'medexa-ui-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ range: s.range, theme: s.theme, role: s.role, lang: s.lang }),
    },
  ),
);

export type EditArea = 'soap' | 'billing' | 'summary' | 'patients';

/** Permissions: Clinician edits all; Coder edits billing only; Admin is read-only. */
export const canEdit = (role: Role, area: EditArea) =>
  role === 'Clinician' || (role === 'Coder' && area === 'billing');

export const readOnlyReason = (role: Role) =>
  role === 'Admin' ? 'Admin role is read-only in this demo.' : `${role} role cannot edit this section.`;
