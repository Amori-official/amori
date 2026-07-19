import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/types";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  /** 담을 당시 적용된 실제 단가. sizes가 있는 상품은 선택된 사이즈의 가격, 없으면 product.price와 동일 */
  unitPrice: number;
}

interface CartStore {
  items: CartItem[];
  add: (product: Product, quantity?: number, selectedColor?: string, selectedSize?: string) => void;
  remove: (productId: string, selectedColor?: string, selectedSize?: string) => void;
  updateQty: (productId: string, quantity: number, selectedColor?: string, selectedSize?: string) => void;
  clear: () => void;
  total: () => number;
}

const isSameLine = (i: CartItem, productId: string, selectedColor?: string, selectedSize?: string) =>
  i.product.id === productId && i.selectedColor === selectedColor && i.selectedSize === selectedSize;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      add: (product, quantity = 1, selectedColor, selectedSize) => {
        const unitPrice = selectedSize
          ? (product.sizes?.find((s) => s.name === selectedSize)?.price ?? product.price)
          : product.price;
        set((state) => {
          const existing = state.items.find((i) => isSameLine(i, product.id, selectedColor, selectedSize));
          if (existing) {
            return {
              items: state.items.map((i) =>
                isSameLine(i, product.id, selectedColor, selectedSize)
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity, selectedColor, selectedSize, unitPrice }] };
        });
      },

      remove: (productId, selectedColor, selectedSize) =>
        set((state) => ({
          items: state.items.filter((i) => !isSameLine(i, productId, selectedColor, selectedSize)),
        })),

      updateQty: (productId, quantity, selectedColor, selectedSize) => {
        if (quantity <= 0) {
          get().remove(productId, selectedColor, selectedSize);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            isSameLine(i, productId, selectedColor, selectedSize) ? { ...i, quantity } : i
          ),
        }));
      },

      clear: () => set({ items: [] }),

      total: () =>
        get().items.reduce(
          (sum, i) => sum + i.unitPrice * i.quantity,
          0
        ),
    }),
    { name: "amori-cart" }
  )
);
