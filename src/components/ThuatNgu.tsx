import Link from "next/link";
import type { ReactNode } from "react";
import { timThuatNgu } from "@/lib/thuat-ngu";

// Gắn giải thích cho một thuật ngữ: gạch chấm bên dưới, rê chuột hoặc chạm giữ hiện định nghĩa ngắn, bấm sang trang từ điển.
// Thuần CSS, không cần JavaScript phía trình duyệt.
export function ThuatNgu({ slug, children }: { slug: string; children: ReactNode }) {
  const t = timThuatNgu(slug);
  if (!t) return <>{children}</>;
  return (
    <span className="group/tn relative inline">
      <Link href={`/thuat-ngu/${t.slug}`} prefetch={false} className="underline decoration-chu-phu/60 decoration-dotted underline-offset-[3px] hover:text-nhan">
        {children}
      </Link>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-64 rounded-xl border border-vien bg-nen-noi p-3 text-left text-[12px] leading-snug font-normal text-chu opacity-0 shadow-lg transition-opacity group-focus-within/tn:visible group-focus-within/tn:opacity-100 group-hover/tn:visible group-hover/tn:opacity-100"
      >
        <span className="block font-semibold">{t.ten}</span>
        <span className="mt-1 block text-chu-phu">{t.ngan}</span>
      </span>
    </span>
  );
}
