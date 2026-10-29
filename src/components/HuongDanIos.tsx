"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// iPhone không cho trang web tự bật hộp cài đặt: chỉ cài được bằng Chia sẻ → "Thêm vào MH chính".
// Bảng này hướng dẫn từng bước có hình, tuỳ trình duyệt đang dùng.

export type TrinhDuyetIos = "safari" | "chrome" | "khac" | "trong-app";

export function nhanTrinhDuyetIos(ua: string): TrinhDuyetIos {
  if (/FBAN|FBAV|Instagram|Zalo|Line\/|TikTok|musical_ly|Messenger/i.test(ua)) return "trong-app";
  if (/CriOS/.test(ua)) return "chrome";
  if (/FxiOS|EdgiOS|OPiOS/.test(ua)) return "khac";
  return "safari";
}

export const laIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

// ---- Hình minh hoạ nhỏ (vẽ bằng SVG) ----

const NutChiaSe = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0A84FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" />
  </svg>
);

const NutThem = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

// Thanh dưới của Safari, nút Chia sẻ được tô sáng
function HinhThanhSafari() {
  return (
    <div className="flex items-center justify-around rounded-2xl bg-[#1c1c1e] px-4 py-3 text-[#8e8e93]">
      <span className="text-[18px]">‹</span>
      <span className="text-[18px]">›</span>
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#0A84FF]/20 ring-2 ring-[#0A84FF]">
        <NutChiaSe />
      </span>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M5 4h11l3 3v13H5z" />
      </svg>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <rect x="4" y="4" width="11" height="11" rx="2" />
        <rect x="9" y="9" width="11" height="11" rx="2" />
      </svg>
    </div>
  );
}

// Một dòng trong bảng Chia sẻ của iPhone, dòng "Thêm vào MH chính" được tô sáng
function HinhBangChiaSe() {
  return (
    <div className="overflow-hidden rounded-2xl bg-[#1c1c1e] text-[14px] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[#8e8e93]">
        Sao chép
        <span className="h-4 w-4 rounded border border-current" />
      </div>
      <div className="flex items-center justify-between bg-[#0A84FF]/20 px-4 py-2.5 font-semibold ring-2 ring-inset ring-[#0A84FF]">
        Thêm vào MH chính
        <NutThem />
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 text-[#8e8e93]">
        Thêm vào Mục ưa thích
        <span className="text-[15px]">☆</span>
      </div>
    </div>
  );
}

function HinhNutThemGocPhai() {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#1c1c1e] px-4 py-3 text-[14px]">
      <span className="text-[#0A84FF]">Huỷ</span>
      <span className="font-semibold text-white">Thêm vào MH chính</span>
      <span className="rounded-full bg-[#0A84FF] px-3 py-0.5 font-semibold text-white">Thêm</span>
    </div>
  );
}

function Buoc({ so, tieuDe, children }: { so: number; tieuDe: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nhan text-[13px] font-bold text-white">{so}</span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="font-semibold">{tieuDe}</p>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </li>
  );
}

function NutChepLink() {
  const [daChep, setDaChep] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText("https://www.finlo.id.vn/").then(() => setDaChep(true));
      }}
      className="h-10 rounded-full bg-nen-noi px-4 font-semibold"
    >
      {daChep ? "Đã chép liên kết" : "Chép liên kết finlo.id.vn"}
    </button>
  );
}

const khongDoi = () => () => {};

export function BangHuongDanIos({ dong }: { dong: () => void }) {
  const trinhDuyet = useSyncExternalStore(khongDoi, () => nhanTrinhDuyetIos(navigator.userAgent), () => "safari" as TrinhDuyetIos);

  // Esc để đóng; khoá cuộn trang phía sau
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && dong();
    window.addEventListener("keydown", esc);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = cu;
    };
  }, [dong]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={dong}>
      <div
        role="dialog"
        aria-label="Cài Finlo trên iPhone"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-vien bg-nen-phu p-6 pb-8 text-chu sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-black">
              <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden>
                <path d="M9 10h17v6h-11v5h8v5h-8v12h-6z" fill="#FFFFFF" />
                <path d="M28 10h6v22h6v6h-12z" fill="#19C26B" />
              </svg>
            </span>
            <div>
              <p className="text-[17px] font-bold">Cài Finlo lên iPhone</p>
              <p className="text-[13px] text-chu-phu">Mất khoảng 10 giây, không cần App Store</p>
            </div>
          </div>
          <button onClick={dong} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nen-noi">
            <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {trinhDuyet === "trong-app" ? (
          <ol className="mt-6 space-y-5">
            <Buoc so={1} tieuDe="Bạn đang xem trong Zalo/Facebook. Hãy mở bằng Safari">
              <p className="text-[13px] text-chu-phu">
                Bấm nút <b className="text-chu">•••</b> ở góc màn hình, chọn <b className="text-chu">Mở bằng trình duyệt</b>{" "}
                hoặc <b className="text-chu">Mở trong Safari</b>. Hoặc chép liên kết rồi dán vào Safari:
              </p>
              <div className="mt-3">
                <NutChepLink />
              </div>
            </Buoc>
            <Buoc so={2} tieuDe="Trong Safari, mở lại hướng dẫn này bằng nút Cài ứng dụng" />
          </ol>
        ) : (
          <ol className="mt-6 space-y-6">
            <Buoc
              so={1}
              tieuDe={
                trinhDuyet === "chrome" ? (
                  <>
                    Bấm nút Chia sẻ <span className="inline-block align-middle"><NutChiaSe /></span> ở góc trên bên phải, cạnh thanh địa chỉ
                  </>
                ) : (
                  <>
                    Bấm nút Chia sẻ <span className="inline-block align-middle"><NutChiaSe /></span> ở thanh dưới Safari
                  </>
                )
              }
            >
              {trinhDuyet === "safari" && (
                <>
                  <HinhThanhSafari />
                  <p className="mt-2 text-[12px] text-chu-phu">
                    Không thấy nút? Bấm vào thanh địa chỉ hoặc nút <b className="text-chu">•••</b> để hiện ra.
                  </p>
                </>
              )}
            </Buoc>
            <Buoc so={2} tieuDe={<>Kéo xuống, chọn &quot;Thêm vào MH chính&quot;</>}>
              <HinhBangChiaSe />
            </Buoc>
            <Buoc so={3} tieuDe={<>Bấm &quot;Thêm&quot; ở góc trên bên phải</>}>
              <HinhNutThemGocPhai />
              <p className="mt-2 text-[12px] text-chu-phu">Biểu tượng FL sẽ hiện trên màn hình chính, mở như một ứng dụng.</p>
            </Buoc>
          </ol>
        )}

        <button onClick={dong} className="mt-7 h-12 w-full rounded-full bg-chu font-semibold text-nen">
          Đã hiểu
        </button>
      </div>

      {/* Mũi tên nhún chỉ xuống nút Chia sẻ ở giữa thanh dưới Safari (chỉ trên iPhone dùng Safari) */}
      {trinhDuyet === "safari" && (
        <div className="pointer-events-none fixed bottom-1 left-1/2 hidden -translate-x-1/2 animate-bounce text-white max-sm:block" aria-hidden>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v15M6 13l6 6 6-6" />
          </svg>
        </div>
      )}
    </div>,
    document.body,
  );
}

// ---- Thanh gợi ý nhỏ cho người dùng iPhone chưa cài (ẩn hẳn sau khi bấm đóng) ----

const KHOA_AN = "finlo-an-goi-y-ios";

function nenHien() {
  try {
    if (localStorage.getItem(KHOA_AN)) return false;
  } catch {
    // không đọc được bộ nhớ: vẫn hiện
  }
  return laIos() && !matchMedia("(display-mode: standalone)").matches;
}

export function GoiYCaiIos() {
  const hienBanDau = useSyncExternalStore(khongDoi, nenHien, () => false);
  const [daDong, setDaDong] = useState(false);
  const [moBang, setMoBang] = useState(false);
  if (!hienBanDau || daDong) return moBang ? <BangHuongDanIos dong={() => setMoBang(false)} /> : null;

  const an = () => {
    setDaDong(true);
    try {
      localStorage.setItem(KHOA_AN, "1");
    } catch {
      // bỏ qua
    }
  };

  return (
    <>
      <div className="fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-2xl border border-vien bg-nen-phu/95 p-3 shadow-2xl backdrop-blur-md sm:hidden">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black">
          <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
            <path d="M9 10h17v6h-11v5h8v5h-8v12h-6z" fill="#FFFFFF" />
            <path d="M28 10h6v22h6v6h-12z" fill="#19C26B" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">Cài Finlo lên màn hình chính</p>
          <p className="text-[12px] text-chu-phu">Mở nhanh như ứng dụng</p>
        </div>
        <button
          onClick={() => {
            setMoBang(true);
            an();
          }}
          className="h-9 shrink-0 rounded-full bg-chu px-4 text-[13px] font-semibold text-nen"
        >
          Xem cách
        </button>
        <button onClick={an} aria-label="Ẩn gợi ý" className="shrink-0 px-1 text-chu-phu">
          <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {moBang && <BangHuongDanIos dong={() => setMoBang(false)} />}
    </>
  );
}
