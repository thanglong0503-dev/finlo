import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { HieuUngCuon } from "@/components/ChuyenDong";
import { GoiYCaiIos } from "@/components/HuongDanIos";
import { Logo } from "@/components/Logo";
import { Suspense } from "react";
import { MenuDiDong, MenuNhom } from "@/components/Menu";
import { NutGiaoDien } from "@/components/NutGiaoDien";
import { ThanhChay } from "@/components/ThanhChay";
import { TimMa } from "@/components/TimMa";
import { KICH_BAN_DAU_TRANG } from "@/lib/giao-dien-dau-trang";
import { NHOM_MENU } from "@/lib/menu";
import "./globals.css";

// Một phông cho cả chữ và số: Inter đủ dấu tiếng Việt, chữ số đều cột (tabular) cho bảng giá
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: { default: "Finlo — Nền tảng theo dõi đa lớp tài sản", template: "%s · Finlo" },
  description: "Theo dõi chứng khoán, hàng hoá, kim loại quý và tài sản số trong một nơi.",
  // Mở từ màn hình chính iPhone như một ứng dụng riêng
  appleWebApp: { capable: true, title: "Finlo", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: script đầu trang đặt data-theme trước khi React chạy
    <html lang="vi" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: KICH_BAN_DAU_TRANG }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-20 border-b border-vien-toi bg-toi/90 text-chu-toi backdrop-blur-md">
          <nav className="mx-auto flex h-[60px] max-w-7xl items-stretch gap-6 px-4">
            <Link href="/" aria-label="Finlo — trang chủ" className="flex items-center">
              <Logo nenDen={false} />
            </Link>
            {/* Menu theo nhóm: thêm trang mới chỉ dài bảng thả xuống, không dài header */}
            <Suspense fallback={<div className="hidden md:block" />}>
              <MenuNhom />
            </Suspense>
            <div className="ml-auto flex items-center gap-2">
              <TimMa nenToi className="hidden w-56 sm:block lg:w-72" />
              <Link
                href="/#cai-app"
                className="hidden h-9 items-center rounded-full bg-chu-toi px-4 font-semibold text-toi hover:bg-nhan-sang lg:flex"
              >
                Cài app
              </Link>
              <NutGiaoDien />
              <Suspense fallback={null}>
                <MenuDiDong />
              </Suspense>
            </div>
          </nav>
        </header>

        {/* Hai thành phần đọc đường dẫn hiện tại nên phải nằm trong Suspense */}
        <Suspense fallback={<div className="h-[35px] border-b border-vien bg-nen-phu" aria-hidden />}>
          <ThanhChay />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Suspense fallback={null}>
          <HieuUngCuon />
        </Suspense>
        <GoiYCaiIos />

        <footer className="group/chan border-t border-vien-toi bg-toi text-chu-toi">
          <div className="mx-auto flex max-w-7xl">
          {/* Chữ Finlo viền nét xoay dọc bên trái, chỉ hiện trên màn hình rộng */}
          <div className="hidden shrink-0 items-center border-r border-vien-toi px-6 py-10 lg:flex" aria-hidden>
            <span className="chu-vien chu-doc text-[150px] leading-none font-bold tracking-[-0.04em] select-none group-hover/chan:[-webkit-text-stroke-color:var(--nhan-sang)]">
              Finlo
            </span>
          </div>
          <div className="grid flex-1 gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-6 lg:px-10">
            <div className="lg:col-span-2">
              <Logo nenDen={false} />
              <p className="mt-3 max-w-xs text-chu-toi-phu">
                Nền tảng theo dõi đa lớp tài sản cho nhà đầu tư Việt Nam.
              </p>
              <p className="mt-4 max-w-xs text-[12px] text-chu-toi-phu">
                Dữ liệu từ Mofi, có thể trễ so với thời gian thực. Thông tin chỉ mang tính tham khảo, không phải khuyến
                nghị đầu tư.
              </p>
            </div>
            {NHOM_MENU.map((n) => (
              <div key={n.ten}>
                <p className="font-semibold">{n.ten}</p>
                <ul className="mt-3 space-y-2">
                  {n.trang.map((m) => (
                    <li key={m.href}>
                      <Link href={m.href} className="text-chu-toi-phu hover:text-chu-toi">
                        {m.nhan}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          </div>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-vien-toi px-4 py-4 text-chu-toi-phu">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/gioi-thieu" className="hover:text-chu-toi">
              Giới thiệu
            </Link>
            <Link href="/dieu-khoan" className="hover:text-chu-toi">
              Điều khoản
            </Link>
            <Link href="/lien-he" className="hover:text-chu-toi">
              Liên hệ
            </Link>
            </div>
            <span>
              © 2026 Finlo ·{" "}
              <a href="mailto:finlo.admin@gmail.com" className="hover:text-chu-toi">
                finlo.admin@gmail.com
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
