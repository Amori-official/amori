import { notFound } from "next/navigation";
import { getAdminOrderDetail } from "@/app/actions/admin";
import OrderDetailClient from "./order-detail-client";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getAdminOrderDetail(params.id);
  if (!order) notFound();
  return <OrderDetailClient order={order} />;
}
