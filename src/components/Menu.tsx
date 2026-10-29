"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
              {coTrangMo && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-nhan-sang" />}
            </button>
            {mo === n.ten && (
              <div className="absolute top-full left-0 z-40 w-80 border border-vien-toi border-t-2 border-t-nhan-sang bg-toi shadow-xl">
                {n.trang.map((t) => {
                  const dang = dangMo(pathname, t.href);
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      className={`block border-b border-vien-toi px-4 py-2.5 last:border-b-0 hover:bg-toi-phu ${
                        dang ? "shadow-[inset_2px_0_0_0_var(--nhan-sang)]" : ""
                      }`}
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

// Menu điện thoại: nút mở bảng toàn màn hình, trang chia theo nhóm
export function MenuDiDong() {
  const pathname = usePathname();
  const [mo, setMo] = useState(false);
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

  return (
    <>
      <button
        onClick={() => setMo((x) => !x)}
        aria-label={mo ? "Đóng menu" : "Mở menu"}
        aria-expanded={mo}
        className="flex h-9 w-9 items-center justify-center border border-vien-toi text-chu-toi-phu hover:border-nhan-sang hover:text-nhan-sang md:hidden"
      >
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          {mo ? <path d="M3 3l10 10M13 3L3 13" /> : <path d="M2 4h12M2 8h12M2 12h12" />}
        </svg>
      </button>
      {mo && (
        <div className="fixed inset-x-0 top-[60px] bottom-0 z-40 overflow-y-auto bg-toi px-4 pb-8 md:hidden">
          {NHOM_MENU.map((n) => (
            <section key={n.ten} className="mt-5">
              <p className="text-[11px] font-semibold tracking-[0.09em] text-nhan-sang uppercase">{n.ten}</p>
              <div className="mt-2 border border-vien-toi">
                {n.trang.map((t) => {
                  const dang = dangMo(pathname, t.href);
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      className={`block border-b border-vien-toi px-3 py-3 last:border-b-0 ${dang ? "bg-toi-phu" : ""}`}
                    >
                      <span className={`block font-semibold ${dang ? "text-nhan-sang" : "text-chu-toi"}`}>{t.nhan}</span>
                      <span className="block text-[12px] text-chu-toi-phu">{t.moTa}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
