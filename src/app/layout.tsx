import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Suspense } from "react";
import { Menu, MenuTinh } from "@/components/Menu";
import { NutGiaoDien } from "@/components/NutGiaoDien";
import { TimMa } from "@/components/TimMa";
import { KICH_BAN_DAU_TRANG } from "@/lib/giao-dien-dau-trang";
import { MENU } from "@/lib/menu";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Finlo — Nền tảng theo dõi đa lớp tài sản", template: "%s · Finlo" },
  description: "Theo dõi chứng khoán, hàng hoá, kim loại quý và tài sản số trong một nơi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: script đầu trang đặt data-theme trước khi React chạy
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: KICH_BAN_DAU_TRANG }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-20 bg-toi text-chu-toi">
          <nav className="mx-auto flex h-[60px] max-w-7xl items-center gap-8 px-4">
            <Link href="/" aria-label="Finlo — trang chủ">
              <Logo nenDen={false} />
            </Link>
            <div className="hidden h-full items-center gap-5 xl:flex">
              <Suspense fallback={<MenuTinh />}>
                <Menu />
              </Suspense>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <TimMa nenToi className="w-36 sm:w-52" />
              <NutGiaoDien />
            </div>
          </nav>
          {/* Màn hình nhỏ hơn 1280px: menu cuộn ngang dưới thanh logo */}
          <div className="flex gap-5 overflow-x-auto border-t border-vien-toi px-4 xl:hidden">
            <Suspense fallback={<MenuTinh diDong />}>
              <Menu diDong />
            </Suspense>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-toi text-chu-toi">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
            <div>
              <Logo nenDen={false} />
              <p className="mt-3 max-w-xs text-chu-toi-phu">
                Nền tảng theo dõi đa lớp tài sản cho nhà đầu tư Việt Nam.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.09em] text-nhan-sang uppercase">Sản phẩm</p>
              <ul className="mt-3 space-y-2">
                {MENU.map((m) => (
                  <li key={m.href}>
                    <Link href={m.href} className="text-chu-toi-phu hover:text-chu-toi">
                      {m.nhan}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.09em] text-nhan-sang uppercase">Lưu ý</p>
              <p className="mt-3 text-chu-toi-phu">
                Dữ liệu từ Mofi, có thể trễ so với thời gian thực. Thông tin chỉ mang tính tham khảo, không phải khuyến
                nghị đầu tư.
              </p>
            </div>
          </div>
          <div className="border-t border-vien-toi py-4 text-center text-chu-toi-phu">
            © 2026 Finlo · finlo.id.vn
          </div>
        </footer>
      </body>
    </html>
  );
}
