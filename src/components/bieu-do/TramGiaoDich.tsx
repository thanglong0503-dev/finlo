"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BieuDoTuongTac, type Nguon } from "@/components/bieu-do/BieuDoTuongTac";
import { DanhSachMa } from "@/components/bieu-do/DanhSachMa";
import { BangSoLenh, useThiTruongTienSo } from "@/components/bieu-do/SoLenhTienSo";
import { ThongTinCoPhieu } from "@/components/bieu-do/ThongTinCoPhieu";
import { GiaChop } from "@/components/GiaChop";
import { dinhDangGia, gon, kiemTraCap, soLe, TrangThaiKetNoi } from "@/lib/binance";
import type { NenCB } from "@/lib/chi-bao";
import type { BangGia, TienSoTop } from "@/lib/mofi";

// Trạm biểu đồ: biểu đồ tương tác | khung thông tin (sổ lệnh hoặc thông số cổ phiếu) | danh sách mã.
// Đổi mã ngay trên trang (không tải lại), đường dẫn cập nhật để chia sẻ được.
export function TramGiaoDich({ nguonDau, maDau }: { nguonDau: Nguon; maDau: string }) {
  const [nguon, setNguon] = useState<Nguon>(nguonDau);
  const [ma, setMa] = useState(maDau);
  const [bangGia, setBangGia] = useState<BangGia | null>(null);
  const [tienSo, setTienSo] = useState<TienSoTop[] | null>(null);
  const [nen, setNen] = useState<{ ma: string; ds: NenCB[] } | null>(null);
  const [coCap, setCoCap] = useState<boolean | null>(null);

  // Bảng giá cổ phiếu làm mới mỗi phút (giá trong danh sách và khung thông tin chớp khi đổi)
  useEffect(() => {
    const tai = () =>
      fetch("/api/bang-gia")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: BangGia | null) => d && setBangGia(d))
        .catch(() => {});
    tai();
    const id = setInterval(tai, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/tien-so")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TienSoTop[] | null) => d && setTienSo(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (nguon !== "ts") return;
    let huy = false;
    kiemTraCap(ma).then((co) => {
      if (!huy) setCoCap(co);
    });
    return () => {
      huy = true;
    };
  }, [nguon, ma]);

  const khiChon = useCallback((n: Nguon, m: string) => {
    setNguon(n);
    setMa(m);
    setCoCap(null);
    window.history.replaceState(null, "", `/bieu-do?loai=${n}&ma=${m}`);
  }, []);
  const khiCoNen = useCallback((ds: NenCB[]) => setNen({ ma, ds }), [ma]);

  const thiTruong = useThiTruongTienSo(ma, nguon === "ts" && coCap === true);
  const cp = bangGia?.coPhieu.find((c) => c.ma === ma) ?? null;
  const ts = tienSo?.find((x) => x.ma === ma);
  // Giá trong phiên cho cây nến hôm nay (chỉ khi có ảnh chụp phiên); giữ nguyên đối tượng khi số liệu không đổi
  const ngayPhien = bangGia?.phien?.ngay;
  const giaCp = cp?.gia;
  const thamChieuCp = cp?.thamChieu;
  const klCp = cp?.khoiLuong;
  const phienCK = useMemo(
    () =>
      ngayPhien && giaCp != null && thamChieuCp != null && klCp != null
        ? { ngay: ngayPhien, gia: giaCp, thamChieu: thamChieuCp, khoiLuong: klCp }
        : null,
    [ngayPhien, giaCp, thamChieuCp, klCp],
  );
  const t = thiTruong.ticker;
  const giaTs = t ? Number(t.c) : null;
  const le = giaTs ? soLe(giaTs) : 2;
  const ptTs = t ? Number(t.P) : 0;

  return (
    <div className="grid border-b border-vien lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_300px_300px]">
      <section className="min-w-0 lg:border-r lg:border-vien">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-vien px-3 py-2.5">
          <h1 className="text-lg font-bold">
            {nguon === "ts" ? `${ma}/USDT` : ma}{" "}
            <span className="text-[12px] font-normal text-chu-phu">
              {nguon === "ts" ? (ts?.ten ?? "Tài sản số") : (cp?.ten ?? "Cổ phiếu")}
            </span>
          </h1>
          {nguon === "ts" && giaTs != null && (
            <>
              <GiaChop gia={giaTs} className={`px-1 text-lg font-bold tabular-nums ${ptTs >= 0 ? "text-tang" : "text-giam"}`}>
                {dinhDangGia(giaTs, le)}
              </GiaChop>
              <span className={`tabular-nums ${ptTs >= 0 ? "text-tang" : "text-giam"}`}>
                {ptTs > 0 ? "+" : ""}
                {ptTs.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%
              </span>
              <span className="text-[12px] text-chu-phu tabular-nums">
                Cao {dinhDangGia(Number(t!.h), le)} · Thấp {dinhDangGia(Number(t!.l), le)} · KL 24h {gon(Number(t!.v))}
              </span>
            </>
          )}
          <Link
            href={nguon === "ts" ? `/tai-san-so/${ma}` : `/co-phieu/${ma}`}
            className="ml-auto text-[12px] font-semibold text-nhan hover:underline"
          >
            {nguon === "ts" ? "Trang chi tiết" : "Phân tích, tài chính"} →
          </Link>
        </div>
        <BieuDoTuongTac key={`${nguon}:${ma}`} nguon={nguon} ma={ma} khiCoNen={khiCoNen} phienCK={phienCK} />
      </section>

      <aside className="border-t border-vien lg:border-t-0 xl:border-r xl:border-vien">
        {nguon === "ts" ? (
          coCap === false ? (
            <p className="p-4 text-chu-phu">{ma} không có cặp đang giao dịch trên Binance.</p>
          ) : (
            <>
              <div className="flex justify-end border-b border-vien px-3 py-1.5">
                <TrangThaiKetNoi trangThai={thiTruong.trangThai} />
              </div>
              <BangSoLenh ma={ma} soLenh={thiTruong.soLenh} khop={thiTruong.khop} le={le} soBuoc={14} />
            </>
          )
        ) : (
          <ThongTinCoPhieu cp={cp} nen={nen?.ma === ma ? nen.ds : null} phien={bangGia?.phien ?? null} />
        )}
      </aside>

      <aside className="h-[640px] border-t border-vien lg:col-span-2 xl:col-span-1 xl:h-auto xl:border-t-0">
        <DanhSachMa nguon={nguon} ma={ma} coPhieu={bangGia?.coPhieu ?? null} tienSo={tienSo} khiChon={khiChon} />
      </aside>
    </div>
  );
}
