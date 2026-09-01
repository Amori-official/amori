import { getAdminOrders } from "@/app/actions/admin";
import OrdersAdminClient from "./orders-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { q?: string; fulfillment?: string; payment?: string; page?: string };
}) {
  const q = searchParams?.q ?? "";
  const fulfillment = searchParams?.fulfillment ?? "";
  const payment = searchParams?.payment ?? "";
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const result = await getAdminOrders({ q, fulfillment, payment, page });
  return (
    <OrdersAdminClient
      orders={result.orders}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      initialQuery={q}
      initialFulfillment={fulfillment}
      initialPayment={payment}
    />
  );
}
