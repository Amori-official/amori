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
};

// 팝업을 지금 노출해야 하는지(활성 + 기간 내).
export function isPopupActive(s: SiteSettings, now: number = Date.now()): boolean {
  if (!s.popupEnabled) return false;
  if (!s.popupTitle && !s.popupBody && !s.popupImageUrl) return false;
  if (s.popupStartsAt && new Date(s.popupStartsAt).getTime() > now) return false;
  if (s.popupEndsAt && new Date(s.popupEndsAt).getTime() < now) return false;
  return true;
}
