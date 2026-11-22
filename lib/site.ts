// 사이트 콘텐츠 설정(팝업 공지 + 상단 공지바) 공용 타입/기본값 — 서버 액션 파일 밖.

export interface MarqueeItem {
  text: string;
  href: string;
  action: "signup" | null;
}

export interface SiteSettings {
  marqueeItems: MarqueeItem[];
  popupEnabled: boolean;
  popupTitle: string;
  popupBody: string;
  popupImageUrl: string;
  popupLinkUrl: string;
  popupLinkLabel: string;
  popupStartsAt: string | null;
  popupEndsAt: string | null;
  // 배송비 설정(관리자 조정) — create_order RPC와 동일한 기본값.
  freeShippingThreshold: number;
  shippingBaseFee: number;
  shippingRemoteFee: number;
  // 전품목 기간 세일(상품별 세일가는 products.sale_price). 토글 + 기간 + 라벨.
  saleEnabled: boolean;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  saleLabel: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  marqueeItems: [],
  popupEnabled: false,
  popupTitle: "",
  popupBody: "",
  popupImageUrl: "",
  popupLinkUrl: "",
  popupLinkLabel: "",
  popupStartsAt: null,
  popupEndsAt: null,
  freeShippingThreshold: 50000,
  shippingBaseFee: 3000,
  shippingRemoteFee: 6000,
  saleEnabled: false,
  saleStartsAt: null,
  saleEndsAt: null,
  saleLabel: "",
};

// 세일을 지금 적용해야 하는지(토글 ON + 기간 내). create_order RPC와 동일 규칙.
export function isSaleActive(s: SiteSettings, now: number = Date.now()): boolean {
  if (!s.saleEnabled) return false;
  if (s.saleStartsAt && new Date(s.saleStartsAt).getTime() > now) return false;
  if (s.saleEndsAt && new Date(s.saleEndsAt).getTime() < now) return false;
  return true;
}

// 세일 적용 결과(할인율 %방식). 활성이고 할인율이 1~100이면 각 가격에 적용.
// 서버 create_order와 동일하게 round(정가 × (100-%) / 100)로 반올림한다.
export function effectivePrice(
  basePrice: number,
  salePercent: number | null | undefined,
  saleActive: boolean
): { price: number; original: number; onSale: boolean } {
  if (saleActive && salePercent != null && salePercent > 0 && salePercent <= 100) {
    const price = Math.round((basePrice * (100 - salePercent)) / 100);
    if (price < basePrice) return { price, original: basePrice, onSale: true };
  }
  return { price: basePrice, original: basePrice, onSale: false };
}

// 팝업을 지금 노출해야 하는지(활성 + 기간 내).
export function isPopupActive(s: SiteSettings, now: number = Date.now()): boolean {
  if (!s.popupEnabled) return false;
  if (!s.popupTitle && !s.popupBody && !s.popupImageUrl) return false;
  if (s.popupStartsAt && new Date(s.popupStartsAt).getTime() > now) return false;
  if (s.popupEndsAt && new Date(s.popupEndsAt).getTime() < now) return false;
  return true;
}
