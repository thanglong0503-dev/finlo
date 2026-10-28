import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Link from "next/link";
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

const MENU = [
  { href: "/", nhan: "Thị trường" },
  { href: "/bang-gia", nhan: "Chứng khoán" },
  { href: "/tai-san-so", nhan: "Tài sản số" },
  { href: "/kim-loai-quy", nhan: "Kim loại quý" },
  { href: "/co-phieu/VNM", nhan: "Phân tích" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-20 border-b border-vien bg-nen">
          <nav className="mx-auto flex h-[60px] max-w-6xl items-center gap-8 px-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Fin<span className="text-nhan">lo</span>
            </Link>
            <div className="hidden items-center gap-6 sm:flex">
              {MENU.map((m) => (
                <Link key={m.href} href={m.href} className="font-medium text-chu-phu hover:text-chu">
                  {m.nhan}
                </Link>
              ))}
            </div>
            <Link
              href="/bang-gia"
              className="ml-auto flex h-9 items-center bg-chu px-4 font-semibold text-nen hover:opacity-90"
            >
              Mở bảng giá
            </Link>
          </nav>
          {/* Điện thoại: menu cuộn ngang dưới thanh logo */}
          <div className="flex gap-5 overflow-x-auto border-t border-vien px-4 sm:hidden">
            {MENU.map((m) => (
              <Link key={m.href} href={m.href} className="py-2.5 font-medium whitespace-nowrap text-chu-phu">
                {m.nhan}
              </Link>
            ))}
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-vien">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
            <div>
              <div className="text-lg font-bold tracking-tight">
                Fin<span className="text-nhan">lo</span>
              </div>
              <p className="mt-2 max-w-xs text-chu-phu">Nền tảng theo dõi đa lớp tài sản cho nhà đầu tư Việt Nam.</p>
            </div>
            <div>
              <p className="nhan-muc">Sản phẩm</p>
              <ul className="mt-3 space-y-2">
                {MENU.map((m) => (
                  <li key={m.href}>
                    <Link href={m.href} className="text-chu-phu hover:text-chu">
                      {m.nhan}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="nhan-muc">Lưu ý</p>
              <p className="mt-3 text-chu-phu">
                Dữ liệu từ Mofi, có thể trễ so với thời gian thực. Thông tin chỉ mang tính tham khảo, không phải khuyến
                nghị đầu tư.
              </p>
            </div>
          </div>
          <div className="border-t border-vien py-4 text-center text-chu-phu">© 2026 Finlo</div>
        </footer>
      </body>
    </html>
  );
}
