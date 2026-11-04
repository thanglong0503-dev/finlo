"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { chuoiLienTiep, ngayDayDu, ngayNgan, type DongTienMa, type KetQuaDongTien } from "@/lib/cuoi-phien";
import { giaNghin, mauTangGiam, phanTram, tyDong } from "@/lib/dinh-dang";

const KHUNG = [1, 5, 10, 20] as const;

const tien = (trieu: number) => `${trieu > 0 ? "+" : trieu < 0 ? "−" : ""}${tyDong(Math.abs(trieu) * 1e6)}`;
const cong = (ds: number[]) => ds.reduce((s, x) => s + x, 0);

// Hai màu đối nhau, điểm giữa xám trung tính. Căn bậc hai để ngành nhỏ vẫn nhìn ra chiều mua bán.
function mauO(x: number, dinh: number) {
  if (!x) return "var(--nen-noi)";
  const dam = Math.min(1, Math.sqrt(Math.abs(x) / dinh));
  return `color-mix(in srgb, var(${x > 0 ? "--tang" : "--giam"}) ${Math.round(18 + dam * 72)}%, var(--nen-noi))`;
}

function BangMa({ tieuDe, ds, khung }: { tieuDe: string; ds: DongTienMa[]; khung: number }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-vien">
      <h3 className="border-b border-vien px-4 py-3 font-semibold">{tieuDe}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-right">
          <thead className="text-[12px] text-chu-phu">
            <tr className="border-b border-vien">
              <th className="px-4 py-2 text-left font-medium">Mã</th>
              <th className="px-2 py-2 font-medium">Giá</th>
              <th className="px-2 py-2 font-medium">Ròng {khung} phiên</th>
              <th className="px-4 py-2 font-medium">Liên tiếp</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {ds.map((d) => {
              const chuoi = chuoiLienTiep(d.rong);
              const r = cong(d.rong.slice(-khung));
              return (
                <tr key={d.ma} className="border-b border-vien last:border-0">
                  <td className="px-4 py-2 text-left">
                    <Link href={`/co-phieu/${d.ma}`} prefetch={false} className="font-semibold text-nhan hover:underline">
                      {d.ma}
                    </Link>
                    <span className="block max-w-44 truncate text-[12px] text-chu-phu">{d.nganh ?? d.ten}</span>
                  </td>
                  <td className="px-2 py-2">
                    {giaNghin(d.gia)}
                    <span className={`block text-[12px] ${mauTangGiam(d.phanTram)}`}>{phanTram(d.phanTram)}</span>
                  </td>
                  <td className={`px-2 py-2 font-semibold ${mauTangGiam(r)}`}>{tien(r)}</td>
                  <td className="px-4 py-2 text-[12px] whitespace-nowrap text-chu-phu">{chuoi ? `${chuoi > 0 ? "Mua" : "Bán"} ${Math.abs(chuoi)} phiên` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DongTienClient({ kq }: { kq: KetQuaDongTien }) {
  const [khung, setKhung] = useState<number>(5);
  const [chon, setChon] = useState<number | null>(null);
  const n = kq.cacNgay.length;
  const dauKhung = Math.max(0, n - khung);
  const rongNgay = useMemo(() => kq.tongMua.map((m, i) => m - kq.tongBan[i]), [kq]);
  const mua = cong(kq.tongMua.slice(-khung));
  const ban = cong(kq.tongBan.slice(-khung));
  const soPhienMua = rongNgay.slice(-khung).filter((x) => x > 0).length;
  // Cắt cột đột biến ở mức gấp rưỡi phiên lớn thứ nhì để các phiên khác vẫn đọc được; số đúng hiện khi rê chuột
  const xepCot = [...rongNgay].map(Math.abs).sort((a, b) => b - a);
  const dinhCot = Math.max(1, Math.min(xepCot[0] ?? 1, (xepCot[1] ?? xepCot[0] ?? 1) * 1.5));
  const coCat = (xepCot[0] ?? 0) > dinhCot;

  const nganh = useMemo(
    () => [...kq.nganh].map((g) => ({ ...g, tong: cong(g.rong.slice(-khung)) })).sort((a, b) => b.tong - a.tong),
    [kq, khung],
  );
  // Thang màu theo mức 95% để một phiên đột biến không làm các ô còn lại nhạt hết
  const dinhO = useMemo(() => {
    const ds = kq.nganh.flatMap((g) => g.rong.map(Math.abs)).sort((a, b) => a - b);
    return Math.max(1, ds[Math.floor(ds.length * 0.95)] ?? 1);
  }, [kq]);

  const theoKhung = useMemo(() => [...kq.ma].map((d) => ({ d, r: cong(d.rong.slice(-khung)) })), [kq, khung]);
  const dsMua = useMemo(() => [...theoKhung].sort((a, b) => b.r - a.r).filter((x) => x.r > 0).slice(0, 15).map((x) => x.d), [theoKhung]);
  const dsBan = useMemo(() => [...theoKhung].sort((a, b) => a.r - b.r).filter((x) => x.r < 0).slice(0, 15).map((x) => x.d), [theoKhung]);
  const dangChon = chon ?? n - 1;

  return (
    <div className="mt-5 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-chu-phu">
          Dữ liệu đến phiên {ngayDayDu(kq.ngay)} · cập nhật mỗi ngày sau phiên · {n} phiên gần nhất
        </p>
        <div className="flex gap-1 rounded-full bg-nen-noi p-1" role="group" aria-label="Chọn số phiên">
          {KHUNG.map((k) => (
            <button key={k} type="button" aria-pressed={khung === k} onClick={() => setKhung(k)} className={`h-8 rounded-full px-3 ${khung === k ? "bg-chu font-semibold text-nen" : "text-chu-phu hover:text-chu"}`}>
              {k} phiên
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Mua ròng</p>
          <p className={`mt-1 text-[22px] font-bold tabular-nums ${mauTangGiam(mua - ban)}`}>{tien(mua - ban)}</p>
          <p className="text-[12px] text-chu-phu">{khung} phiên gần nhất</p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Tổng mua</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{tyDong(mua * 1e6)}</p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Tổng bán</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{tyDong(ban * 1e6)}</p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Số phiên mua ròng</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">
            {soPhienMua}/{Math.min(khung, n)}
          </p>
        </div>
      </div>

      <section className="rounded-2xl bg-nen-phu p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Mua bán ròng từng phiên</h2>
          <p className="text-[13px] tabular-nums" aria-live="polite">
            {ngayDayDu(kq.cacNgay[dangChon])}: <span className={`font-semibold ${mauTangGiam(rongNgay[dangChon])}`}>{tien(rongNgay[dangChon])}</span>
          </p>
        </div>
        <div className="mt-3 flex h-40 items-stretch gap-0.5" onMouseLeave={() => setChon(null)}>
          {rongNgay.map((x, i) => (
            <button
              key={kq.cacNgay[i]}
              type="button"
              aria-label={`${ngayDayDu(kq.cacNgay[i])}: ${tien(x)}`}
              onMouseEnter={() => setChon(i)}
              onFocus={() => setChon(i)}
              onClick={() => setChon(i)}
              className={`group flex min-w-0 flex-1 flex-col rounded-sm ${dangChon === i ? "bg-nen-noi" : ""} ${i < dauKhung ? "opacity-50" : ""}`}
            >
              <span className="flex h-1/2 w-full items-end justify-center">{x > 0 && <span className="w-full max-w-5 rounded-t bg-tang" style={{ height: `${Math.min(1, x / dinhCot) * 100}%` }} />}</span>
              <span className="flex h-1/2 w-full items-start justify-center border-t border-vien">{x < 0 && <span className="w-full max-w-5 rounded-b bg-giam" style={{ height: `${Math.min(1, -x / dinhCot) * 100}%` }} />}</span>
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-chu-phu tabular-nums">
          <span>{ngayNgan(kq.cacNgay[0])}</span>
          <span>{ngayNgan(kq.cacNgay[n - 1])}</span>
        </div>
        {coCat && <p className="mt-2 text-[12px] text-chu-phu">Cột của phiên đột biến được cắt bớt cho dễ nhìn, chọn vào cột để xem số đúng.</p>}
      </section>

      <section className="rounded-2xl border border-vien">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vien px-4 py-3">
          <h2 className="font-semibold">Bản đồ dòng tiền theo ngành</h2>
          <div className="flex items-center gap-2 text-[12px] text-chu-phu">
            <span>Bán ròng</span>
            <span className="h-2 w-28 rounded-full" style={{ background: "linear-gradient(90deg, var(--giam), var(--nen-noi), var(--tang))" }} aria-hidden />
            <span>Mua ròng</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0.5 text-[12px]">
            <thead className="text-chu-phu">
              <tr>
                <th className="sticky left-0 z-[1] bg-nen px-3 py-1 text-left font-medium">Ngành</th>
                {kq.cacNgay.map((d, i) => (
                  <th key={d} className="w-7 py-1 text-center font-normal tabular-nums">
                    {(n - 1 - i) % 5 === 0 ? ngayNgan(d) : ""}
                  </th>
                ))}
                <th className="px-3 py-1 text-right font-medium whitespace-nowrap">{khung} phiên</th>
              </tr>
            </thead>
            <tbody>
              {nganh.map((g) => (
                <tr key={g.k}>
                  <th scope="row" className="sticky left-0 z-[1] max-w-44 truncate bg-nen px-3 py-0.5 text-left font-normal">
                    {g.ten}
                  </th>
                  {g.rong.map((x, i) => (
                    <td
                      key={kq.cacNgay[i]}
                      title={`${g.ten}, ${ngayDayDu(kq.cacNgay[i])}: ${tien(x)}`}
                      className={`h-6 rounded-sm ${i < dauKhung ? "opacity-50" : ""}`}
                      style={{ background: mauO(x, dinhO) }}
                    />
                  ))}
                  <td className={`px-3 py-0.5 text-right font-semibold whitespace-nowrap tabular-nums ${mauTangGiam(g.tong)}`}>{tien(g.tong)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BangMa tieuDe={`Mua ròng nhiều nhất ${khung} phiên`} ds={dsMua} khung={khung} />
        <BangMa tieuDe={`Bán ròng nhiều nhất ${khung} phiên`} ds={dsBan} khung={khung} />
      </div>

      <p className="text-[12px] text-chu-phu">
        Mua ròng là giá trị khối ngoại mua trừ giá trị bán, gồm cả giao dịch thoả thuận trong số liệu chốt phiên. Dữ liệu từ Mofi, chỉ để tham khảo, không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
