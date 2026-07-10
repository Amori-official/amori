import { create } from "zustand";

type AuthTab = "login" | "signup";

interface UIStore {
  cartOpen: boolean;
  authModalOpen: boolean;
  authTab: AuthTab;
  toastMessage: string | null;
  setCartOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean, tab?: AuthTab) => void;
  showToast: (message: string, durationMs?: number) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  cartOpen: false,
  authModalOpen: false,
  authTab: "login",
  toastMessage: null,

  setCartOpen: (open) => set({ cartOpen: open }),

  setAuthModalOpen: (open, tab = "login") =>
    set({ authModalOpen: open, authTab: tab }),

  showToast: (message, durationMs = 3000) => {
    set({ toastMessage: message });
    setTimeout(() => set({ toastMessage: null }), durationMs);
  },
}));
