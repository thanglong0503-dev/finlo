"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { giaNghin, khoiLuong, mauTangGiam, phanTram, thayDoi, tyDong, vonHoa } from "@/lib/dinh-dang";
import type { BangGia, CoPhieu } from "@/lib/mofi";

const SAN = ["Tất cả", "HOSE", "HNX", "UPCOM"] as const;
const MOI_TRANG = 50;

type Cot = "ma" | "gia" | "phanTram" | "khoiLuong" | "giaTri" | "vonHoa";

const COT: { khoa: Cot; nhan: string; canPhai: boolean; anTrenDiDong?: boolean }[] = [
  { khoa: "ma", nhan: "Mã", canPhai: false },
  { khoa: "gia", nhan: "Giá", canPhai: true },
  { khoa: "phanTram", nhan: "+/- %", canPhai: true },
  { khoa: "khoiLuong", nhan: "Khối lượng", canPhai: true, anTrenDiDong: true },
  { khoa: "giaTri", nhan: "Giá trị", canPhai: true },
  { khoa: "vonHoa", nhan: "Vốn hoá", canPhai: true, anTrenDiDong: true },
];

export function BangGiaClient({ duLieuDau }: { duLieuDau: BangGia }) {
  const [duLieu, setDuLieu] = useState(duLieuDau);
  const [tuKhoa, setTuKhoa] = useState("");
  const [san, setSan] = useState<(typeof SAN)[number]>("Tất cả");
  const [sapXep, setSapXep] = useState<{ cot: Cot; giam: boolean }>({ cot: "giaTri", giam: true });
  const [soDong, setSoDong] = useState(MOI_TRANG);

  // Làm mới giá mỗi 60 giây
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/bang-gia");
        if (res.ok) setDuLieu(await res.json());
      } catch {
        // Mất mạng tạm thời: giữ dữ liệu cũ, lần sau thử lại
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const ds = useMemo(() => {
    const tk = tuKhoa.trim().toUpperCase();
    const loc = duLieu.coPhieu.filter(
      (cp) =>
        (san === "Tất cả" || cp.san === san) &&
        (!tk || cp.ma.includes(tk) || cp.ten.toUpperCase().includes(tk)),
    );
    const huong = sapXep.giam ? -1 : 1;
    return loc.sort((a, b) => {
      const x = a[sapXep.cot as keyof CoPhieu];
      const y = b[sapXep.cot as keyof CoPhieu];
      if (typeof x === "string") return x.localeCompare(y as string) * huong;
      return (((x as number | null) ?? 0) - ((y as number | null) ?? 0)) * huong;
    });
  }, [duLieu, tuKhoa, san, sapXep]);

  const doiSapXep = (cot: Cot) =>
    setSapXep((s) => (s.cot === cot ? { cot, giam: !s.giam } : { cot, giam: cot !== "ma" }));

  const capNhat = new Date(duLieu.capNhat).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh", // cố định múi giờ để server (UTC) và trình duyệt hiển thị giống nhau
  });

  return (
    <>
      <p className="mt-1 text-sm text-chu-phu">
        {ds.length.toLocaleString("vi-VN")} mã · cập nhật lúc {capNhat} · giá theo nghìn đồng
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={tuKhoa}
          onChange={(e) => {
            setTuKhoa(e.target.value);
            setSoDong(MOI_TRANG);
          }}
          placeholder="Tìm mã hoặc tên công ty…"
          className="h-9 w-full border border-vien bg-nen px-3 outline-none focus:border-nhan sm:w-72"
        />
        <div className="flex border border-vien">
          {SAN.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSan(s);
                setSoDong(MOI_TRANG);
              }}
              className={`h-9 px-4 font-medium ${san === s ? "bg-nhan text-white" : "text-chu-phu hover:text-chu"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto border border-vien border-t-2 border-t-nhan">
        <table className="w-full">
          <thead className="border-b border-vien text-[10px] font-bold tracking-wider text-chu-phu uppercase">
            <tr>
              {COT.map((c) => (
                <th
                  key={c.khoa}
                  className={`px-3 py-2 ${c.canPhai ? "text-right" : "text-left"} ${c.anTrenDiDong ? "hidden sm:table-cell" : ""}`}
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
            {ds.slice(0, soDong).map((cp) => (
              <tr key={cp.ma} className="hover:bg-nhan-nhat">
                <td className="max-w-[12rem] px-3 py-2 sm:max-w-xs">
                  <Link href={`/co-phieu/${cp.ma}`} className="block">
                    <span className="font-semibold">{cp.ma}</span>
                    <span className="ml-2 text-[11px] text-chu-phu">{cp.san}</span>
                    <div className="truncate text-[11px] text-chu-phu">{cp.ten}</div>
                  </Link>
                </td>
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${mauTangGiam(cp.phanTram)}`}>
                  {giaNghin(cp.gia)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${mauTangGiam(cp.phanTram)}`}>
                  <div>{phanTram(cp.phanTram)}</div>
                  <div className="text-[11px] opacity-80">{thayDoi(cp.thayDoi / 1000)}</div>
                </td>
                <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{khoiLuong(cp.khoiLuong)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{tyDong(cp.giaTri)}</td>
                <td className="hidden px-3 py-2 text-right text-chu-phu tabular-nums sm:table-cell">
                  {vonHoa(cp.vonHoa)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ds.length === 0 && <p className="p-8 text-center text-chu-phu">Không tìm thấy mã phù hợp.</p>}
      </div>

      {soDong < ds.length && (
        <div className="mt-5 text-center">
          <button
            onClick={() => setSoDong((n) => n + MOI_TRANG)}
            className="h-9 border border-nhan px-5 font-medium text-nhan hover:bg-nhan hover:text-white"
          >
            Xem thêm {Math.min(MOI_TRANG, ds.length - soDong)} mã
          </button>
        </div>
      )}
    </>
  );
}
