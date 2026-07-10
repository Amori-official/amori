export default function ProductLoading() {
  return (
    <div className="pt-[60px] min-h-screen">
      {/* 브레드크럼 */}
      <div className="px-4 sm:px-8 lg:px-16 py-4">
        <div className="h-3 w-40 bg-brand-gray-light animate-pulse" />
      </div>

      {/* 2열 그리드 */}
      <div className="px-4 sm:px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-16">
        {/* 갤러리 스켈레톤 */}
        <div className="aspect-[3/4] bg-brand-gray-light animate-pulse" />

        {/* 정보 스켈레톤 */}
        <div className="space-y-4 py-4 lg:py-10">
          <div className="h-3 w-16 bg-brand-gray-light animate-pulse" />
          <div className="h-8 w-48 bg-brand-gray-light animate-pulse" />
          <div className="h-3 w-full bg-brand-gray-light animate-pulse" />
          <div className="h-6 w-24 bg-brand-gray-light animate-pulse mt-2" />
          <div className="h-3 w-20 bg-brand-gray-light animate-pulse" />
          <div className="h-10 w-32 bg-brand-gray-light animate-pulse" />
          <div className="flex gap-2 pt-2">
            <div className="flex-1 h-12 bg-brand-gray-light animate-pulse" />
            <div className="flex-1 h-12 bg-brand-gray-light animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
