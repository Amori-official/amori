"use server";

import { isSupabaseConfigured, logSupabaseError } from "@/lib/supabase-config";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 방문 기록(비회원 포함). 실패해도 사용자 흐름에 영향 주지 않도록 조용히 무시.
export async function logVisit(visitorId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (typeof visitorId !== "string" || !UUID_RE.test(visitorId)) return;
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    await supabase.rpc("log_visit", { p_visitor_id: visitorId });
  } catch {
    /* 무시 */
  }
}

export interface VisitStats {
  todayUnique: number;
  todayViews: number;
  totalUnique: number;
  totalViews: number;
  daily: { day: string; unique: number; views: number }[];
}

// 방문 통계(관리자 전용). 실패 시 0으로.
export async function getVisitStats(): Promise<VisitStats> {
  const empty: VisitStats = { todayUnique: 0, todayViews: 0, totalUnique: 0, totalViews: 0, daily: [] };
  if (!isSupabaseConfigured()) return empty;
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data, error } = await supabase.rpc("admin_visit_stats");
    if (error || !data) {
      logSupabaseError("getVisitStats", error);
      return empty;
    }
    const d = data as Record<string, unknown>;
    const daily = Array.isArray(d.daily)
      ? (d.daily as Record<string, unknown>[]).map((r) => ({
          day: String(r.day ?? ""),
          unique: Number(r.unique ?? 0),
          views: Number(r.views ?? 0),
        }))
      : [];
    return {
      todayUnique: Number(d.today_unique ?? 0),
      todayViews: Number(d.today_views ?? 0),
      totalUnique: Number(d.total_unique ?? 0),
      totalViews: Number(d.total_views ?? 0),
      daily,
    };
  } catch {
    return empty;
  }
}
