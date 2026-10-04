import { getOrders, getReviewedProductIds } from "@/app/actions/account";
import OrdersClient from "./orders-client";

export default async function OrdersPage() {
  const [orders, reviewedProductIds] = await Promise.all([
    getOrders(),
    getReviewedProductIds(),
  ]);
  return <OrdersClient orders={orders} reviewedProductIds={reviewedProductIds} />;
}
