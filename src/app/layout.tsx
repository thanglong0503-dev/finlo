import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Finlo — Lo trọn tài sản trong một nơi", template: "%s · Finlo" },
  description: "Theo dõi chứng khoán, hàng hoá, kim loại quý và tài sản số trong một nơi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-20 border-b border-vien bg-nen/90 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
            <Link href="/" className="text-xl font-extrabold tracking-tight">
              fin<span className="text-nhan">lo</span>
            </Link>
            <Link href="/bang-gia" className="text-sm text-chu-phu hover:text-chu">
              Bảng giá
            </Link>
            <Link href="/co-phieu/VNM" className="hidden text-sm text-chu-phu hover:text-chu sm:block">
              Biểu đồ
            </Link>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-vien py-6 text-center text-xs text-chu-phu">
          © 2026 Finlo · Nguồn dữ liệu: Mofi · Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.
        </footer>
      </body>
    </html>
  );
}
