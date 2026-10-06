"use server";

import { DEFAULT_SITE_SETTINGS, type SiteSettings, type MarqueeItem } from "@/lib/site";

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("http");

function mapRow(row: Record<string, unknown>): SiteSettings {
  const rawItems = Array.isArray(row.marquee_items) ? (row.marquee_items as Record<string, unknown>[]) : [];
  const marqueeItems: MarqueeItem[] = rawItems.map((i) => ({
    text: String(i.text ?? ""),
    href: i.href ? String(i.href) : "",
    action: i.action === "signup" ? "signup" : null,
  }));
  return {
    marqueeItems,
    popupEnabled: Boolean(row.popup_enabled),
    popupTitle: row.popup_title ? String(row.popup_title) : "",
    popupBody: row.popup_body ? String(row.popup_body) : "",
    popupImageUrl: row.popup_image_url ? String(row.popup_image_url) : "",
    popupLinkUrl: row.popup_link_url ? String(row.popup_link_url) : "",
    popupLinkLabel: row.popup_link_label ? String(row.popup_link_label) : "",
    popupStartsAt: row.popup_starts_at ? String(row.popup_starts_at) : null,
    popupEndsAt: row.popup_ends_at ? String(row.popup_ends_at) : null,
  };
}

// 사이트 전역 설정(공개 읽기). 레이아웃/공지에서 사용.
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!IS_CONFIGURED) return DEFAULT_SITE_SETTINGS;
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data } = await supabase.from("site_settings").select("*").eq("id", "default").maybeSingle();
    if (!data) return DEFAULT_SITE_SETTINGS;
    return mapRow(data as Record<string, unknown>);
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}
