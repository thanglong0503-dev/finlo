"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GiaChop } from "@/components/GiaChop";
import { NhanPhien } from "@/components/NhanPhien";
import { NutTheoDoi } from "@/components/NutTheoDoi";
import { giaNghin, khoiLuong, mauGia, phanTram, thayDoi, trieuDong, tyDong, vonHoa } from "@/lib/dinh-dang";
import type { BangGia, CoPhieu } from "@/lib/mofi";
import { useTheoDoi } from "@/lib/theo-doi";

const SAN = ["Tất cả", "HOSE", "HNX", "UPCOM", "Theo dõi"] as const;
const MOI_TRANG = 50;

// Nước ngoài mua ròng (triệu đồng) và tỷ lệ mua chủ động (%)
const nnRong = (cp: CoPhieu) => (cp.nnMua != null && cp.nnBan != null ? cp.nnMua - cp.nnBan : null);
const tyLeMuaCD = (cp: CoPhieu) => {
  const tong = (cp.muaCD ?? 0) + (cp.banCD ?? 0);
  return tong > 0 ? ((cp.muaCD ?? 0) / tong) * 100 : null;
};

type Cot = { khoa: string; nhan: string; lay: (cp: CoPhieu) => number | string | null; an?: string };

const COT: Cot[] = [
  { khoa: "ma", nhan: "Mã", lay: (cp) => cp.ma },
  { khoa: "gia", nhan: "Giá", lay: (cp) => cp.gia },
  { khoa: "phanTram", nhan: "+/- %", lay: (cp) => cp.phanTram },
  { khoa: "khoiLuong", nhan: "Khối lượng", lay: (cp) => cp.khoiLuong, an: "hidden sm:table-cell" },
  { khoa: "giaTri", nhan: "Giá trị", lay: (cp) => cp.giaTri },
  { khoa: "nnRong", nhan: "NN ròng", lay: nnRong, an: "hidden lg:table-cell" },
  { khoa: "muaCD", nhan: "Mua CĐ", lay: tyLeMuaCD, an: "hidden lg:table-cell" },
  { khoa: "vonHoa", nhan: "Vốn hoá", lay: (cp) => cp.vonHoa, an: "hidden xl:table-cell" },
];

export function BangGiaClient({ duLieuDau }: { duLieuDau: BangGia }) {
  const [duLieu, setDuLieu] = useState(duLieuDau);
  const [tuKhoa, setTuKhoa] = useState("");
  const [san, setSan] = useState<(typeof SAN)[number]>("Tất cả");
  const [sapXep, setSapXep] = useState<{ cot: string; giam: boolean }>({ cot: "giaTri", giam: true });
  const [soDong, setSoDong] = useState(MOI_TRANG);
  const theoDoi = useTheoDoi();

  // Làm mới mỗi 30 giây: trong phiên, ảnh chụp bảng giá đổi mỗi phút
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/bang-gia");
        if (res.ok) setDuLieu(await res.json());
      } catch {
        // Mất mạng tạm thời: giữ dữ liệu cũ, lần sau thử lại
      }
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const ds = useMemo(() => {
    const tk = tuKhoa.trim().toUpperCase();
    const loc = duLieu.coPhieu.filter(
      (cp) =>
        (san === "Tất cả" || (san === "Theo dõi" ? theoDoi.includes(cp.ma) : cp.san === san)) &&
        (!tk || cp.ma.includes(tk) || cp.ten.toUpperCase().includes(tk)),
    );
    const cot = COT.find((c) => c.khoa === sapXep.cot) ?? COT[4];
    const huong = sapXep.giam ? -1 : 1;
    return loc.sort((a, b) => {
      const x = cot.lay(a);
      const y = cot.lay(b);
      if (typeof x === "string") return x.localeCompare(y as string) * huong;
      // Ô trống luôn xuống cuối
      if (x == null) return 1;
      if (y == null) return -1;
      return (x - (y as number)) * huong;
    });
  }, [duLieu, tuKhoa, san, sapXep, theoDoi]);

  const doiSapXep = (cot: string) =>
    setSapXep((s) => (s.cot === cot ? { cot, giam: !s.giam } : { cot, giam: cot !== "ma" }));

  return (
    <>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-chu-phu">
        <NhanPhien phien={duLieu.phien} />
        <span>· {ds.length.toLocaleString("vi-VN")} mã · giá nghìn đồng</span>
      </p>
      <p className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-chu-phu">
        <span>
          <span className="mr-1 inline-block h-2 w-2 bg-tran" /> Trần
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 bg-tang" /> Tăng
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 bg-dung" /> Tham chiếu
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 bg-giam" /> Giảm
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 bg-san-gia" /> Sàn
        </span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={tuKhoa}
          onChange={(e) => {
            setTuKhoa(e.target.value);
            setSoDong(MOI_TRANG);
          }}
          placeholder="Tìm mã hoặc tên công ty…"
          className="h-9 w-full border border-vien bg-nen px-4 outline-none focus:border-nhan sm:w-72 rounded-full"
        />
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-nen-noi p-1">
          {SAN.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSan(s);
                setSoDong(MOI_TRANG);
              }}
              className={`h-7 rounded-full px-4 font-medium whitespace-nowrap ${san === s ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
            >
              {s}
              {s === "Theo dõi" && theoDoi.length > 0 && ` (${theoDoi.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto border border-vien rounded-2xl">
        <table className="w-full">
          <thead className="border-b border-vien text-[10px] font-bold tracking-wider text-chu-phu uppercase">
            <tr>
              <th className="w-8 py-2 pl-2" aria-label="Theo dõi" />
              {COT.map((c) => (
                <th
                  key={c.khoa}
                  className={`px-3 py-2 ${c.khoa === "ma" ? "text-left" : "text-right"} ${c.an ?? ""}`}
                >
                  <button onClick={() => doiSapXep(c.khoa)} className="hover:text-chu">
                    {c.nhan}
                    {sapXep.cot === c.khoa && (sapXep.giam ? " ↓" : " ↑")}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-vien">
            {ds.slice(0, soDong).map((cp) => {
              const mau = mauGia(cp);
              const rong = nnRong(cp);
              const cd = tyLeMuaCD(cp);
              return (
                <tr key={cp.ma} className="hover:bg-nhan-nhat">
                  <td className="py-2 pl-2">
                    <NutTheoDoi ma={cp.ma} gon />
                  </td>
                  <td className="max-w-[12rem] px-3 py-2 sm:max-w-xs">
                    <Link href={`/co-phieu/${cp.ma}`} className="block">
                      <span className={`font-semibold ${mau}`}>{cp.ma}</span>
                      <span className="ml-2 text-[11px] text-chu-phu">{cp.san}</span>
                      <div className="truncate text-[11px] text-chu-phu">
                        {cp.thamChieu != null ? (
                          <span className="tabular-nums">
                            <span className="text-tran">{giaNghin(cp.tran!)}</span> ·{" "}
                            <span className="text-dung">{giaNghin(cp.thamChieu)}</span> ·{" "}
                            <span className="text-san-gia">{giaNghin(cp.giaSan!)}</span>
                          </span>
                        ) : (
                          cp.ten
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${mau}`}>
                    <GiaChop gia={cp.gia} className="px-1">
                      {giaNghin(cp.gia)}
                    </GiaChop>
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${mau}`}>
                    <div>{phanTram(cp.phanTram)}</div>
                    <div className="text-[11px] opacity-80">{thayDoi(cp.thayDoi / 1000)}</div>
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{khoiLuong(cp.khoiLuong)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tyDong(cp.giaTri)}</td>
                  <td
                    className={`hidden px-3 py-2 text-right tabular-nums lg:table-cell ${
                      rong == null || rong === 0 ? "text-chu-phu" : rong > 0 ? "text-tang" : "text-giam"
                    }`}
                  >
                    {rong == null ? "—" : rong === 0 ? "0" : `${rong > 0 ? "+" : "−"}${trieuDong(Math.abs(rong))}`}
                  </td>
                  <td className="hidden px-3 py-2 lg:table-cell">
                    {cd == null ? (
                      <span className="block text-right text-chu-phu">—</span>
                    ) : (
                      <div className="ml-auto w-20" title={`Mua chủ động ${cd.toFixed(0)}%, bán chủ động ${(100 - cd).toFixed(0)}%`}>
                        <div className="text-right text-[11px] tabular-nums">{cd.toFixed(0)}%</div>
                        <div className="mt-0.5 flex h-1">
                          <div className="bg-tang" style={{ width: `${cd}%` }} />
                          <div className="flex-1 bg-giam" />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 text-right text-chu-phu tabular-nums xl:table-cell">
                    {vonHoa(cp.vonHoa)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ds.length === 0 && (
          <p className="p-8 text-center text-chu-phu">
            {san === "Theo dõi" && theoDoi.length === 0
              ? "Chưa theo dõi mã nào. Bấm ngôi sao ở đầu mỗi dòng để thêm vào danh mục."
              : "Không tìm thấy mã phù hợp."}
          </p>
        )}
      </div>
      <p className="mt-2 text-[11px] text-chu-phu">
        Dòng nhỏ dưới mã: giá trần · tham chiếu · sàn. NN ròng: giá trị nước ngoài mua trừ bán. Mua CĐ: tỷ lệ khối
        lượng mua chủ động. Trong giờ giao dịch dữ liệu cập nhật mỗi phút.
      </p>

      {soDong < ds.length && (
        <div className="mt-5 text-center">
          <button
            onClick={() => setSoDong((n) => n + MOI_TRANG)}
            className="h-9 border border-nhan px-5 font-medium text-nhan hover:bg-nhan hover:text-white rounded-full"
          >
            Xem thêm {Math.min(MOI_TRANG, ds.length - soDong)} mã
          </button>
        </div>
      )}
    </>
  );
}
