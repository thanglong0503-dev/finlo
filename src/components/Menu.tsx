"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU } from "@/lib/menu";

const dangMo = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : href.startsWith("/co-phieu") ? pathname.startsWith("/co-phieu") : pathname === href;

// Menu trên thanh đen: mục đang mở có chữ trắng và vạch xanh bên dưới
export function Menu({ diDong = false }: { diDong?: boolean }) {
  return <DanhSach pathname={usePathname()} diDong={diDong} />;
}

// Bản tĩnh (chưa biết trang hiện tại) để hiện trong lúc chờ, dùng làm fallback của Suspense
export function MenuTinh({ diDong = false }: { diDong?: boolean }) {
  return <DanhSach pathname="" diDong={diDong} />;
}

function DanhSach({ pathname, diDong }: { pathname: string; diDong: boolean }) {
  return (
    <>
      {MENU.map((m) => {
        const mo = dangMo(pathname, m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            className={`relative flex h-full items-center font-medium whitespace-nowrap ${
              mo ? "text-chu-toi" : "text-chu-toi-phu hover:text-chu-toi"
            } ${diDong ? "py-2.5" : ""}`}
          >
            {m.nhan}
            {mo && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-nhan-sang" />}
          </Link>
        );
      })}
    </>
  );
}
