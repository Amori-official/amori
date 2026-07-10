import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/types";

interface WishlistStore {
  items: Product[];
  add: (product: Product) => void;
  remove: (productId: string) => void;
  has: (productId: string) => boolean;
  toggle: (product: Product) => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      add: (product) => {
        if (!get().has(product.id)) {
          set((s) => ({ items: [...s.items, product] }));
        }
      },

      remove: (productId) =>
        set((s) => ({ items: s.items.filter((p) => p.id !== productId) })),

      has: (productId) => get().items.some((p) => p.id === productId),

      toggle: (product) => {
        if (get().has(product.id)) get().remove(product.id);
        else get().add(product);
      },
    }),
    { name: "amori-wishlist" }
  )
);
