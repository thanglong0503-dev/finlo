"use client";

import { useState } from "react";
import type { NhomBaoCao } from "@/lib/mofi";

export type DuLieuBang = {
  quy: string[];
  nam: string[];
  nhom: {
    nhom: NhomBaoCao;
    dong: { ten: string; cap: number; q: (number | null)[]; n: (number | null)[] }[];
  }[];
};

const TEN_NHOM: Record<NhomBaoCao, string> = {
  kqkd: "Kết quả kinh doanh",
  can_doi: "Cân đối kế toán",
  lctt: "Lưu chuyển tiền tệ",
};

// Triệu đồng -> tỷ đồng, số âm dùng dấu trừ thật
const tyDong = (trieu: number | null) => {
  if (trieu == null) return "—";
  const ty = Math.round(trieu / 1000);
  return `${ty < 0 ? "−" : ""}${Math.abs(ty).toLocaleString("vi-VN")}`;
};

export function BangBaoCao({ duLieu }: { duLieu: DuLieuBang }) {
  const [nhom, setNhom] = useState<NhomBaoCao>("kqkd");
  const [theoNam, setTheoNam] = useState(false);

  const bang = duLieu.nhom.find((x) => x.nhom === nhom);
  const ky = theoNam ? duLieu.nam : duLieu.quy;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full overflow-x-auto border border-vien">
          {duLieu.nhom.map((x) => (
            <button
              key={x.nhom}
              onClick={() => setNhom(x.nhom)}
              className={`h-9 px-4 font-medium whitespace-nowrap ${
                nhom === x.nhom ? "bg-nhan text-white" : "text-chu-phu hover:text-chu"
              }`}
            >
              {TEN_NHOM[x.nhom]}
            </button>
          ))}
        </div>
        <div className="flex border border-vien">
          {[
            { nhan: "Quý", nam: false },
            { nhan: "Năm", nam: true },
          ].map((o) => (
            <button
              key={o.nhan}
              onClick={() => setTheoNam(o.nam)}
              className={`h-9 px-4 font-medium ${theoNam === o.nam ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
            >
              {o.nhan}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto border border-vien border-t-2 border-t-nhan">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-vien text-[10px] font-bold tracking-wider text-chu-phu uppercase">
            <tr>
              <th className="sticky left-0 bg-nen px-3 py-2 text-left">Khoản mục · tỷ đồng</th>
              {ky.map((k) => (
                <th key={k} className="px-3 py-2 text-right whitespace-nowrap">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bang?.dong.map((d, i) => {
              const giaTri = theoNam ? d.n : d.q;
              const dam = d.cap <= 1;
              return (
                <tr key={`${d.ten}-${i}`} className={`border-t border-vien hover:bg-nhan-nhat ${d.cap === 0 ? "bg-nen-phu" : ""}`}>
                  <td
                    className={`sticky left-0 max-w-[260px] truncate px-3 py-2 ${d.cap === 0 ? "bg-nen-phu" : "bg-nen"} ${
                      dam ? "font-semibold" : "text-chu-phu"
                    }`}
                    style={{ paddingLeft: `${12 + Math.max(0, d.cap - 1) * 16}px` }}
                    title={d.ten}
                  >
                    {d.ten}
                  </td>
                  {giaTri.map((v, j) => (
                    <td
                      key={j}
                      className={`px-3 py-2 text-right tabular-nums ${dam ? "font-medium" : ""} ${
                        v != null && v < 0 ? "text-giam" : ""
                      }`}
                    >
                      {tyDong(v)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-chu-phu">
        Nguồn: VNDirect qua Mofi. Số liệu theo báo cáo doanh nghiệp công bố, có thể chưa kiểm toán.
      </p>
    </div>
  );
}
