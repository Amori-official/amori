"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSiteSettings } from "@/app/actions/admin";
import type { SiteSettings, MarqueeItem } from "@/lib/site";

// 저장된 ISO → datetime-local 입력값(KST 벽시계 'YYYY-MM-DDTHH:mm')
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16);
}

export default function ContentAdminClient({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [marquee, setMarquee] = useState<MarqueeItem[]>(
    initial.marqueeItems.length > 0 ? initial.marqueeItems : []
  );
  const [popupEnabled, setPopupEnabled] = useState(initial.popupEnabled);
  const [title, setTitle] = useState(initial.popupTitle);
  const [body, setBody] = useState(initial.popupBody);
  const [imageUrl, setImageUrl] = useState(initial.popupImageUrl);
  const [linkUrl, setLinkUrl] = useState(initial.popupLinkUrl);
  const [linkLabel, setLinkLabel] = useState(initial.popupLinkLabel);
  const [startsAt, setStartsAt] = useState(toLocalInput(initial.popupStartsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial.popupEndsAt));

  const updateItem = (i: number, patch: Partial<MarqueeItem>) =>
    setMarquee((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setMarquee((prev) => [...prev, { text: "", href: "", action: null }]);
  const removeItem = (i: number) => setMarquee((prev) => prev.filter((_, idx) => idx !== i));

  const save = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await updateSiteSettings({
        marqueeItems: marquee,
        popupEnabled,
        popupTitle: title,
        popupBody: body,
        popupImageUrl: imageUrl,
        popupLinkUrl: linkUrl,
        popupLinkLabel: linkLabel,
        popupStartsAt: startsAt || null,
        popupEndsAt: endsAt || null,
      });
      if (res.error) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: "저장되었습니다. (사이트 반영까지 잠시 걸릴 수 있어요)" });
        router.refresh();
      }
    });
  };

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <h2 className="text-[14px] tracking-[0.3em]">콘텐츠 관리</h2>

      {msg && (
        <p
          className={`text-[13px] tracking-wide px-3 py-2 border ${
            msg.ok ? "text-green-600 border-green-200 bg-green-50" : "text-red-500 border-red-200 bg-red-50"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* 상단 공지바 */}
      <section className="border border-brand-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] tracking-widest font-medium">상단 공지바 (롤링 문구)</p>
          <button onClick={addItem} className="h-8 px-3 border border-brand-border text-[12px] tracking-wide hover:border-brand-black">
            + 문구 추가
          </button>
        </div>
        {marquee.length === 0 && (
          <p className="text-[13px] text-brand-gray-mid">문구가 없습니다. ‘문구 추가’로 등록하세요.</p>
        )}
        <div className="space-y-2">
          {marquee.map((it, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2 border-b border-brand-border pb-2">
              <input
                value={it.text}
                onChange={(e) => updateItem(i, { text: e.target.value })}
                placeholder="문구"
                className="h-9 flex-1 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black"
              />
              <input
                value={it.href}
                onChange={(e) => updateItem(i, { href: e.target.value })}
                placeholder="링크 (선택, http.. 또는 /경로)"
                disabled={it.action === "signup"}
                className="h-9 flex-1 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black disabled:bg-brand-gray-light"
              />
              <label className="flex items-center gap-1.5 text-[12px] text-brand-gray-mid shrink-0">
                <input
                  type="checkbox"
                  checked={it.action === "signup"}
                  onChange={(e) => updateItem(i, { action: e.target.checked ? "signup" : null })}
                  className="w-4 h-4 accent-brand-black"
                />
                가입모달
              </label>
              <button onClick={() => removeItem(i)} className="h-9 px-3 text-[12px] text-red-500 border border-red-200 hover:bg-red-50 shrink-0">
                삭제
              </button>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-brand-gray-mid">‘가입모달’ 체크 시 클릭하면 회원가입 창이 열립니다(링크 무시).</p>
      </section>

      {/* 팝업 공지 */}
      <section className="border border-brand-border p-5 space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={popupEnabled} onChange={(e) => setPopupEnabled(e.target.checked)} className="w-4 h-4 accent-brand-black" />
          <span className="text-[13px] tracking-widest font-medium">팝업 공지 사용</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="제목">
            <Input value={title} onChange={setTitle} placeholder="예: 자사몰 오픈 이벤트 🎉" />
          </Field>
          <Field label="이미지 URL (선택)">
            <Input value={imageUrl} onChange={setImageUrl} placeholder="https://... 또는 /products/..." />
          </Field>
          <Field label="본문" full>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="공지 내용을 입력하세요."
              className="w-full border border-brand-border p-2 text-[13px] focus:outline-none focus:border-brand-black resize-none"
            />
          </Field>
          <Field label="버튼 링크 (선택)">
            <Input value={linkUrl} onChange={setLinkUrl} placeholder="https://... 또는 /shop" />
          </Field>
          <Field label="버튼 문구 (선택)">
            <Input value={linkLabel} onChange={setLinkLabel} placeholder="자세히 보기" />
          </Field>
          <Field label="노출 시작 (선택)">
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full h-9 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black" />
          </Field>
          <Field label="노출 종료 (선택)">
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full h-9 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black" />
          </Field>
        </div>
        <p className="text-[12px] text-brand-gray-mid">
          기간을 비우면 ‘사용’ 체크하는 동안 계속 노출됩니다. 방문자는 팝업에서 ‘오늘 하루 보지 않기’를 선택할 수 있어요.
        </p>
      </section>

      <button
        onClick={save}
        disabled={pending}
        className="px-8 h-11 bg-brand-black text-white text-[13px] tracking-widest hover:bg-brand-gray-mid transition-colors disabled:opacity-50"
      >
        {pending ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <label className="text-[11px] tracking-wide text-brand-gray-mid">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black"
    />
  );
}
