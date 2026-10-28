"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NutTheoDoi } from "@/components/NutTheoDoi";
import { giaNghin, mauTangGiam, phanTram, tyDong } from "@/lib/dinh-dang";
import type { BangGia, CoPhieu } from "@/lib/mofi";
import { useTheoDoi } from "@/lib/theo-doi";

// Giữ bảng giá đã tải trong 60 giây để quay lại trang chủ không phải tải lại
let boNho: { luc: number; duLieu: Promise<BangGia> } | null = null;
function layBangGia() {
  if (!boNho || Date.now() - boNho.luc > 60_000) {
    boNho = {
      luc: Date.now(),
      duLieu: fetch("/api/bang-gia").then((r) => {
        if (!r.ok) throw new Error("Không tải được bảng giá");
        return r.json();
      }),
    };
  }
  return boNho.duLieu;
}

export function DanhMucTheoDoi() {
  const theoDoi = useTheoDoi();
  const [ds, setDs] = useState<CoPhieu[] | null>(null);

  useEffect(() => {
    if (theoDoi.length === 0) return;
    let conDung = true;
    layBangGia()
      .then((bg) => {
        if (conDung) setDs(bg.coPhieu.filter((cp) => theoDoi.includes(cp.ma)));
      })
      .catch(() => {
        boNho = null;
      });
    return () => {
      conDung = false;
    };
  }, [theoDoi]);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="nhan-muc">Của bạn</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Danh mục theo dõi</h2>
        </div>
        {theoDoi.length > 0 && (
          <Link href="/bang-gia" className="font-medium text-nhan hover:underline">
            Quản lý trong bảng giá →
          </Link>
        )}
      </div>

      {theoDoi.length === 0 ? (
        <div className="mt-6 border border-dashed border-nhan/50 bg-nhan-nhat px-5 py-6">
          <p className="font-semibold">Chưa có mã nào trong danh mục.</p>
          <p className="mt-1 text-chu-phu">
            Bấm ngôi sao trong bảng giá hoặc nút &quot;Theo dõi&quot; ở trang phân tích để thêm mã. Danh mục được lưu
            trên trình duyệt này.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border border-vien border-t-2 border-t-nhan">
          <table className="w-full">
            <thead className="border-b border-vien text-[10px] font-bold tracking-wider text-chu-phu uppercase">
              <tr>
                <th className="w-8 py-2 pl-2" aria-label="Theo dõi" />
                <th className="px-3 py-2 text-left">Mã</th>
                <th className="px-3 py-2 text-right">Giá</th>
                <th className="px-3 py-2 text-right">+/- %</th>
                <th className="hidden px-3 py-2 text-right sm:table-cell">Giá trị GD</th>
              </tr>
            </thead>
            <tbody>
              {(ds ?? theoDoi.map((ma) => ({ ma }) as CoPhieu)).map((cp) => (
                <tr key={cp.ma} className="border-t border-vien hover:bg-nhan-nhat">
                  <td className="py-2 pl-2">
                    <NutTheoDoi ma={cp.ma} gon />
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/co-phieu/${cp.ma}`} className="font-semibold hover:underline">
                      {cp.ma}
                    </Link>
                    {cp.ten && <span className="ml-2 hidden text-[11px] text-chu-phu sm:inline">{cp.ten}</span>}
                  </td>
                  {ds ? (
                    <>
                      <td className={`px-3 py-2 text-right font-semibold tabular-nums ${mauTangGiam(cp.phanTram)}`}>
                        {giaNghin(cp.gia)}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums ${mauTangGiam(cp.phanTram)}`}>
                        {phanTram(cp.phanTram)}
                      </td>
                      <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{tyDong(cp.giaTri)}</td>
                    </>
                  ) : (
                    <td colSpan={3} className="px-3 py-2">
                      <div className="ml-auto h-3 w-24 animate-pulse bg-nen-phu" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
