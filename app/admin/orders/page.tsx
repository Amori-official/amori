import { getAdminOrders } from "@/app/actions/admin";
import OrdersAdminClient from "./orders-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { q?: string; fulfillment?: string };
}) {
  const q = searchParams?.q ?? "";
  const fulfillment = searchParams?.fulfillment ?? "";
  const orders = await getAdminOrders({ q, fulfillment });
  return <OrdersAdminClient orders={orders} initialQuery={q} initialFulfillment={fulfillment} />;
}
