"use client";

import { useEffect, useState } from "react";

interface Props {
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  linkLabel: string;
}

// 내용이 바뀌면 다시 노출되도록 내용 기반 서명.
function sig(p: Props): string {
  try {
    return btoa(encodeURIComponent(`${p.title}|${p.body}|${p.imageUrl}|${p.linkUrl}`)).slice(0, 32);
  } catch {
    return `${p.title}|${p.body}`.slice(0, 32);
  }
}

const KEY = "amori_popup_dismiss";

export default function CompSitePopup(props: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // '오늘 하루 보지 않기'가 유효하고 같은 내용이면 숨김.
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { sig?: string; until?: number };
        if (saved.sig === sig(props) && typeof saved.until === "number" && Date.now() < saved.until) {
          return;
        }
      }
    } catch {
      /* 저장소 접근 불가 시 그냥 표시 */
    }
    setOpen(true);
  }, [props]);

  if (!open) return null;

  const close = () => setOpen(false);
  const hideToday = () => {
    try {
      const until = new Date();
      until.setHours(23, 59, 59, 999);
      localStorage.setItem(KEY, JSON.stringify({ sig: sig(props), until: until.getTime() }));
    } catch {
      /* 무시 */
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative bg-white w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <button
          onClick={close}
          aria-label="닫기"
          className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center text-xl leading-none text-brand-gray-mid hover:text-brand-black bg-white/70 rounded-full"
        >
          ×
        </button>

        {props.imageUrl && (
          <div className="relative w-full bg-brand-gray-light">
            {/* 관리자가 임의 URL을 넣을 수 있어 next/image 대신 일반 img 사용 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={props.imageUrl} alt={props.title || "공지"} className="w-full h-auto block" />
          </div>
        )}

        <div className="p-6">
          {props.title && <h3 className="text-base font-medium tracking-wide mb-2">{props.title}</h3>}
          {props.body && (
            <p className="text-sm text-brand-gray-mid tracking-wide leading-6 whitespace-pre-line">
              {props.body}
            </p>
          )}

          {props.linkUrl && (
            <a
              href={props.linkUrl}
              target={/^https?:\/\//.test(props.linkUrl) ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="mt-4 block w-full h-11 leading-[2.75rem] text-center bg-brand-black text-white text-[13px] tracking-widest hover:bg-brand-gray-mid transition-colors"
            >
              {props.linkLabel || "자세히 보기"}
            </a>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-brand-border px-4 py-2.5">
          <button onClick={hideToday} className="text-[12px] text-brand-gray-mid hover:text-brand-black tracking-wide">
            오늘 하루 보지 않기
          </button>
          <button onClick={close} className="text-[12px] text-brand-gray-mid hover:text-brand-black tracking-wide">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
