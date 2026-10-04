import { getAdminReviews } from "@/app/actions/admin";
import ReviewsAdminClient from "./reviews-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams?: { page?: string; productId?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const productId = searchParams?.productId || undefined;
  const result = await getAdminReviews({ page, productId });
  return (
    <ReviewsAdminClient
      reviews={result.reviews}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
    />
  );
}
