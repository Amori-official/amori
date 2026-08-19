import { getAdminCoupons } from "@/app/actions/admin";
import CouponsAdminClient from "./coupons-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await getAdminCoupons();
  return <CouponsAdminClient coupons={coupons} />;
}
