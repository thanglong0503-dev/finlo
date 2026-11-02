"use client";

import { useState } from "react";
import { giaNghin } from "@/lib/dinh-dang";
import type { DiemXoay, MauHinh, MucPivot, MuaVu, PhuongPhap } from "@/lib/ky-thuat-them";

const so1 = (x: number) => x.toLocaleString("vi-VN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const pt = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${so1(Math.abs(x))}%`;
const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

const KHUNG = [
  { k: "ngay", ten: "Ngày", ghi: "phiên gần nhất" },
  { k: "tuan", ten: "Tuần", ghi: "tuần gần nhất đã kết thúc" },
  { k: "thang", ten: "Tháng", ghi: "tháng gần nhất đã kết thúc" },
] as const;
const PHUONG_PHAP: PhuongPhap[] = ["Cổ điển", "Fibonacci", "Camarilla", "Woodie"];
const DONG: { k: keyof MucPivot; ten: string }[] = [
  { k: "r3", ten: "R3" },
  { k: "r2", ten: "R2" },
  { k: "r1", ten: "R1" },
  { k: "p", ten: "Pivot" },
  { k: "s1", ten: "S1" },
  { k: "s2", ten: "S2" },
  { k: "s3", ten: "S3" },
];

// Bảng điểm xoay: 4 phương pháp × 7 mức, chọn khung ngày/tuần/tháng
export function BangPivot({ xoay, gia }: { xoay: DiemXoay; gia: number }) {
  const [khung, datKhung] = useState<(typeof KHUNG)[number]["k"]>("ngay");
  const ky = xoay[khung];
  const ghi = KHUNG.find((x) => x.k === khung)!.ghi;
  return (
    <section className="border border-vien rounded-2xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vien px-4 py-2">
        <h2 className="font-semibold">Hỗ trợ và kháng cự (điểm xoay)</h2>
        <div className="flex gap-1">
          {KHUNG.map((x) => (
            <button
              key={x.k}
              type="button"
              onClick={() => datKhung(x.k)}
              className={`h-7 rounded-full px-3 text-[12px] font-medium ${
                khung === x.k ? "bg-nhan text-white" : "border border-vien text-chu-phu hover:text-chu"
              }`}
            >
              {x.ten}
            </button>
          ))}
        </div>
      </div>
      {!ky ? (
        <p className="px-4 py-6 text-chu-phu">Chưa đủ dữ liệu cho khung này.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b border-vien text-left text-[12px] text-chu-phu">
                  <th className="px-4 py-2 font-medium">Mức</th>
                  {PHUONG_PHAP.map((p) => (
                    <th key={p} className="px-3 py-2 text-right font-medium">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DONG.map((d) => (
                  <tr key={d.k} className={`border-b border-vien last:border-b-0 ${d.k === "p" ? "bg-nen-phu" : ""}`}>
                    <td
                      className={`px-4 py-1.5 font-medium ${
                        d.k.startsWith("r") ? "text-giam" : d.k.startsWith("s") ? "text-tang" : ""
                      }`}
                    >
                      {d.ten}
                    </td>
                    {PHUONG_PHAP.map((p) => {
                      const v = ky.muc[p][d.k];
                      return (
                        <td key={p} className="px-3 py-1.5 text-right tabular-nums">
                          {giaNghin(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-vien px-4 py-2 text-[12px] text-chu-phu">
            Giá hiện tại <b className="text-chu tabular-nums">{giaNghin(gia)}</b>. Tính từ đỉnh, đáy, đóng cửa của {ghi} (
            {ky.tu === ky.den ? ngayVN(ky.den) : `${ngayVN(ky.tu)} – ${ngayVN(ky.den)}`}).
          </p>
        </>
      )}
    </section>
  );
}

// Danh sách mẫu hình nến 60 phiên gần nhất
export function DanhSachMauHinh({ ds }: { ds: MauHinh[] }) {
  return (
    <section className="border border-vien rounded-2xl overflow-hidden">
      <h2 className="border-b border-vien px-4 py-2.5 font-semibold">Mẫu hình nến 60 phiên gần nhất</h2>
      {ds.length === 0 ? (
        <p className="px-4 py-6 text-chu-phu">Không phát hiện mẫu hình nào.</p>
      ) : (
        <ul className="grid max-h-[480px] overflow-y-auto lg:grid-cols-2">
          {ds.map((m) => (
            <li key={`${m.time}${m.ten}`} className="flex gap-3 border-b border-vien px-4 py-2">
              <span className="w-20 shrink-0 text-chu-phu tabular-nums">{ngayVN(m.time)}</span>
              <span
                className={`h-5 w-14 shrink-0 rounded text-center text-[11px] font-bold leading-5 ${
                  m.huong === "tang" ? "bg-tang text-white" : m.huong === "giam" ? "bg-giam text-white" : "border border-vien text-chu-phu"
                }`}
              >
                {m.huong === "tang" ? "TĂNG" : m.huong === "giam" ? "GIẢM" : "TRUNG"}
              </span>
              <span className="min-w-0">
                <span className="font-medium">{m.ten}</span>
                <span className="block text-[12px] text-chu-phu">{m.moTa}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Mùa vụ: cột lợi nhuận bình quân từng tháng + bảng năm × tháng
export function MuaVuGia({ mv }: { mv: MuaVu }) {
  const [chon, datChon] = useState<number | null>(null);
  const W = 640;
  const H = 240;
  const tren = 24;
  const duoi = 60;
  const trai = 8;
  const cot = (W - trai * 2) / 12;
  const giaTri = mv.thang.map((t) => t.tb ?? 0);
  const lon = Math.max(1, ...giaTri.map(Math.abs));
  const coAm = giaTri.some((x) => x < 0);
  const coDuong = giaTri.some((x) => x > 0);
  // Trục 0 đặt theo tỷ lệ phần dương/âm để cột không bị ép
  const maxD = coDuong ? Math.max(...giaTri) : 0;
  const maxA = coAm ? -Math.min(...giaTri) : 0;
  const cao = H - tren - duoi;
  const y0 = tren + (maxD + maxA ? (maxD / (maxD + maxA)) * cao : cao / 2);
  const tl = cao / (maxD + maxA || lon);
  const t = chon != null ? mv.thang[chon] : null;

  return (
    <section className="border border-vien rounded-2xl overflow-hidden">
      <h2 className="border-b border-vien px-4 py-2.5 font-semibold">Mùa vụ: lợi nhuận theo tháng</h2>
      <div className="grid gap-0 lg:grid-cols-[1fr_300px]">
        <div className="relative px-2 pt-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Lợi nhuận bình quân theo tháng">
            <line x1={trai} x2={W - trai} y1={y0} y2={y0} stroke="var(--xam-bd)" strokeWidth={1} />
            {mv.thang.map((th, i) => {
              const v = th.tb ?? 0;
              const h = Math.max(1, Math.abs(v) * tl);
              const x = trai + i * cot + 6;
              const w = cot - 12;
              const y = v >= 0 ? y0 - h : y0;
              const dangChon = chon === i;
              return (
                <g
                  key={th.thang}
                  onMouseEnter={() => datChon(i)}
                  onMouseLeave={() => datChon(null)}
                  onClick={() => datChon(i)}
                  className="cursor-pointer"
                >
                  <rect x={trai + i * cot} y={tren - 20} width={cot} height={H - tren + 20} fill="transparent" />
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={2}
                    fill={th.tb == null ? "var(--xam-bd)" : v >= 0 ? "var(--tang)" : "var(--giam)"}
                    opacity={chon == null || dangChon ? 1 : 0.45}
                  />
                  {th.tb != null && (
                    <text
                      x={x + w / 2}
                      y={v >= 0 ? y - 5 : y + h + 13}
                      textAnchor="middle"
                      fontSize={11}
                      fill="var(--chu)"
                      className="tabular-nums"
                    >
                      {so1(v)}
                    </text>
                  )}
                  <text
                    x={x + w / 2}
                    y={H - 24}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={th.thang === mv.thangHienTai ? 700 : 500}
                    fill={th.thang === mv.thangHienTai ? "var(--nhan)" : "var(--chu)"}
                  >
                    T{th.thang}
                  </text>
                  <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--chu-phu)">
                    {th.tyLeTang == null ? "—" : `${Math.round(th.tyLeTang)}%↑`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="border-t border-vien p-4 text-[13px] lg:border-t-0 lg:border-l">
          {t ? (
            <>
              <p className="font-semibold">Tháng {t.thang}</p>
              <dl className="mt-2 space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-chu-phu">Lợi nhuận bình quân</dt>
                  <dd className={`font-semibold tabular-nums ${(t.tb ?? 0) >= 0 ? "text-tang" : "text-giam"}`}>
                    {t.tb == null ? "—" : pt(t.tb)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-chu-phu">Số năm tăng</dt>
                  <dd className="tabular-nums">
                    {t.tyLeTang == null ? "—" : `${Math.round((t.tyLeTang / 100) * t.soNam)}/${t.soNam} năm`}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-chu-phu">
              Cột là % thay đổi bình quân của giá đóng cửa cuối tháng so với tháng trước, tối đa 10 năm gần nhất (giá đã
              điều chỉnh cổ tức), không tính tháng đang diễn ra. Dòng dưới là tỷ lệ số năm tháng đó tăng. Rê chuột vào cột để xem chi tiết.
            </p>
          )}
        </div>
      </div>

      {mv.nam.length > 0 && (
        <div className="overflow-x-auto border-t border-vien">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead>
              <tr className="border-b border-vien text-chu-phu">
                <th className="px-3 py-1.5 text-left font-medium">Năm</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="px-1 py-1.5 text-right font-medium">
                    T{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mv.nam.map((r) => (
                <tr key={r.nam} className="border-b border-vien last:border-b-0">
                  <td className="px-3 py-1 font-medium">{r.nam}</td>
                  {r.thang.map((v, i) => (
                    <td
                      key={i}
                      className="px-1 py-1 text-right tabular-nums"
                      style={
                        v == null
                          ? undefined
                          : {
                              background: `color-mix(in srgb, var(${v >= 0 ? "--tang" : "--giam"}) ${Math.round(
                                Math.min(1, Math.abs(v) / 15) * 45 + 5,
                              )}%, transparent)`,
                            }
                      }
                    >
                      {v == null ? "" : so1(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
