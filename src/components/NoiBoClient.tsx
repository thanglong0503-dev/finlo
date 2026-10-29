"use client";

import { useState } from "react";
import { soNguyen, tyDong } from "@/lib/dinh-dang";
import type { GiaoDichNoiBo } from "@/lib/mofi";

type LocChieu = "tat-ca" | "mua" | "ban";
type LocTrangThai = "tat-ca" | "xong" | "dang-ky";

const ngayVN = (s: string | null) => (s ? s.split("-").reverse().join("/") : "—");

function NutLoc<T extends string>({ ds, gt, doi }: { ds: { ma: T; nhan: string }[]; gt: T; doi: (x: T) => void }) {
  return (
    <div className="flex border border-vien">
      {ds.map((x) => (
        <button
          key={x.ma}
          onClick={() => doi(x.ma)}
          className={`h-8 border-r border-vien px-3 text-[12px] font-semibold last:border-r-0 ${
            gt === x.ma ? "bg-toi text-chu-toi" : "text-chu-phu hover:text-chu"
          }`}
        >
          {x.nhan}
        </button>
      ))}
    </div>
  );
}

// Bảng giao dịch nội bộ: lọc theo chiều mua/bán và trạng thái, xem thêm theo trang 30 dòng
export function NoiBoClient({ dong }: { dong: GiaoDichNoiBo[] }) {
  const [chieu, setChieu] = useState<LocChieu>("tat-ca");
  const [trangThai, setTrangThai] = useState<LocTrangThai>("tat-ca");
  const [soDong, setSoDong] = useState(30);

  const loc = dong.filter(
    (d) =>
      (chieu === "tat-ca" || (chieu === "mua") === d.mua) &&
      (trangThai === "tat-ca" || (trangThai === "xong") === d.daXong),
  );

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="nhan-muc">Chi tiết</p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Lịch sử giao dịch</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <NutLoc
            ds={[
              { ma: "tat-ca", nhan: "Tất cả" },
              { ma: "mua", nhan: "Mua" },
              { ma: "ban", nhan: "Bán" },
            ]}
            gt={chieu}
            doi={(x) => {
              setChieu(x);
              setSoDong(30);
            }}
          />
          <NutLoc
            ds={[
              { ma: "tat-ca", nhan: "Mọi trạng thái" },
              { ma: "xong", nhan: "Đã thực hiện" },
              { ma: "dang-ky", nhan: "Đăng ký" },
            ]}
            gt={trangThai}
            doi={(x) => {
              setTrangThai(x);
              setSoDong(30);
            }}
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto border border-vien">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-vien text-left text-[12px] text-chu-phu">
              <th className="px-3 py-2 font-medium">Ngày GD</th>
              <th className="px-3 py-2 font-medium">Người giao dịch</th>
              <th className="px-3 py-2 font-medium">Loại</th>
              <th className="px-3 py-2 text-right font-medium">Khối lượng</th>
              <th className="px-3 py-2 text-right font-medium">Giá trị ước tính</th>
              <th className="px-3 py-2 text-right font-medium">Sở hữu sau GD</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loc.slice(0, soDong).map((d, i) => (
              <tr key={i} className="border-b border-vien align-top last:border-b-0">
                <td className="px-3 py-2 tabular-nums">
                  {ngayVN(d.ngay)}
                  {d.congBo && <span className="block text-[11px] text-chu-phu">CB {ngayVN(d.congBo)}</span>}
                </td>
                <td className="px-3 py-2">
                  <span className="font-medium">{d.ten}</span>
                  {d.toChuc && <span className="ml-1.5 border border-vien px-1 text-[10px] text-chu-phu">Tổ chức</span>}
                  {d.chucVu && <span className="block text-[12px] text-chu-phu">{d.chucVu}</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-block w-10 text-center text-[11px] font-bold text-white ${d.mua ? "bg-tang" : "bg-giam"}`}>
                    {d.mua ? "MUA" : "BÁN"}
                  </span>
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${d.mua ? "text-tang" : "text-giam"}`}>
                  {d.mua ? "+" : "−"}
                  {soNguyen(d.soCp)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{d.giaTri != null ? tyDong(d.giaTri) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {/* Lệnh mới đăng ký chưa có số sở hữu sau giao dịch (nguồn ghi 0) */}
                  {d.cpSau ? soNguyen(d.cpSau) : "—"}
                  {d.cpSau != null && d.cpSau > 0 && d.tyLeSau != null && (
                    <span className="block text-[11px] text-chu-phu">
                      {(d.tyLeSau * 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%
                    </span>
                  )}
                </td>
                <td className={`px-3 py-2 text-[12px] ${d.daXong ? "" : "text-chu-phu"}`}>{d.trangThai}</td>
              </tr>
            ))}
            {loc.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-chu-phu">
                  Không có giao dịch phù hợp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loc.length > soDong && (
        <button
          onClick={() => setSoDong((x) => x + 30)}
          className="mt-3 h-9 border border-vien px-4 font-semibold hover:border-nhan hover:text-nhan"
        >
          Xem thêm ({loc.length - soDong} giao dịch)
        </button>
      )}
    </section>
  );
}
