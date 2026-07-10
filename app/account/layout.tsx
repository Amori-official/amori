import AccountSidebar from "./account-sidebar";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-[60px] min-h-screen bg-brand-gray-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12">
        <h1 className="text-[12px] tracking-[0.4em] text-brand-gray-mid mb-8">MY ACCOUNT</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 items-start">
          <AccountSidebar />
          <main className="bg-white min-h-[500px]">{children}</main>
        </div>
      </div>
    </div>
  );
}
