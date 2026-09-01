import { getAdminMembers } from "@/app/actions/admin";
import MembersAdminClient from "./members-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string };
}) {
  const q = searchParams?.q ?? "";
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const result = await getAdminMembers({ q, page });
  return (
    <MembersAdminClient
      members={result.members}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      initialQuery={q}
    />
  );
}
