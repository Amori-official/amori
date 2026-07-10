import ProfileClient from "./profile-client";

async function getUserData() {
  const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("http");
  if (!IS_CONFIGURED) {
    return { name: "", phone: "", marketingAgreed: false, email: "" };
  }
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    return {
      name: String(user?.user_metadata?.name ?? ""),
      phone: String(user?.user_metadata?.phone ?? ""),
      marketingAgreed: Boolean(user?.user_metadata?.marketing_agreed),
      email: String(user?.email ?? ""),
    };
  } catch {
    return { name: "", phone: "", marketingAgreed: false, email: "" };
  }
}

export default async function ProfilePage() {
  const userData = await getUserData();
  return <ProfileClient {...userData} />;
}
