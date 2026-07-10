import { getOrders } from "@/app/actions/account";
import OrdersClient from "./orders-client";

export default async function OrdersPage() {
  const orders = await getOrders();
  return <OrdersClient orders={orders} />;
}
