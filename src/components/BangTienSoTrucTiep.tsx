"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { GiaChop } from "@/components/GiaChop";
import { dinhDangGia, TrangThaiKetNoi, useLuongBinance } from "@/lib/binance";
import { usdGon } from "@/lib/dinh-dang";
import type { TienSoTop } from "@/lib/mofi";

type MiniTicker = { s: string; c: string; o: string };
type GiaSong = { gia: number; phanTram: number };

// Bảng top tiền số: giá và % 24h cập nhật realtime từ Binance, ô giá chớp khi đổi.
// Đồng không có cặp USDT trên Binance (hoặc chính USDT) giữ giá theo bảng vốn hoá.
export function BangTienSoTrucTiep({ ds, tyGia }: { ds: TienSoTop[]; tyGia: number }) {
  const luong = ds.filter((x) => x.ma !== "USDT" && /^[A-Z0-9]+$/.test(x.ma)).map((x) => `${x.ma.toLowerCase()}usdt@miniTicker`);

  const moi = useRef<Record<string, GiaSong>>({});
  const coMoi = useRef(false);
  const [song, setSong] = useState<Record<string, GiaSong>>({});

  const nhanTin = useCallback((_: string, duLieu: unknown) => {
    const t = duLieu as MiniTicker;
    const gia = Number(t.c);
    moi.current[t.s.replace(/USDT$/, "")] = { gia, phanTram: (gia / Number(t.o) - 1) * 100 };
    coMoi.current = true;
  }, []);
  const trangThai = useLuongBinance(luong, nhanTin);

  // Gom tin, vẽ lại tối đa mỗi giây (Binance gửi mini ticker mỗi giây)
  useEffect(() => {
    const id = setInterval(() => {
      if (!coMoi.current) return;
      coMoi.current = false;
      setSong({ ...moi.current });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="mt-4 flex justify-end">
        <TrangThaiKetNoi trangThai={trangThai} />
      </div>
      <div className="mt-2 overflow-x-auto border border-vien border-t-2 border-t-nhan">
        <table className="w-full">
          <thead className="border-b border-vien text-[10px] font-bold tracking-wider text-chu-phu uppercase">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Tài sản</th>
              <th className="px-3 py-2 text-right">Giá (USD)</th>
              <th className="px-3 py-2 text-right">24h</th>
              <th className="hidden px-3 py-2 text-right sm:table-cell">Giá (VND)</th>
              <th className="px-3 py-2 text-right">Vốn hoá</th>
              <th className="hidden px-3 py-2 text-right md:table-cell">Thị phần</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((x) => {
              const s = song[x.ma];
              const gia = s?.gia ?? x.gia;
              return (
                <tr key={x.ma} className="border-t border-vien hover:bg-nhan-nhat">
                  <td className="px-3 py-2 text-chu-phu tabular-nums">{x.hang}</td>
                  <td className="px-3 py-2">
                    <Link href={`/tai-san-so/${x.ma}`} className="font-semibold hover:underline">
                      {x.ma}
                    </Link>
                    <span className="ml-2 text-[11px] text-chu-phu">{x.ten}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    <GiaChop gia={gia} className="px-1">
                      {dinhDangGia(gia)}
                    </GiaChop>
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      !s ? "text-chu-phu" : s.phanTram > 0 ? "text-tang" : s.phanTram < 0 ? "text-giam" : ""
                    }`}
                  >
                    {s ? `${s.phanTram > 0 ? "+" : ""}${s.phanTram.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%` : "—"}
                  </td>
                  <td className="hidden px-3 py-2 text-right text-chu-phu tabular-nums sm:table-cell">
                    {Math.round(gia * tyGia).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">${usdGon(x.vonHoa)}</td>
                  <td className="hidden px-3 py-2 text-right text-chu-phu tabular-nums md:table-cell">
                    {x.thiPhan.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
