import { getAdminMembers } from "@/app/actions/admin";
import MembersAdminClient from "./members-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const q = searchParams?.q ?? "";
  const members = await getAdminMembers(q);
  return <MembersAdminClient members={members} initialQuery={q} />;
}
