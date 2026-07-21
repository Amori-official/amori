import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/types";
import { resolveVariant, isSplitAxisProduct } from "@/lib/resolve-variant";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  /** 담을 당시 적용된 실제 단가. sizes가 있는 상품은 선택된 사이즈의 가격, 없으면 product.price와 동일 */
  unitPrice: number;
  /**
   * 선택된 색상/사이즈 조합에 대응하는 실제 DB variant UUID (product.variants에서 결정).
   * 옵션이 없는 상품은 null. variant_id가 없는(=undefined) 항목은 이 필드 추가 이전에
   * 저장된 legacy 항목이며, 상품명/옵션명으로 추측하지 않고 주문 불가로 취급한다
   * (lib/resolve-variant.ts의 isCartItemOrderable 참고).
   */
  variantId: string | null;
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
        // 최종 방어선: UI 호출부가 실수로 담기를 시도하더라도 여기서 한 번 더 막는다.
        // - split-axis 상품(색상 전용 + 사이즈 전용 variant만 있고 조합형 variant가 없음)은
        //   DB 정비 전까지 절대 담지 않는다.
        // - variant가 있는 상품인데 선택 조합에 대응하는 variant가 없거나 비활성이면 담지 않는다.
        if (isSplitAxisProduct(product.variants)) return;

        const hasVariants = (product.variants?.length ?? 0) > 0;
        const resolved = resolveVariant(product.variants, selectedColor, selectedSize);
        if (hasVariants && (!resolved || !resolved.isActive)) return;

        const unitPrice = selectedSize
          ? (product.sizes?.find((s) => s.name === selectedSize)?.price ?? product.price)
          : product.price;
        // variant_id는 항상 product.variants(실제 DB 목록)에서 조합을 매칭해 결정한다 — 추측 금지.
        const variantId = resolved?.id ?? null;
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
          return { items: [...state.items, { product, quantity, selectedColor, selectedSize, unitPrice, variantId }] };
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
