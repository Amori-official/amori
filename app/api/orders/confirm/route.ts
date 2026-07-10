import { NextRequest, NextResponse } from "next/server";
import type { OrderItem, ShippingAddress } from "@/lib/types";

export async function POST(request: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ success: true }); // 미설정 시 스킵
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { orderId, customerName, customerEmail, items, shippingAddress, totalAmount } =
    body as {
      orderId: string;
      customerName: string;
      customerEmail: string;
      items: OrderItem[];
      shippingAddress: ShippingAddress;
      totalAmount: number;
    };

  try {
    const { Resend } = await import("resend");
    const { render } = await import("@react-email/render");
    const { OrderConfirmEmail } = await import("@/emails/order-confirm");

    const resend = new Resend(resendKey);
    const html = await render(
      OrderConfirmEmail({ orderId, customerName, items, shippingAddress, totalAmount })
    );

    await resend.emails.send({
      from: "AMORI <orders@amori.kr>",
      to: customerEmail,
      subject: `[AMORI] 주문이 확인되었습니다 — ${orderId}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "이메일 발송 실패" }, { status: 500 });
  }
}
