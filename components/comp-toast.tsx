"use client";

import { useUIStore } from "@/store/ui";

export default function CompToast() {
  const { toastMessage } = useUIStore();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
      bg-brand-fill text-brand-black text-sm px-5 py-3 rounded-full shadow-lg
      animate-in fade-in slide-in-from-bottom-4">
      {toastMessage}
    </div>
  );
}
