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
const SESSION_KEY = "amori_popup_seen";

// 외부(다른 출처) 링크인지. 내부 경로("/...")나 동일 출처 절대 URL은 false → 같은 탭에서 이동.
function isExternalLink(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false; // 상대 경로 등은 내부로 간주
  try {
    return new URL(url).host !== window.location.host;
  } catch {
    return false;
  }
}

export default function CompSitePopup(props: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // 이번 브라우징 세션에서 이미 본(닫은/이동한) 경우 다시 띄우지 않는다.
      const seen = sessionStorage.getItem(SESSION_KEY);
      if (seen === sig(props)) return;
      // '오늘 하루 보지 않기'가 유효하고 같은 내용이면 숨김.
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

  // 닫기/링크 이동 시 세션 동안 재노출 방지(페이지 이동해도 다시 안 뜨게).
  const markSeen = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, sig(props));
    } catch {
      /* 무시 */
    }
  };

  const close = () => {
    markSeen();
    setOpen(false);
  };
  const hideToday = () => {
    try {
      const until = new Date();
      until.setHours(23, 59, 59, 999);
      localStorage.setItem(KEY, JSON.stringify({ sig: sig(props), until: until.getTime() }));
    } catch {
      /* 무시 */
    }
    markSeen();
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
              // 같은 사이트(내부/동일 출처) 링크는 같은 탭에서 이동해야 '이미 봄'(sessionStorage)이
              // 유지돼 이동한 페이지에서 팝업이 다시 뜨지 않는다. 외부 사이트만 새 탭으로 연다.
              target={isExternalLink(props.linkUrl) ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={() => {
                markSeen();
                setOpen(false);
              }}
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
