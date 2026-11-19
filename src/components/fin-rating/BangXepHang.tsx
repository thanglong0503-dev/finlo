"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// Bảng xếp hạng dùng chung cho Fin Rating, cổ phiếu cổ tức và xếp hạng định giá:
// lọc theo sàn, ngành, thanh khoản, một ngưỡng số riêng của từng trang; sắp xếp theo cột; hiện dần 50 dòng.

export type KieuCot = "diem" | "gia" | "pt" | "pt-dau" | "lan" | "ty" | "nam" | "so";
export type CotXH = { khoa: string; nhan: string; kieu: KieuCot; goiY?: string; anDiDong?: boolean };
export type DongXH = { ma: string; ten: string; san: string; nganh: string | null; so: Record<string, number | null> };
export type LocSo = { khoa: string; nhan: string; muc: { gt: number; nhan: string }[]; macDinh: number };

const so = (x: number, le: number) => x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le });

function dinhDang(v: number | null | undefined, kieu: KieuCot) {
  if (v == null || !Number.isFinite(v)) return "—";
  switch (kieu) {
    case "diem":
      return so(v, 2);
    case "gia":
      return so(v / 1000, 2);
    case "pt":
      return `${so(v, 1)}%`;
    case "pt-dau":
      return `${v > 0 ? "+" : v < 0 ? "−" : ""}${so(Math.abs(v), 1)}%`;
    case "lan":
      return so(v, 2);
    case "ty":
      return so(v / 1e9, v >= 1e10 ? 0 : 1);
    case "nam":
      return `${v}/5`;
    default:
      return so(v, 0);
  }
}

const mauDiem = (v: number) => (v >= 6.5 ? "text-tang" : v >= 4.5 ? "text-dung" : "text-giam");

const THANH_KHOAN = [
  { gt: 0, nhan: "Mọi mức" },
  { gt: 1e9, nhan: "Từ 1 tỷ/phiên" },
  { gt: 1e10, nhan: "Từ 10 tỷ/phiên" },
  { gt: 5e10, nhan: "Từ 50 tỷ/phiên" },
];

export function BangXepHang({
  dong,
  cot,
  sapXepDau,
  tenNganh,
  duoiLienKet = "",
  locSo,
  thanhKhoanDau = 0,
}: {
  dong: DongXH[];
  cot: CotXH[];
  sapXepDau: string;
  tenNganh: Record<string, string>;
  duoiLienKet?: string;
  locSo?: LocSo;
  thanhKhoanDau?: number;
}) {
  const [sx, setSx] = useState<{ khoa: string; giam: boolean }>({ khoa: sapXepDau, giam: true });
  const [san, setSan] = useState("");
  const [nganh, setNganh] = useState("");
  const [tk, setTk] = useState(thanhKhoanDau);
  const [nguong, setNguong] = useState(locSo?.macDinh ?? 0);
  const [tim, setTim] = useState("");
  const [soDong, setSoDong] = useState(50);

  const dsSan = useMemo(() => [...new Set(dong.map((d) => d.san).filter(Boolean))].sort(), [dong]);
  const dsNganh = useMemo(
    () =>
      [...new Set(dong.map((d) => d.nganh).filter((x): x is string => !!x))]
        .map((k) => ({ k, ten: tenNganh[k] ?? k }))
        .sort((a, b) => a.ten.localeCompare(b.ten, "vi")),
    [dong, tenNganh],
  );

  const loc = useMemo(() => {
    const t = tim.trim().toUpperCase();
    return dong
      .filter(
        (d) =>
          (!san || d.san === san) &&
          (!nganh || d.nganh === nganh) &&
          (d.so.gtgd ?? 0) >= tk &&
          (!locSo || (d.so[locSo.khoa] ?? -Infinity) >= nguong) &&
          (!t || d.ma.includes(t) || d.ten.toUpperCase().includes(t)),
      )
      .sort((a, b) => {
        const x = a.so[sx.khoa];
        const y = b.so[sx.khoa];
        if (x == null) return 1;
        if (y == null) return -1;
        return sx.giam ? y - x : x - y;
      });
  }, [dong, san, nganh, tk, locSo, nguong, tim, sx]);

  const chon = "h-9 rounded-full border border-vien bg-nen px-3 text-[13px] outline-none focus:border-nhan";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm mã hoặc tên" aria-label="Tìm mã" className={`${chon} w-40 px-4`} />
        <select value={san} onChange={(e) => setSan(e.target.value)} aria-label="Sàn" className={chon}>
          <option value="">Mọi sàn</option>
          {dsSan.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={nganh} onChange={(e) => setNganh(e.target.value)} aria-label="Ngành" className={`${chon} max-w-[220px]`}>
          <option value="">Mọi ngành</option>
          {dsNganh.map((n) => (
            <option key={n.k} value={n.k}>
              {n.ten}
            </option>
          ))}
        </select>
        <select value={tk} onChange={(e) => setTk(Number(e.target.value))} aria-label="Thanh khoản" className={chon}>
          {THANH_KHOAN.map((m) => (
            <option key={m.gt} value={m.gt}>
              {m.nhan}
            </option>
          ))}
        </select>
        {locSo && (
          <select value={nguong} onChange={(e) => setNguong(Number(e.target.value))} aria-label={locSo.nhan} className={chon}>
            {locSo.muc.map((m) => (
              <option key={m.gt} value={m.gt}>
                {m.nhan}
              </option>
            ))}
          </select>
        )}
        <span className="ml-auto text-[12px] text-chu-phu">{loc.length.toLocaleString("vi-VN")} mã</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-vien">
        <table className="w-full min-w-[720px] text-[14px]">
          <thead>
            <tr className="border-b border-vien text-[12px] text-chu-phu">
              <th className="px-3 py-2.5 text-right font-medium">#</th>
              <th className="sticky left-0 z-[1] bg-nen px-3 py-2.5 text-left font-medium">Mã</th>
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
            {loc.slice(0, soDong).map((d, i) => (
              <tr key={d.ma} className="border-b border-vien last:border-b-0 hover:bg-nen-phu">
                <td className="px-3 py-2 text-right text-chu-phu tabular-nums">{i + 1}</td>
                <td className="sticky left-0 z-[1] bg-nen px-3 py-2">
                  <Link href={`/co-phieu/${d.ma}${duoiLienKet}`} prefetch={false} className="font-semibold hover:text-nhan">
                    {d.ma}
                  </Link>
                  <p className="max-w-[200px] truncate text-[11px] text-chu-phu" title={d.ten}>
                    {d.nganh ? (tenNganh[d.nganh] ?? d.san) : d.san} · {d.san}
                  </p>
                </td>
                {cot.map((c) => {
                  const v = d.so[c.khoa];
                  const mau = v == null ? "" : c.kieu === "diem" ? `font-semibold ${mauDiem(v)}` : c.kieu === "pt-dau" ? (v > 0 ? "text-tang" : v < 0 ? "text-giam" : "") : "";
                  return (
                    <td key={c.khoa} className={`px-3 py-2 text-right tabular-nums ${mau}`}>
                      {dinhDang(v, c.kieu)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!loc.length && (
              <tr>
                <td colSpan={cot.length + 2} className="px-4 py-8 text-center text-chu-phu">
                  Không có mã nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loc.length > soDong && (
        <div className="mt-3 text-center">
          <button onClick={() => setSoDong((x) => x + 50)} className="h-10 rounded-full bg-nen-noi px-6 font-semibold hover:bg-vien">
            Xem thêm 50 mã
          </button>
        </div>
      )}
    </div>
  );
}
