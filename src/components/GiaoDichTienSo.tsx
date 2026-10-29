"use client";

import { useEffect, useState } from "react";
import { BieuDoTuongTac } from "@/components/bieu-do/BieuDoTuongTac";
import { BangSoLenh, useThiTruongTienSo } from "@/components/bieu-do/SoLenhTienSo";
import { GiaChop } from "@/components/GiaChop";
import { capGiaoDich, dinhDangGia, gon, kiemTraCap, soLe, TrangThaiKetNoi } from "@/lib/binance";

// Trang giao dịch một đồng: giá 24h realtime, biểu đồ tương tác có chỉ báo, sổ lệnh và lệnh khớp
export function GiaoDichTienSo({ ma, tyGia }: { ma: string; tyGia: number | null }) {
  const cap = capGiaoDich(ma);
  const [coCap, setCoCap] = useState<boolean | null>(null);

  useEffect(() => {
    let huy = false;
    kiemTraCap(ma).then((co) => {
      if (!huy) setCoCap(co);
    });
    return () => {
      huy = true;
    };
  }, [ma]);

  const { trangThai, ticker: t, soLenh, khop } = useThiTruongTienSo(ma, coCap === true);

  if (coCap === false) {
    return (
      <div className="mt-6 border border-dashed border-vien p-8 text-center text-chu-phu rounded-2xl overflow-hidden">
        {ma} hiện không có cặp {cap} đang giao dịch trên Binance nên chưa có dữ liệu realtime. Giá tham khảo vẫn xem
        được trong bảng Tài sản số.
      </div>
    );
  }

  const gia = t ? Number(t.c) : null;
  const phanTram = t ? Number(t.P) : 0;
  const mauPT = phanTram > 0 ? "text-tang" : phanTram < 0 ? "text-giam" : "";
  const le = gia ? soLe(gia) : 2;
  const thongKe = t
    ? [
        { nhan: "Mở cửa 24h", gt: dinhDangGia(Number(t.o), le) },
        { nhan: "Cao 24h", gt: dinhDangGia(Number(t.h), le), mau: "text-tang" },
        { nhan: "Thấp 24h", gt: dinhDangGia(Number(t.l), le), mau: "text-giam" },
        { nhan: `KL 24h (${ma})`, gt: gon(Number(t.v)) },
        { nhan: "GT 24h (USDT)", gt: gon(Number(t.q)) },
      ]
    : [];

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-b border-vien pb-4">
        <div>
          <p className="flex items-center gap-3">
            <span className="font-semibold">{ma}/USDT</span>
            <TrangThaiKetNoi trangThai={trangThai} />
          </p>
          {gia != null ? (
            <p className="mt-1 flex items-baseline gap-3">
              <GiaChop gia={gia} className={`px-1 text-3xl font-bold tabular-nums ${mauPT}`}>
                {dinhDangGia(gia, le)}
              </GiaChop>
              <span className={`font-semibold tabular-nums ${mauPT}`}>
                {phanTram > 0 ? "+" : ""}
                {phanTram.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%
              </span>
            </p>
          ) : (
            <p className="mt-1 h-9 w-48 animate-pulse bg-nen-phu" />
          )}
          {gia != null && tyGia && (
            <p className="text-chu-phu tabular-nums">≈ {Math.round(gia * tyGia).toLocaleString("vi-VN")} đ</p>
          )}
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          {thongKe.map((s) => (
            <div key={s.nhan}>
              <dt className="text-[11px] text-chu-phu">{s.nhan}</dt>
              <dd className={`font-semibold tabular-nums ${s.mau ?? ""}`}>{s.gt}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="border border-vien rounded-2xl overflow-hidden">{coCap && <BieuDoTuongTac nguon="ts" ma={ma} />}</div>
        <div className="border border-vien rounded-2xl overflow-hidden">
          <BangSoLenh ma={ma} soLenh={soLenh} khop={khop} le={le} />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-chu-phu">
        Dữ liệu realtime từ Binance (cặp {cap}), chỉ để tham khảo, Finlo không nhận lệnh giao dịch. Kết nối tự tạm dừng
        khi bạn chuyển sang tab khác để tiết kiệm dữ liệu. Chỉ báo FL là chỉ báo riêng của Finlo, không phải khuyến nghị
        đầu tư.
      </p>
    </div>
  );
}
