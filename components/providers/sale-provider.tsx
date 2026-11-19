"use client";

import { createContext, useContext } from "react";

// 전역 세일 상태(활성 여부 + 라벨). 레이아웃에서 서버 계산값을 주입한다.
// 상품별 세일가는 Product.salePrice에 있고, 실제 적용 여부는 active로 판단.
type SaleState = { active: boolean; label: string };

const SaleContext = createContext<SaleState>({ active: false, label: "" });

export function SaleProvider({
  value,
  children,
}: {
  value: SaleState;
  children: React.ReactNode;
}) {
  return <SaleContext.Provider value={value}>{children}</SaleContext.Provider>;
}

export function useSale(): SaleState {
  return useContext(SaleContext);
}
