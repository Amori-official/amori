"use server";

// 비회원 주문조회 — 로그인 없이 "주문번호 + 주문 시 이메일"로 본인 주문을
// 조회한다(읽기 전용). 서버 RPC lookup_guest_order가 둘 다 일치할 때만
// 상태·배송추적·주문항목을 반환한다. 취소/반품 등 변경은 제공하지 않는다.

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("http");

export type GuestOrderItem = {
  productName: string;
  variantLabel: string | null;
  quantity: number;
  price: number;
  imageUrl: string | null;
};

export type GuestOrder = {
  orderNumber: string;
  // 고객용 단일 표시 상태(주문내역과 동일 규칙)
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "shipped"
    | "delivered"
    | "completed"
    | "cancelled";
  fulfillmentStatus: string;
  returnStatus: string | null;
  courier: string | null;
  trackingNumber: string | null;
  totalAmount: number;
  recipientName: string | null;
  createdAt: string;
  items: GuestOrderItem[];
};

export type LookupResult = { ok: true; order: GuestOrder } | { ok: false; error: string };

// account.ts의 deriveOrderStatus와 동일 규칙(취소 > 구매확정 > 배송완료 > 배송중 >
// 배송준비중 > 결제완료 > 결제대기).
function deriveStatus(
  orderStatus: string,
  paymentStatus: string,
  fulfillmentStatus: string
): GuestOrder["status"] {
  if (orderStatus === "cancelled") return "cancelled";
  if (orderStatus === "completed") return "completed";
  if (fulfillmentStatus === "delivered") return "delivered";
  if (fulfillmentStatus === "shipped") return "shipped";
  if (fulfillmentStatus === "preparing") return "preparing";
  if (paymentStatus === "paid") return "confirmed";
  return "pending";
}

export async function lookupGuestOrder(orderNumber: string, email: string): Promise<LookupResult> {
  if (!IS_CONFIGURED) return { ok: false, error: "잠시 후 다시 시도해주세요." };

  const on = (orderNumber ?? "").trim();
  const em = (email ?? "").trim();
  if (!on || !em) return { ok: false, error: "주문번호와 이메일을 입력해주세요." };

  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data, error } = await supabase.rpc("lookup_guest_order", {
      p_order_number: on,
      p_email: em,
    });

    if (error) {
      // RPC가 raise한 안내 메시지(한글)는 그대로 전달하고, 그 외 내부 오류
      // (함수 누락·스키마 캐시 등)는 사용자에게 날것으로 노출하지 않는다.
      const msg = (error.message || "").replace(/^.*?:\s*/, "").trim();
      if (/[가-힣]/.test(msg)) {
        return { ok: false, error: msg };
      }
      return { ok: false, error: "주문 조회 중 문제가 발생했어요. 잠시 후 다시 시도해주세요." };
    }

    const d = data as Record<string, unknown> | null;
    if (!d || typeof d !== "object") {
      return { ok: false, error: "일치하는 주문이 없어요. 주문번호와 이메일을 다시 확인해주세요." };
    }

    const rawItems = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
    const order: GuestOrder = {
      orderNumber: String(d.order_number ?? on),
      status: deriveStatus(
        String(d.order_status ?? ""),
        String(d.payment_status ?? ""),
        String(d.fulfillment_status ?? "")
      ),
      fulfillmentStatus: String(d.fulfillment_status ?? "unfulfilled"),
      returnStatus: d.return_status ? String(d.return_status) : null,
      courier: d.courier ? String(d.courier) : null,
      trackingNumber: d.tracking_number ? String(d.tracking_number) : null,
      totalAmount: Number(d.total_amount ?? 0),
      recipientName: d.recipient_name ? String(d.recipient_name) : null,
      createdAt: String(d.created_at ?? ""),
      items: rawItems.map((i) => ({
        productName: String(i.product_name ?? ""),
        variantLabel: i.variant_label ? String(i.variant_label) : null,
        quantity: Number(i.quantity ?? 0),
        price: Number(i.price ?? 0),
        imageUrl: i.image_url ? String(i.image_url) : null,
      })),
    };
    return { ok: true, order };
  } catch {
    return { ok: false, error: "잠시 후 다시 시도해주세요." };
  }
}
