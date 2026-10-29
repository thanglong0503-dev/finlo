"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoMa } from "@/components/LogoMa";

// Bảng số liệu sắp xếp được theo cột (dùng cho trang ngành ngân hàng, công ty chứng khoán)
export type CotSoLieu = { khoa: string; nhan: string; kieu: "ty" | "pt" | "pt-dau"; goiY?: string };
export type DongSoLieu = { ma: string; logo?: string; so: Record<string, number | null> };

const dinhDang = (v: number | null, kieu: CotSoLieu["kieu"]) => {
  if (v == null || !Number.isFinite(v)) return "—";
  if (kieu === "ty") return Math.round(v / 1000).toLocaleString("vi-VN"); // triệu đồng -> tỷ đồng
  const s = Math.abs(v).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  if (kieu === "pt") return `${v < 0 ? "−" : ""}${s}%`;
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${s}%`;
};

export function BangSoLieu({ cot, dong, sapXepDau }: { cot: CotSoLieu[]; dong: DongSoLieu[]; sapXepDau: string }) {
  const [sx, setSx] = useState<{ khoa: string; giam: boolean }>({ khoa: sapXepDau, giam: true });
  const ds = [...dong].sort((a, b) => {
    const x = a.so[sx.khoa];
    const y = b.so[sx.khoa];
    if (x == null) return 1;
    if (y == null) return -1;
    return sx.giam ? y - x : x - y;
  });
  return (
    <div className="overflow-x-auto rounded-2xl border border-vien">
      <table className="w-full min-w-[860px]">
        <thead>
          <tr className="border-b border-vien text-[12px] text-chu-phu">
            <th className="sticky left-0 z-[1] bg-nen px-4 py-2.5 text-left font-medium">Mã</th>
            {cot.map((c) => (
              <th key={c.khoa} className="px-3 py-2.5 text-right font-medium" title={c.goiY}>
                <button
                  onClick={() => setSx((s) => ({ khoa: c.khoa, giam: s.khoa === c.khoa ? !s.giam : true }))}
                  className={`whitespace-nowrap hover:text-chu ${sx.khoa === c.khoa ? "text-nhan" : ""}`}
                >
                  {c.nhan}
                  {sx.khoa === c.khoa ? (sx.giam ? " ↓" : " ↑") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ds.map((d) => (
            <tr key={d.ma} className="border-b border-vien last:border-b-0 hover:bg-nen-phu">
              <td className="sticky left-0 z-[1] bg-nen px-4 py-2">
                <Link href={`/co-phieu/${d.ma}`} prefetch={false} className="flex items-center gap-2 font-semibold hover:text-nhan">
                  <LogoMa ma={d.ma} url={d.logo} co={22} />
                  {d.ma}
                </Link>
              </td>
              {cot.map((c) => {
                const v = d.so[c.khoa];
                return (
                  <td
                    key={c.khoa}
                    className={`px-3 py-2 text-right tabular-nums ${c.kieu === "pt-dau" && v != null ? (v > 0 ? "text-tang" : v < 0 ? "text-giam" : "") : ""}`}
                  >
                    {dinhDang(v, c.kieu)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
