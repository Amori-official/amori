export default function ShopLoading() {
  return (
    <div className="pt-[60px] min-h-screen">
      <div className="px-4 sm:px-8 lg:px-16 pt-14 pb-8">
        {/* 헤더 스켈레톤 */}
        <div className="h-12 w-32 bg-brand-gray-light animate-pulse mb-6" />
        <div className="h-10 w-full bg-brand-gray-light animate-pulse" />
      </div>

      {/* 그리드 스켈레톤 */}
      <div className="px-4 sm:px-8 lg:px-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12 py-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] bg-brand-gray-light animate-pulse" />
            <div className="mt-3 space-y-2">
              <div className="h-3 w-24 bg-brand-gray-light animate-pulse" />
              <div className="h-3 w-32 bg-brand-gray-light animate-pulse" />
              <div className="h-4 w-16 bg-brand-gray-light animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
