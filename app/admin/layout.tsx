import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/app/actions/admin";
import AdminSidebar from "./admin-sidebar";

// 관리자 전용 영역. 미들웨어가 로그인 여부를 먼저 거르고(/admin 보호),
// 여기서 is_admin()으로 관리자 권한을 최종 확인한다. 비관리자는 홈으로.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isCurrentUserAdmin();
  if (!admin) redirect("/");

  return (
    <div className="pt-[60px] min-h-screen bg-brand-gray-light">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
        <h1 className="text-[14px] tracking-[0.4em] text-brand-gray-mid mb-8">ADMIN</h1>
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6 items-start">
          <AdminSidebar />
          <main className="bg-white min-h-[500px]">{children}</main>
        </div>
      </div>
    </div>
  );
}
