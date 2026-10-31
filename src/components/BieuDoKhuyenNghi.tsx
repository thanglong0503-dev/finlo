"use client";

import { useState } from "react";

// Biểu đồ cho trang Khuyến nghị CTCK: bảng điểm kèm cơ cấu kết quả, độ chính xác so với lợi nhuận,
// và số báo cáo theo tháng. Màu kết quả cố định: đạt (xanh) – hết 12 tháng (xám) – cắt lỗ (đỏ);
// xám luôn đứng giữa để xanh và đỏ không nằm cạnh nhau (khó phân biệt với người mù màu đỏ–lục).

export type DiemCtck = {
  ctck: string;
  diem: number;
  daKet: number;
  dat: number;
  catLo: number;
  hetHan: number;
  tyLeDat: number;
  vuot: number; // % vượt VN-Index bình quân
};

const so = (x: number, le = 0) => x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le });
const dau = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${so(Math.abs(x), 1)}%`;

const KET_QUA = [
  { khoa: "dat", nhan: "Đạt mục tiêu", mau: "var(--tang)" },
  { khoa: "hetHan", nhan: "Hết 12 tháng", mau: "var(--xam-bd)" },
  { khoa: "catLo", nhan: "Cắt lỗ", mau: "var(--giam)" },
] as const;

function ChuGiai() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-chu-phu">
      {KET_QUA.map((k) => (
        <span key={k.khoa} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: k.mau }} />
          {k.nhan}
        </span>
      ))}
    </div>
  );
}

// Mỗi CTCK một hàng: thanh điểm và thanh cơ cấu kết quả (100%)
export function BangDiemCtck({ ds }: { ds: DiemCtck[] }) {
  const [chon, setChon] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-vien p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">Điểm và kết quả các khuyến nghị đã kết thúc</p>
        <ChuGiai />
      </div>
      <div className="mt-3 grid grid-cols-[minmax(64px,auto)_1fr] gap-x-3 gap-y-1.5 text-[12px] sm:grid-cols-[minmax(80px,auto)_minmax(0,2fr)_minmax(0,3fr)]">
        <span />
        <span className="hidden text-chu-phu sm:block">Điểm (0–100)</span>
        <span className="text-chu-phu">Kết quả</span>
        {ds.map((x) => {
          const mo = chon === x.ctck;
          return (
            <div key={x.ctck} className={`contents ${chon && !mo ? "[&>*]:opacity-50" : ""}`}>
              <span className="truncate py-1 font-semibold" onMouseEnter={() => setChon(x.ctck)} onMouseLeave={() => setChon(null)}>
                {x.ctck}
              </span>
              <span className="hidden items-center gap-2 sm:flex" onMouseEnter={() => setChon(x.ctck)} onMouseLeave={() => setChon(null)}>
                <span className="h-3 flex-1 rounded-r bg-nen-phu">
                  <span className="block h-full rounded-r bg-nhan" style={{ width: `${x.diem}%` }} />
                </span>
                <b className="w-6 text-right tabular-nums">{x.diem}</b>
              </span>
              <span
                className="relative flex h-6 items-stretch gap-0.5 sm:h-5"
                onMouseEnter={() => setChon(x.ctck)}
                onMouseLeave={() => setChon(null)}
                aria-label={`${x.ctck}: đạt ${x.dat}, hết 12 tháng ${x.hetHan}, cắt lỗ ${x.catLo} trên ${x.daKet}`}>
                {KET_QUA.map((k) => {
                  const n = x[k.khoa];
                  const pt = x.daKet ? (n / x.daKet) * 100 : 0;
                  if (!n) return null;
                  return (
                    <span
                      key={k.khoa}
                      className="flex items-center justify-center overflow-hidden text-[11px] font-semibold text-nen tabular-nums first:rounded-l last:rounded-r"
                      style={{ width: `${pt}%`, background: k.mau }}
                    >
                      {pt >= 12 ? `${so(pt)}%` : ""}
                    </span>
                  );
                })}
                {mo && (
                  <span className="pointer-events-none absolute right-0 bottom-full z-10 mb-1 rounded-lg border border-vien bg-nen-phu px-2.5 py-1.5 text-[11px] whitespace-nowrap text-chu shadow-xl">
                    <b>{x.ctck}</b> · điểm {x.diem} · {x.daKet} khuyến nghị
                    <br />
                    Đạt {x.dat} · Hết 12 tháng {x.hetHan} · Cắt lỗ {x.catLo} · vượt VN-Index {dau(x.vuot)}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Độ chính xác (tỷ lệ đạt) so với hiệu quả (vượt VN-Index); kích thước chấm theo số khuyến nghị đã kết thúc
export function DoChinhXac({ ds }: { ds: DiemCtck[] }) {
  const [chon, setChon] = useState<DiemCtck | null>(null);
  const W = 460;
  const H = 300;
  const L = 44;
  const R = 16;
  const T = 16;
  const B = 40;
  const xMax = Math.min(100, Math.ceil(Math.max(...ds.map((d) => d.tyLeDat), 40) / 10) * 10);
  // Thang dọc theo dữ liệu (luôn có mốc 0 = ngang VN-Index), bước 5%
  const yMin = Math.min(0, Math.floor((Math.min(...ds.map((d) => d.vuot)) - 1) / 5) * 5);
  const yMax = Math.max(5, Math.ceil((Math.max(...ds.map((d) => d.vuot)) + 1) / 5) * 5);
  const x = (v: number) => L + (v / xMax) * (W - L - R);
  const y = (v: number) => T + ((yMax - v) / (yMax - yMin)) * (H - T - B);
  const nMax = Math.max(...ds.map((d) => d.daKet));
  const r = (n: number) => 4 + Math.sqrt(n / nMax) * 10;
  const vachX = Array.from({ length: xMax / 10 + 1 }, (_, i) => i * 10).filter((v) => v % (xMax > 60 ? 20 : 10) === 0);
  const buoc = yMax - yMin > 30 ? 10 : 5;
  const vachY = Array.from({ length: (yMax - yMin) / buoc + 1 }, (_, i) => yMin + i * buoc);
  // Nhãn trực tiếp cho các CTCK nhiều khuyến nghị nhất; còn lại xem khi rê chuột
  // Ưu tiên điểm cao nhất rồi tới CTCK nhiều khuyến nghị nhất; nhãn nào đè lên nhãn đã đặt thì bỏ
  const coNhan = new Set<string>();
  const daDat: { x: number; y: number; w: number }[] = [];
  const uuTien = [...[...ds].sort((a, b) => b.diem - a.diem).slice(0, 3), ...[...ds].sort((a, b) => b.daKet - a.daKet).slice(0, 4)];
  for (const d of uuTien) {
    if (coNhan.has(d.ctck)) continue;
    const nx = x(d.tyLeDat) + r(d.daKet) + 4;
    const ny = y(d.vuot);
    const w = d.ctck.length * 7.5;
    if (daDat.some((o) => Math.abs(o.y - ny) < 15 && nx < o.x + o.w && o.x < nx + w)) continue;
    daDat.push({ x: nx, y: ny, w });
    coNhan.add(d.ctck);
  }
  return (
    <div className="rounded-2xl border border-vien p-4">
      <p className="text-[13px] font-semibold">Độ chính xác và hiệu quả</p>
      <p className="mt-0.5 text-[12px] text-chu-phu">
        Càng lên trên càng thắng VN-Index, càng sang phải càng hay chạm mục tiêu. Chấm to = nhiều khuyến nghị.
      </p>
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Tỷ lệ đạt mục tiêu và mức vượt VN-Index của từng CTCK">
          {vachY.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--vien)" strokeWidth={v === 0 ? 1.5 : 1} strokeDasharray={v === 0 ? undefined : "2 4"} />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--chu-phu)">
                {v === 0 ? "0" : dau(v).replace(",0", "")}
              </text>
            </g>
          ))}
          <text x={L + 4} y={y(0) - 6} fontSize="12" fill="var(--chu-phu)">
            ngang VN-Index
          </text>
          {vachX.map((v) => (
            <text key={v} x={x(v)} y={H - B + 18} textAnchor="middle" fontSize="12" fill="var(--chu-phu)">
              {v}%
            </text>
          ))}
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize="12" fill="var(--chu-phu)">
            Tỷ lệ đạt mục tiêu
          </text>
          {[...ds]
            .sort((a, b) => b.daKet - a.daKet)
            .map((d) => (
              <g key={d.ctck} onMouseEnter={() => setChon(d)} onMouseLeave={() => setChon(null)} className="cursor-default">
                {/* Vùng bắt chuột rộng hơn chấm */}
                <circle cx={x(d.tyLeDat)} cy={y(d.vuot)} r={r(d.daKet) + 6} fill="transparent" />
                <circle
                  cx={x(d.tyLeDat)}
                  cy={y(d.vuot)}
                  r={r(d.daKet)}
                  fill={d.vuot >= 0 ? "var(--tang)" : "var(--giam)"}
                  fillOpacity={chon && chon.ctck !== d.ctck ? 0.25 : 0.75}
                  stroke="var(--nen)"
                  strokeWidth={2}
                />
              </g>
            ))}
          {/* Nhãn vẽ sau cùng để không bị chấm khác che */}
          {ds
            .filter((d) => coNhan.has(d.ctck))
            .map((d) => (
              <text
                key={d.ctck}
                x={x(d.tyLeDat) + r(d.daKet) + 4}
                y={y(d.vuot) + 4}
                fontSize="12"
                fill="var(--chu)"
                stroke="var(--nen)"
                strokeWidth={3}
                paintOrder="stroke"
                className="pointer-events-none"
              >
                {d.ctck}
              </text>
            ))}
        </svg>
        {chon && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-vien bg-nen-phu px-2.5 py-1.5 text-[11px] whitespace-nowrap shadow-xl"
            style={{
              left: `${(x(chon.tyLeDat) / W) * 100}%`,
              top: `${(y(chon.vuot) / H) * 100}%`,
              transform: `translate(${x(chon.tyLeDat) > W / 2 ? "-105%" : "5%"}, -110%)`,
            }}
          >
            <b>{chon.ctck}</b> · điểm {chon.diem}
            <br />
            Đạt {so(chon.tyLeDat)}% · vượt VN-Index {dau(chon.vuot)} · {chon.daKet} khuyến nghị
          </div>
        )}
      </div>
    </div>
  );
}

export type ThangKN = { thang: string; mua: number; giu: number; ban: number };

// Số báo cáo theo tháng, xếp chồng theo loại khuyến nghị
export function BaoCaoTheoThang({ ds }: { ds: ThangKN[] }) {
  const [chon, setChon] = useState<number | null>(null);
  const lon = Math.max(1, ...ds.map((d) => d.mua + d.giu + d.ban));
  const LOAI = [
    { khoa: "mua", nhan: "Mua", mau: "var(--tang)" },
    { khoa: "giu", nhan: "Nắm giữ", mau: "var(--xam-bd)" },
    { khoa: "ban", nhan: "Bán", mau: "var(--giam)" },
  ] as const;
  return (
    <div className="rounded-2xl border border-vien p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">Số khuyến nghị theo tháng</p>
        <div className="flex gap-4 text-[12px] text-chu-phu">
          {LOAI.map((k) => (
            <span key={k.khoa} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: k.mau }} />
              {k.nhan}
            </span>
          ))}
        </div>
      </div>
      <div className="relative mt-3 flex h-40 items-end gap-1" onMouseLeave={() => setChon(null)}>
        {ds.map((d, i) => {
          const tong = d.mua + d.giu + d.ban;
          return (
            <div key={d.thang} className="flex h-full min-w-0 flex-1 flex-col justify-end" onMouseEnter={() => setChon(i)}>
              <div className={`flex flex-col-reverse gap-0.5 ${chon != null && chon !== i ? "opacity-40" : ""}`} style={{ height: `${(tong / lon) * 100}%` }}>
                {LOAI.map((k) =>
                  d[k.khoa] ? (
                    <span key={k.khoa} className="w-full last:rounded-t-sm" style={{ flexGrow: d[k.khoa], background: k.mau }} />
                  ) : null,
                )}
              </div>
            </div>
          );
        })}
        {chon != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg border border-vien bg-nen-phu px-2.5 py-1.5 text-[11px] whitespace-nowrap shadow-xl"
            style={{ left: `${((chon + 0.5) / ds.length) * 100}%`, transform: `translateX(${chon > ds.length / 2 ? "-105%" : "5%"})` }}
          >
            <b>Tháng {ds[chon].thang}</b>: {ds[chon].mua + ds[chon].giu + ds[chon].ban} khuyến nghị
            <br />
            Mua {ds[chon].mua} · Nắm giữ {ds[chon].giu} · Bán {ds[chon].ban}
          </div>
        )}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-chu-phu">
        {ds.map((d, i) => (
          <span key={d.thang} className="min-w-0 flex-1 text-center">
            {i % 3 === 0 ? d.thang : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
