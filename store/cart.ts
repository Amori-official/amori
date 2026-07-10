import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/types";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

interface CartStore {
  items: CartItem[];
  add: (product: Product, quantity?: number, selectedColor?: string) => void;
  remove: (productId: string, selectedColor?: string) => void;
  updateQty: (productId: string, quantity: number, selectedColor?: string) => void;
  clear: () => void;
  total: () => number;
}

const isSameLine = (i: CartItem, productId: string, selectedColor?: string) =>
  i.product.id === productId && i.selectedColor === selectedColor;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      add: (product, quantity = 1, selectedColor) => {
        set((state) => {
          const existing = state.items.find((i) => isSameLine(i, product.id, selectedColor));
          if (existing) {
            return {
              items: state.items.map((i) =>
                isSameLine(i, product.id, selectedColor)
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity, selectedColor }] };
        });
      },

      remove: (productId, selectedColor) =>
        set((state) => ({
          items: state.items.filter((i) => !isSameLine(i, productId, selectedColor)),
        })),

      updateQty: (productId, quantity, selectedColor) => {
        if (quantity <= 0) {
          get().remove(productId, selectedColor);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            isSameLine(i, productId, selectedColor) ? { ...i, quantity } : i
          ),
        }));
      },

      clear: () => set({ items: [] }),

      total: () =>
        get().items.reduce(
          (sum, i) => sum + i.product.price * i.quantity,
          0
        ),
    }),
    { name: "amori-cart" }
  )
);
