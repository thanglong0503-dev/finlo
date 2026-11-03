"use client";

import { useMemo, useState } from "react";
import { BieuDoDuong } from "@/components/BieuDoDuong";
import { diem, mauTangGiam, phanTram } from "@/lib/dinh-dang";

export type ChuoiChiSo = { ma: string; ten: string; diem: { time: number; value: number }[] };

const KY = [
  { ten: "1 tháng", so: 21 },
  { ten: "3 tháng", so: 63 },
  { ten: "6 tháng", so: 126 },
  { ten: "1 năm", so: 250 },
];
const NUT = "h-7 shrink-0 rounded-full px-3 text-[12px] font-medium";
const dinhDang = (x: number) => diem(x);

// Đường đóng cửa của một chỉ số, chọn chỉ số và độ dài kỳ
export function BieuDoChiSo({ ds }: { ds: ChuoiChiSo[] }) {
  const [ma, datMa] = useState(ds[0]?.ma);
  const [so, datSo] = useState(63);
  const cs = ds.find((x) => x.ma === ma) ?? ds[0];
  const duong = useMemo(() => [{ ten: cs?.ten ?? "", diem: cs?.diem.slice(-so) ?? [] }], [cs, so]);
  const diemKy = duong[0].diem;
  if (diemKy.length < 2) return null;
  const cuoi = diemKy[diemKy.length - 1].value;
  const trongKy = (cuoi / diemKy[0].value - 1) * 100;
  return (
    <div className="flex flex-col p-3">
      <div className="flex flex-wrap items-center gap-1">
        {ds.map((x) => (
          <button key={x.ma} type="button" onClick={() => datMa(x.ma)} className={`${NUT} ${x.ma === cs.ma ? "bg-nen-noi text-chu" : "text-chu-phu hover:text-chu"}`}>
            {x.ten}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-vien sm:block" />
        {KY.map((k) => (
          <button key={k.so} type="button" onClick={() => datSo(k.so)} className={`${NUT} ${k.so === so ? "bg-nen-noi text-chu" : "text-chu-phu hover:text-chu"}`}>
            {k.ten}
          </button>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 px-1">
        <span className="so text-[28px] leading-none font-bold">{diem(cuoi)}</span>
        <span className={`so text-[13px] ${mauTangGiam(trongKy)}`}>{phanTram(trongKy)}</span>
        <span className="text-[12px] text-chu-phu">trong kỳ</span>
      </p>
      <div className="mt-2">
        <BieuDoDuong key={`${cs.ma}${so}`} duong={duong} dinhDang={dinhDang} cao={300} />
      </div>
    </div>
  );
}
