import { getAdminOrders } from "@/app/actions/admin";
import OrdersAdminClient from "./orders-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();
  return <OrdersAdminClient orders={orders} />;
}
