import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  color: string;
  role: 'admin' | 'editor' | 'viewer' | 'guest';
}

interface AppState {
  currentUser: User | null;
  isOffline: boolean;
  activeDocumentId: string | null;
  setCurrentUser: (user: User | null) => void;
  setOfflineStatus: (status: boolean) => void;
  setActiveDocument: (docId: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      activeDocumentId: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      setOfflineStatus: (status) => set({ isOffline: status }),
      setActiveDocument: (docId) => set({ activeDocumentId: docId }),
    }),
    {
      name: 'syncpad-storage', // unique name
      partialize: (state) => ({ currentUser: state.currentUser }), // only persist user
    }
  )
);
