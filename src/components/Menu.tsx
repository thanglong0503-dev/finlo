"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TimMa } from "@/components/TimMa";
import { NHOM_MENU } from "@/lib/menu";

// Trang đang mở: "/chi-so" sáng cả khi ở "/chi-so/VN30"; trang chủ chỉ sáng đúng "/"
const dangMo = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

const MuiTen = ({ len }: { len: boolean }) => (
  <svg viewBox="0 0 10 6" width="8" height="5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d={len ? "M1 5l4-4 4 4" : "M1 1l4 4 4-4"} />
  </svg>
);

// Menu máy tính: 3 nhóm trên thanh đen, rê chuột/bấm để mở bảng trang kèm mô tả
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
              <div className="absolute top-full left-0 z-40 w-80 overflow-hidden rounded-2xl border border-vien-toi bg-toi-phu p-1.5 shadow-2xl">
                {n.trang.map((t) => {
                  const dang = dangMo(pathname, t.href);
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      className={`block rounded-xl px-3.5 py-2.5 hover:bg-white/5 ${dang ? "bg-white/5" : ""}`}
                    >
                      <span className={`block font-semibold ${dang ? "text-nhan-sang" : "text-chu-toi"}`}>{t.nhan}</span>
                      <span className="block text-[12px] text-chu-toi-phu">{t.moTa}</span>
                    </Link>
                  );
                })}
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
            {NHOM_MENU.map((n) => (
              <section key={n.ten} className="mt-6">
                <p className="px-1 text-[13px] font-semibold text-chu-toi-phu">{n.ten}</p>
                <div className="mt-2 overflow-hidden rounded-2xl bg-toi-phu">
                  {n.trang.map((t) => {
                    const dang = dangMo(pathname, t.href);
                    return (
                      <Link
                        key={t.href}
                        href={t.href}
                        onClick={() => setMo(false)}
                        className={`block border-b border-vien-toi px-4 py-3 last:border-b-0 ${dang ? "bg-white/5" : ""}`}
                      >
                        <span className={`block font-semibold ${dang ? "text-nhan-sang" : "text-chu-toi"}`}>{t.nhan}</span>
                        <span className="block text-[12px] text-chu-toi-phu">{t.moTa}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
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
