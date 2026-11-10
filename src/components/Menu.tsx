"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TimMa } from "@/components/TimMa";
import { MENU, NHOM_MENU } from "@/lib/menu";

// Trang đang mở: "/chi-so" sáng cả khi ở "/chi-so/VN30"; trang chủ chỉ sáng đúng "/"
const khop = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

// Chỉ mục khớp dài nhất được sáng: ở "/bang-gia/vn30" thì sáng "Bảng giá VN30", không sáng cả "Bảng giá"
const dangMo = (pathname: string, href: string) =>
  khop(pathname, href) && !MENU.some((t) => t.href.length > href.length && khop(pathname, t.href));

const MuiTen = ({ len }: { len: boolean }) => (
  <svg viewBox="0 0 10 6" width="8" height="5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d={len ? "M1 5l4-4 4 4" : "M1 1l4 4 4-4"} />
  </svg>
);

// Menu máy tính: các nhóm trên thanh đen, rê chuột/bấm để mở bảng nhiều cột (mỗi cột một chủ đề, trang kèm mô tả ngắn)
export function MenuNhom() {
  const pathname = usePathname();
  const [mo, setMo] = useState<string | null>(null);
  const hen = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const khung = useRef<HTMLDivElement>(null);

  // Đổi trang thì đóng bảng (điều chỉnh state ngay khi vẽ)
  const [trangTruoc, setTrangTruoc] = useState(pathname);
  if (trangTruoc !== pathname) {
    setTrangTruoc(pathname);
    setMo(null);
  }

  useEffect(() => {
    if (!mo) return;
    const dong = (e: MouseEvent) => !khung.current?.contains(e.target as Node) && setMo(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMo(null);
    document.addEventListener("mousedown", dong);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", dong);
      document.removeEventListener("keydown", esc);
    };
  }, [mo]);

  // Rời chuột thì chờ một chút mới đóng, để kịp di chuyển xuống bảng
  const vao = (ten: string) => {
    clearTimeout(hen.current);
    setMo(ten);
  };
  const ra = () => {
    clearTimeout(hen.current);
    hen.current = setTimeout(() => setMo(null), 150);
  };

  return (
    <div ref={khung} className="hidden h-full items-stretch gap-1 md:flex" onMouseLeave={ra}>
      {NHOM_MENU.map((n) => {
        const coTrangMo = n.trang.some((t) => dangMo(pathname, t.href));
        return (
          <div key={n.ten} className="relative flex" onMouseEnter={() => vao(n.ten)}>
            <button
              onClick={() => setMo((x) => (x === n.ten ? null : n.ten))}
              aria-expanded={mo === n.ten}
              className={`relative flex items-center gap-1.5 px-3 font-medium ${
                coTrangMo || mo === n.ten ? "text-chu-toi" : "text-chu-toi-phu hover:text-chu-toi"
              }`}
            >
              {n.ten}
              <MuiTen len={mo === n.ten} />
              {coTrangMo && <span className="absolute inset-x-3 bottom-3 h-0.5 rounded-full bg-nhan-sang" />}
            </button>
            {mo === n.ten && (
              // Bảng nhiều cột kiểu OKX/TradingView: rộng ra thay vì dài xuống. Header có làm mờ nền nên "fixed" ở đây
              // tính theo khung header, bảng luôn nằm giữa và không tràn khỏi màn hình.
              <div
                className="fixed top-full left-1/2 z-40 grid w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 gap-x-2 rounded-2xl border border-vien-toi bg-toi-phu p-3 shadow-2xl"
                style={{ gridTemplateColumns: `repeat(${n.cot.length}, minmax(0, 15.5rem))` }}
              >
                {n.cot.map((c) => (
                  <div key={c.ten} className="min-w-0">
                    <p className="px-3 pt-1 pb-1.5 text-[12px] font-semibold text-chu-toi-phu">{c.ten}</p>
                    {c.trang.map((t) => {
                      const dang = dangMo(pathname, t.href);
                      return (
                        <Link
                          key={t.href}
                          href={t.href}
                          aria-current={dang ? "page" : undefined}
                          className={`block rounded-xl px-3 py-2 hover:bg-white/5 ${dang ? "bg-white/5" : ""}`}
                        >
                          <span className={`block font-semibold ${dang ? "text-nhan-sang" : "text-chu-toi"}`}>{t.nhan}</span>
                          <span className="line-clamp-2 block text-[12px] leading-snug text-chu-toi-phu">{t.moTa}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Menu điện thoại: nút kính lúp và nút 3 gạch mở cùng một bảng toàn màn hình (ô tìm kiếm ở trên, trang chia theo nhóm).
// Bảng được gắn thẳng vào <body>: header có hiệu ứng làm mờ nền nên phần tử "fixed" bên trong sẽ bị giới hạn trong header.
export function MenuDiDong() {
  const pathname = usePathname();
  const [mo, setMo] = useState<false | "menu" | "tim">(false);
  const [trangTruoc, setTrangTruoc] = useState(pathname);
  if (trangTruoc !== pathname) {
    setTrangTruoc(pathname);
    setMo(false);
  }

  // Khoá cuộn trang phía sau khi bảng đang mở
  useEffect(() => {
    if (!mo) return;
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = cu;
    };
  }, [mo]);

  const nut = "flex h-9 w-9 items-center justify-center rounded-full bg-toi-phu text-chu-toi-phu hover:text-chu-toi md:hidden";

  return (
    <>
      <button onClick={() => setMo((x) => (x ? false : "tim"))} aria-label="Tìm mã" className={`${nut} sm:hidden`}>
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="7" cy="7" r="4.8" />
          <path d="m10.5 10.5 3.5 3.5" strokeLinecap="round" />
        </svg>
      </button>
      <button
        onClick={() => setMo((x) => (x ? false : "menu"))}
        aria-label={mo ? "Đóng menu" : "Mở menu"}
        aria-expanded={!!mo}
        className={nut}
      >
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          {mo ? <path d="M3 3l10 10M13 3L3 13" /> : <path d="M2 4h12M2 8h12M2 12h12" />}
        </svg>
      </button>
      {mo &&
        createPortal(
          <div className="fixed inset-x-0 top-[60px] bottom-0 z-40 overflow-y-auto bg-toi px-4 pt-4 pb-10 text-chu-toi md:hidden">
            <TimMa nenToi phimTat={false} tuDongChon={mo === "tim"} className="w-full" />
            {/* Mỗi nhóm thu gọn được; nhóm chứa trang đang mở thì mở sẵn. Trong nhóm chỉ hiện tên trang cho ngắn. */}
            <div className="mt-4 space-y-2">
              {NHOM_MENU.map((n) => (
                <details
                  key={n.ten}
                  open={n.trang.some((t) => dangMo(pathname, t.href))}
                  className="group overflow-hidden rounded-2xl bg-toi-phu"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-semibold [&::-webkit-details-marker]:hidden">
                    {n.ten}
                    <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-chu-toi-phu transition-transform group-open:rotate-180" aria-hidden>
                      <path d="M1 1l4 4 4-4" />
                    </svg>
                  </summary>
                  <div className="space-y-3 px-2 pb-3">
                    {n.cot.map((c) => (
                      <div key={c.ten}>
                        <p className="px-2 pb-1 text-[12px] text-chu-toi-phu">{c.ten}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {c.trang.map((t) => {
                            const dang = dangMo(pathname, t.href);
                            return (
                              <Link
                                key={t.href}
                                href={t.href}
                                onClick={() => setMo(false)}
                                aria-current={dang ? "page" : undefined}
                                className={`flex min-h-11 items-center rounded-xl px-3 py-2 text-[14px] leading-tight font-medium ${dang ? "bg-white/10 text-nhan-sang" : "bg-white/[0.03] text-chu-toi"}`}
                              >
                                {t.nhan}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
            <Link
              href="/#cai-app"
              onClick={() => setMo(false)}
              className="mt-6 flex h-12 items-center justify-center rounded-full bg-chu-toi font-semibold text-toi"
            >
              Cài ứng dụng Finlo
            </Link>
          </div>,
          document.body,
        )}
    </>
  );
}
