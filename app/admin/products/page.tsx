import { getAdminProducts } from "@/app/actions/admin";
import ProductsAdminClient from "./products-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAdminProducts();
  return <ProductsAdminClient products={products} />;
}
