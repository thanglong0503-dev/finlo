import type { Metadata } from "next";
import Link from "next/link";
import { NHOM_THUAT_NGU, THUAT_NGU } from "@/lib/thuat-ngu";

export const metadata: Metadata = {
  title: "Từ điển thuật ngữ đầu tư",
  description: "Giải thích dễ hiểu các thuật ngữ chứng khoán: P/E, P/B, ROE, ROIC, DCF, WACC, NIM, CAR, nợ xấu, RSI, MACD, Fibonacci… kèm công thức, cách đọc và ví dụ bằng số liệu thật.",
};

export default function TrangThuatNgu() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-12">
      <p className="nhan-muc">Học đầu tư</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Từ điển thuật ngữ</h1>
      <p className="mt-2 max-w-3xl text-chu-phu">
        {THUAT_NGU.length} thuật ngữ thường gặp trên Finlo, mỗi mục có định nghĩa, công thức, cách đọc và ví dụ bằng số liệu thật của một doanh nghiệp niêm yết. Trên các trang Fin Rating, chữ có gạch chấm bên dưới là thuật ngữ: rê chuột để xem nhanh, bấm để đọc kỹ.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2">
        {NHOM_THUAT_NGU.map((n) => (
          <a key={n.k} href={`#${n.k}`} className="rounded-full bg-nen-noi px-4 py-1.5 text-[13px] font-semibold hover:bg-vien">
            {n.ten}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-10">
        {NHOM_THUAT_NGU.map((n) => (
          <section key={n.k} id={n.k} className="scroll-mt-28">
            <h2 className="text-xl font-bold tracking-[-0.03em]">{n.ten}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {THUAT_NGU.filter((t) => t.nhom === n.k).map((t) => (
                <Link key={t.slug} href={`/thuat-ngu/${t.slug}`} prefetch={false} className="group rounded-2xl bg-nen-phu p-4 hover:bg-nen-noi">
                  <p className="font-bold group-hover:text-nhan">{t.ten}</p>
                  {t.day && <p className="text-[12px] text-chu-phu">{t.day}</p>}
                  <p className="mt-2 text-[13px] leading-snug text-chu-phu">{t.ngan}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
