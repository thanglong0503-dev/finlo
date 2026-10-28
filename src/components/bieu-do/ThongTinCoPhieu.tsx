"use client";

import Link from "next/link";
import { GiaChop } from "@/components/GiaChop";
import { NutTheoDoi } from "@/components/NutTheoDoi";
import { khoiLuongTheoGia, type NenCB } from "@/lib/chi-bao";
import { giaNghin, khoiLuong, mauTangGiam, phanTram, thayDoi, tyDong, vonHoa } from "@/lib/dinh-dang";
import type { CoPhieu } from "@/lib/mofi";

// Khung bên cạnh biểu đồ cổ phiếu: giá (làm mới mỗi phút, chớp khi đổi), thông số phiên,
// và khối lượng theo giá 60 phiên gần nhất
export function ThongTinCoPhieu({ cp, nen }: { cp: CoPhieu | null; nen: NenCB[] | null }) {
  if (!cp) return <div className="h-64 animate-pulse bg-nen-phu" />;

  const n = nen?.length ?? 0;
  const homNay = nen?.[n - 1];
  const truoc = nen?.[n - 2];
  const klTb = nen && n ? nen.slice(-20).reduce((s, x) => s + x.volume, 0) / Math.min(20, n) : null;
  const o = nen ? khoiLuongTheoGia(nen, 60, 14) : [];
  const lonNhat = Math.max(1, ...o.map((x) => x.kl));

  const dong = [
    { nhan: "Tham chiếu", gt: truoc ? giaNghin(truoc.close) : "—" },
    { nhan: "Mở cửa", gt: homNay ? giaNghin(homNay.open) : "—" },
    { nhan: "Cao nhất", gt: homNay ? giaNghin(homNay.high) : "—", mau: "text-tang" },
    { nhan: "Thấp nhất", gt: homNay ? giaNghin(homNay.low) : "—", mau: "text-giam" },
    { nhan: "Khối lượng", gt: khoiLuong(cp.khoiLuong) },
    { nhan: "KL TB 20 phiên", gt: klTb != null ? khoiLuong(klTb) : "—" },
    { nhan: "Giá trị GD", gt: tyDong(cp.giaTri) },
    { nhan: "Vốn hoá", gt: vonHoa(cp.vonHoa) },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-2 border-b border-vien px-3 py-3">
        <div>
          <p className="font-semibold">
            {cp.ma} <span className="text-[11px] font-normal text-chu-phu">{cp.san}</span>
          </p>
          <GiaChop gia={cp.gia} className={`text-2xl font-bold tabular-nums ${mauTangGiam(cp.phanTram)}`}>
            {giaNghin(cp.gia)}
          </GiaChop>
          <p className={`tabular-nums ${mauTangGiam(cp.phanTram)}`}>
            {thayDoi(cp.thayDoi / 1000)} ({phanTram(cp.phanTram)})
          </p>
        </div>
        <NutTheoDoi ma={cp.ma} />
      </div>

      <dl>
        {dong.map((d) => (
          <div key={d.nhan} className="flex justify-between border-b border-vien px-3 py-1.5">
            <dt className="text-chu-phu">{d.nhan}</dt>
            <dd className={`font-medium tabular-nums ${d.mau ?? ""}`}>{d.gt}</dd>
          </div>
        ))}
      </dl>

      <div className="px-3 py-3">
        <p className="text-[10px] font-bold tracking-wider text-chu-phu uppercase">Khối lượng theo giá · 60 phiên</p>
        <div className="mt-2 space-y-[3px] tabular-nums">
          {o.map((x) => {
            const coGiaHienTai = cp.gia >= x.tu && cp.gia <= x.den;
            return (
              <div key={x.tu} className="flex items-center gap-2 text-[11px]">
                <span className={`w-12 shrink-0 text-right ${coGiaHienTai ? "font-bold text-nhan" : "text-chu-phu"}`}>
                  {giaNghin((x.tu + x.den) / 2)}
                </span>
                <div className="relative h-3 flex-1">
                  {/* Phần xanh: khối lượng của các phiên tăng; phần đỏ: phiên giảm */}
                  <div className="absolute inset-y-0 left-0 flex" style={{ width: `${(x.kl / lonNhat) * 100}%` }}>
                    <div className="h-full bg-tang/60" style={{ flex: x.tang }} />
                    <div className="h-full bg-giam/50" style={{ flex: x.kl - x.tang }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-chu-phu">Vùng giá có thanh dài là nơi giao dịch nhiều, thường là hỗ trợ hoặc kháng cự.</p>
      </div>

      <Link
        href={`/co-phieu/${cp.ma}`}
        className="block border-t border-vien px-3 py-2.5 font-semibold text-nhan hover:bg-nhan-nhat"
      >
        Báo cáo tài chính, định giá {cp.ma} →
      </Link>
    </div>
  );
}
