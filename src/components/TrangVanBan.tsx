import Link from "next/link";
import type { ReactNode } from "react";

// Khung chung cho các trang văn bản (Giới thiệu, MCP, Đối tác, Điều khoản, Liên hệ): tiêu đề lớn, mục lục nhỏ, nội dung dễ đọc
const TRANG = [
  { href: "/gioi-thieu", nhan: "Giới thiệu" },
  { href: "/mcp", nhan: "Finlo MCP" },
  { href: "/doi-tac", nhan: "Đối tác" },
  { href: "/dieu-khoan", nhan: "Điều khoản sử dụng" },
  { href: "/lien-he", nhan: "Liên hệ" },
];

export function TrangVanBan({ duongDan, tieuDe, moTa, children }: { duongDan: string; tieuDe: string; moTa: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-nen-phu p-1 [scrollbar-width:none]">
        {TRANG.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`h-8 shrink-0 rounded-full px-4 leading-8 font-medium whitespace-nowrap ${t.href === duongDan ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
          >
            {t.nhan}
          </Link>
        ))}
      </nav>
      <h1 className="mt-8 text-[36px] leading-tight font-bold tracking-[-0.035em] sm:text-[48px]">{tieuDe}</h1>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-chu-phu">{moTa}</p>
      <div className="mt-10 space-y-10 text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}

export function Muc({ tieuDe, children }: { tieuDe: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[22px] font-bold tracking-[-0.02em]">{tieuDe}</h2>
      <div className="mt-3 space-y-3 text-chu-phu [&_b]:text-chu [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">{children}</div>
    </section>
  );
}
