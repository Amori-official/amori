"use client";

import { useRouter } from "next/navigation";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "small-things", label: "Small Things" },
  { value: "fabric-goods", label: "Fabric Goods" },
  { value: "gift", label: "Gift" },
  { value: "etc", label: "etc." },
];

const SORTS = [
  { value: "new", label: "신상순" },
  { value: "popular", label: "인기순" },
  { value: "price_asc", label: "낮은가격순" },
  { value: "price_desc", label: "높은가격순" },
];

interface Props {
  category?: string;
  sort?: string;
}

export default function CompShopFilters({ category = "all", sort = "new" }: Props) {
  const router = useRouter();

  const update = (key: "category" | "sort", value: string) => {
    const params = new URLSearchParams();
    const nextCategory = key === "category" ? value : category;
    const nextSort = key === "sort" ? value : sort;

    if (nextCategory && nextCategory !== "all") params.set("category", nextCategory);
    if (nextSort && nextSort !== "new") params.set("sort", nextSort);

    const qs = params.toString();
    router.push(`/shop${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 pb-5 border-b border-brand-border">
      {/* 카테고리 탭 */}
      <div className="flex gap-0 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => update("category", cat.value)}
            className={[
              "text-[12px] tracking-widest px-4 py-2 transition-all shrink-0",
              category === cat.value
                ? "font-bold text-brand-black"
                : "font-normal text-brand-gray-mid hover:font-bold hover:text-brand-black",
            ].join(" ")}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 정렬 드롭다운 */}
      <select
        value={sort}
        onChange={(e) => update("sort", e.target.value)}
        className="text-[12px] tracking-widest border border-brand-border px-3 py-2 bg-white text-brand-black
          focus:outline-none focus:border-brand-black cursor-pointer shrink-0 self-start sm:self-auto"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
