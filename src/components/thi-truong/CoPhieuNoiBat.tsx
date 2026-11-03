"use client";

import Link from "next/link";
import { useState } from "react";
import { giaNghin, mauTangGiam, phanTram, trieuDong, tyDong } from "@/lib/dinh-dang";

export type DongNoiBat = { ma: string; ten: string; gia: number; pt: number; gt: number; nn: number | null; mau: string };

const THE = [
  { k: "tang", ten: "Tăng mạnh" },
  { k: "giam", ten: "Giảm mạnh" },
  { k: "thanhKhoan", ten: "Thanh khoản" },
  { k: "nnMua", ten: "NN mua" },
  { k: "nnBan", ten: "NN bán" },
] as const;
export type KhoaNoiBat = (typeof THE)[number]["k"];

// Bảng cổ phiếu nổi bật của phiên, chọn tiêu chí bằng thẻ
export function CoPhieuNoiBat({ bang }: { bang: Record<KhoaNoiBat, DongNoiBat[]> }) {
  const [the, datThe] = useState<KhoaNoiBat>("tang");
  const laNN = the === "nnMua" || the === "nnBan";
  return (
    <>
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] border-b border-vien px-3 py-2">
        {THE.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => datThe(t.k)}
            className={`h-7 shrink-0 rounded-full px-3 text-[12px] font-medium ${t.k === the ? "bg-nen-noi text-chu" : "text-chu-phu hover:text-chu"}`}
          >
            {t.ten}
          </button>
        ))}
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-vien text-left text-[11px] text-chu-phu">
            <th className="px-3 py-1.5 font-medium">Mã</th>
            <th className="px-2 py-1.5 text-right font-medium">Giá</th>
            <th className="px-2 py-1.5 text-right font-medium">%</th>
            <th className="px-3 py-1.5 text-right font-medium">{laNN ? "NN ròng" : "GTGD"}</th>
          </tr>
        </thead>
        <tbody>
          {bang[the].map((d) => (
            <tr key={d.ma} className="border-b border-vien last:border-b-0 hover:bg-nen-noi">
              <td className="w-full max-w-0 px-3 py-1.5">
                <Link prefetch={false} href={`/co-phieu/${d.ma}`} className="flex items-baseline gap-2">
                  <span className="font-semibold">{d.ma}</span>
                  <span className="min-w-0 truncate text-[11px] text-chu-phu">{d.ten}</span>
                </Link>
              </td>
              <td className={`so px-2 py-1.5 text-right ${d.mau}`}>{giaNghin(d.gia)}</td>
              <td className={`so px-2 py-1.5 text-right ${d.mau}`}>{phanTram(d.pt)}</td>
              <td className={`so px-3 py-1.5 text-right whitespace-nowrap ${laNN ? mauTangGiam(d.nn ?? 0) : ""}`}>
                {laNN ? trieuDong(Math.abs(d.nn ?? 0)) : tyDong(d.gt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
