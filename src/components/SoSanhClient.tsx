"use client";

import Link from "next/link";
import { useState } from "react";
import type { DongLoc } from "@/lib/bo-loc";
import { COT_SO_SANH, dinhDangCot, type Cot } from "@/lib/so-sanh";

const mauCot = (x: number | null, donVi: Cot["donVi"]) =>
  donVi === "pt" && x != null ? (x > 0 ? "text-tang" : x < 0 ? "text-giam" : "text-dung") : "";

// Bảng so sánh các mã cùng ngành: bấm tiêu đề cột để sắp xếp, mã đang xem được tô nổi
export function SoSanhClient({ ma, dong, trungVi }: { ma: string; dong: DongLoc[]; trungVi: Partial<Record<keyof DongLoc, number | null>> }) {
  const [sapXep, setSapXep] = useState<{ khoa: keyof DongLoc; giam: boolean }>({ khoa: "vonHoa", giam: true });

  const ds = [...dong].sort((a, b) => {
    const x = a[sapXep.khoa] as number | null;
    const y = b[sapXep.khoa] as number | null;
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return sapXep.giam ? y - x : x - y;
  });

  return (
    <div className="mt-4 overflow-x-auto border border-vien rounded-2xl">
      <table className="w-full min-w-[980px]">
        <thead>
          <tr className="border-b border-vien text-[12px] text-chu-phu">
            <th className="sticky left-0 z-[1] bg-nen px-3 py-2 text-left font-medium">Mã</th>
            {COT_SO_SANH.map((c) => {
              const dang = sapXep.khoa === c.khoa;
              return (
                <th key={c.khoa} className="px-3 py-2 text-right font-medium">
                  <button
                    onClick={() => setSapXep((s) => ({ khoa: c.khoa, giam: s.khoa === c.khoa ? !s.giam : true }))}
                    className={`whitespace-nowrap hover:text-chu ${dang ? "text-nhan" : ""}`}
                  >
                    {c.nhan}
                    {dang ? (sapXep.giam ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ds.map((d) => {
            const laMa = d.ma === ma;
            return (
              <tr
                key={d.ma}
                className={`border-b border-vien ${laMa ? "bg-nhan-nhat shadow-[inset_2px_0_0_0_var(--nhan)]" : "hover:bg-nen-phu"}`}
              >
                <td className={`sticky left-0 z-[1] px-3 py-2 ${laMa ? "bg-nhan-nhat" : "bg-nen"}`}>
                  <Link prefetch={false} href={`/co-phieu/${d.ma}/so-sanh`} className="font-semibold hover:text-nhan">
                    {d.ma}
                  </Link>
                  <span className="ml-2 hidden max-w-48 truncate align-bottom text-[12px] text-chu-phu xl:inline-block">
                    {d.ten}
                  </span>
                </td>
                {COT_SO_SANH.map((c) => {
                  const v = d[c.khoa] as number | null;
                  return (
                    <td key={c.khoa} className={`px-3 py-2 text-right tabular-nums ${mauCot(v, c.donVi)}`}>
                      {dinhDangCot(v, c.donVi)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="bg-toi text-chu-toi">
            <td className="sticky left-0 z-[1] bg-toi px-3 py-2 font-semibold">Trung vị ngành</td>
            {COT_SO_SANH.map((c) => (
              <td key={c.khoa} className="px-3 py-2 text-right tabular-nums">
                {c.khoa === "gia" ? "" : dinhDangCot(trungVi[c.khoa] ?? null, c.donVi)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
