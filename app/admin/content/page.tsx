import { getSiteSettings } from "@/app/actions/site";
import ContentAdminClient from "./content-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const settings = await getSiteSettings();
  return <ContentAdminClient initial={settings} />;
}
