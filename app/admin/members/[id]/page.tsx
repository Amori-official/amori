import { notFound } from "next/navigation";
import { getAdminMemberDetail } from "@/app/actions/admin";
import MemberDetailClient from "./member-detail-client";

export const dynamic = "force-dynamic";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const member = await getAdminMemberDetail(params.id);
  if (!member) notFound();
  return <MemberDetailClient member={member} />;
}
