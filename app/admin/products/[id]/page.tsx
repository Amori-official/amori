import { notFound } from "next/navigation";
import { getAdminProductDetail } from "@/app/actions/admin";
import ProductEditClient from "./product-edit-client";

export const dynamic = "force-dynamic";

export default async function AdminProductEditPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getAdminProductDetail(params.id);
  if (!product) notFound();
  return <ProductEditClient product={product} />;
}
