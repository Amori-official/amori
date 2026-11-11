import type { Metadata } from "next";
import OrderLookupClient from "./order-lookup-client";

export const metadata: Metadata = {
  title: "비회원 주문조회",
  description: "주문번호와 주문 시 입력한 이메일로 주문상태와 배송을 조회할 수 있습니다.",
  robots: { index: false, follow: false },
};

export default function OrderLookupPage() {
  return <OrderLookupClient />;
}
