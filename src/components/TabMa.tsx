"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const TAB = [
  { duoi: "", nhan: "Tổng quan" },
  { duoi: "/ho-so", nhan: "Hồ sơ doanh nghiệp" },
  { duoi: "/tai-chinh", nhan: "Tài chính" },
  { duoi: "/phan-tich", nhan: "Phân tích" },
  { duoi: "/ky-thuat", nhan: "Phân tích kỹ thuật" },
  { duoi: "/so-sanh", nhan: "So sánh ngành" },
  { duoi: "/noi-bo", nhan: "Giao dịch nội bộ" },
  { duoi: "/gia-dinh", nhan: "Giả định đầu tư" },
];

// Thanh tab của trang mã: dính dưới header khi cuộn, cuộn ngang trên màn hình hẹp
export function TabMa() {
  const pathname = usePathname();
  const ma = String(useParams<{ ma: string }>().ma ?? "").toUpperCase();
  const goc = `/co-phieu/${ma}`;
  const hienTai = pathname.replace(/\/co-phieu\/[^/]+/i, goc);
  return (
    <nav className="sticky top-[60px] z-10 border-b border-vien bg-nen">
      <div className="mx-auto flex max-w-6xl overflow-x-auto px-4 [scrollbar-width:none]">
        {TAB.map((t, i) => {
          const href = goc + t.duoi;
          const dang = hienTai === href;
          return (
            <Link
              key={t.duoi}
              href={href}
              aria-current={dang ? "page" : undefined}
              className={`relative shrink-0 px-3 py-3 font-semibold whitespace-nowrap first:pl-0 ${
                dang ? "text-chu" : "text-chu-phu hover:text-chu"
              }`}
            >
              {t.nhan}
              {dang && <span className={`absolute right-3 bottom-0 h-0.5 bg-nhan ${i === 0 ? "left-0" : "left-3"}`} />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TabMaCho() {
  return <div className="h-[45px] border-b border-vien" />;
}
