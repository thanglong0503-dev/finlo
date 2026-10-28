"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Nguon } from "@/components/bieu-do/BieuDoTuongTac";
import { GiaChop } from "@/components/GiaChop";
import { NutTheoDoi } from "@/components/NutTheoDoi";
import { dinhDangGia, useLuongBinance } from "@/lib/binance";
import { giaNghin, mauTangGiam, phanTram } from "@/lib/dinh-dang";
import type { CoPhieu, TienSoTop } from "@/lib/mofi";
import { useTheoDoi } from "@/lib/theo-doi";

const SO_DONG = 80;

const boDau = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

type Dong = { ma: string; ten: string; gia: number; phanTram: number | null; dinhDang: (x: number) => string };

// Danh sách mã bên phải trang biểu đồ: đổi qua lại chứng khoán / tài sản số, tìm kiếm, lọc mã theo dõi
export function DanhSachMa({
  nguon,
  ma,
  coPhieu,
  tienSo,
  khiChon,
}: {
  nguon: Nguon;
  ma: string;
  coPhieu: CoPhieu[] | null;
  tienSo: TienSoTop[] | null;
  khiChon: (nguon: Nguon, ma: string) => void;
}) {
  const [tab, setTab] = useState<Nguon>(nguon);
  const [tuKhoa, setTuKhoa] = useState("");
  const [chiTheoDoi, setChiTheoDoi] = useState(false);
  const theoDoi = useTheoDoi();

  // Giá tiền số realtime chỉ khi đang xem tab tài sản số (đỡ tốn dữ liệu)
  const song = useRef<Record<string, { gia: number; phanTram: number }>>({});
  const coMoi = useRef(false);
  const [giaSong, setGiaSong] = useState<Record<string, { gia: number; phanTram: number }>>({});
  const nhanTin = useCallback((_: string, d: unknown) => {
    const t = d as { s: string; c: string; o: string };
    const gia = Number(t.c);
    song.current[t.s.replace(/USDT$/, "")] = { gia, phanTram: (gia / Number(t.o) - 1) * 100 };
    coMoi.current = true;
  }, []);
  useLuongBinance(
    tab === "ts" && tienSo
      ? tienSo.filter((x) => x.ma !== "USDT" && /^[A-Z0-9]+$/.test(x.ma)).map((x) => `${x.ma.toLowerCase()}usdt@miniTicker`)
      : [],
    nhanTin,
  );
  useEffect(() => {
    const id = setInterval(() => {
      if (!coMoi.current) return;
      coMoi.current = false;
      setGiaSong({ ...song.current });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const dong: Dong[] | null = useMemo(() => {
    const tk = boDau(tuKhoa.trim());
    const loc = <T extends { ma: string; ten: string }>(ds: T[]) =>
      ds.filter(
        (x) =>
          (!chiTheoDoi || theoDoi.includes(x.ma)) &&
          (!tk || boDau(x.ma).includes(tk) || boDau(x.ten).includes(tk)),
      );
    if (tab === "ck") {
      if (!coPhieu) return null;
      // Mặc định sắp theo giá trị giao dịch (mã sôi động lên đầu)
      return loc(coPhieu)
        .slice(0, SO_DONG)
        .map((c) => ({ ma: c.ma, ten: c.ten, gia: c.gia, phanTram: c.phanTram, dinhDang: giaNghin }));
    }
    if (!tienSo) return null;
    return loc(tienSo).map((x) => {
      const s = giaSong[x.ma];
      return { ma: x.ma, ten: x.ten, gia: s?.gia ?? x.gia, phanTram: s?.phanTram ?? null, dinhDang: (g: number) => dinhDangGia(g) };
    });
  }, [tab, coPhieu, tienSo, tuKhoa, chiTheoDoi, theoDoi, giaSong]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-vien">
        {[
          { ma: "ck" as const, nhan: "Chứng khoán" },
          { ma: "ts" as const, nhan: "Tài sản số" },
        ].map((o) => (
          <button
            key={o.ma}
            onClick={() => setTab(o.ma)}
            className={`h-10 flex-1 font-semibold ${
              tab === o.ma ? "shadow-[inset_0_-2px_0_0_var(--nhan)]" : "text-chu-phu hover:text-chu"
            }`}
          >
            {o.nhan}
          </button>
        ))}
      </div>
      <div className="flex gap-1 border-b border-vien p-2">
        <input
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
          placeholder="Tìm mã hoặc tên…"
          className="h-8 min-w-0 flex-1 border border-vien bg-nen px-2 outline-none focus:border-nhan"
        />
        <button
          onClick={() => setChiTheoDoi((x) => !x)}
          title="Chỉ hiện mã đang theo dõi"
          className={`h-8 border px-2 text-[12px] font-medium ${
            chiTheoDoi ? "border-nhan bg-nhan text-white" : "border-vien text-chu-phu hover:text-chu"
          }`}
        >
          Theo dõi
        </button>
      </div>
      <div className="grid grid-cols-[24px_1fr_auto_64px] gap-x-1 px-2 py-1.5 text-[10px] font-bold tracking-wider text-chu-phu uppercase">
        <span />
        <span>Mã</span>
        <span className="text-right">Giá</span>
        <span className="text-right">%</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {dong == null ? (
          <div className="m-2 h-64 animate-pulse bg-nen-phu" />
        ) : dong.length === 0 ? (
          <p className="p-4 text-center text-chu-phu">
            {chiTheoDoi ? "Chưa có mã theo dõi nào ở đây." : "Không tìm thấy mã phù hợp."}
          </p>
        ) : (
          dong.map((d) => {
            const dangChon = tab === nguon && d.ma === ma;
            return (
              <div
                key={d.ma}
                className={`grid cursor-pointer grid-cols-[24px_1fr_auto_64px] items-center gap-x-1 border-b border-vien px-2 py-1.5 ${
                  dangChon ? "bg-nhan-nhat shadow-[inset_2px_0_0_0_var(--nhan)]" : "hover:bg-nen-phu"
                }`}
                onClick={() => khiChon(tab, d.ma)}
              >
                <span onClick={(e) => e.stopPropagation()}>
                  <NutTheoDoi ma={d.ma} gon />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{d.ma}</span>
                  <span className="block truncate text-[11px] text-chu-phu">{d.ten}</span>
                </span>
                <span className={`text-right tabular-nums ${d.phanTram != null ? mauTangGiam(d.phanTram) : ""}`}>
                  <GiaChop gia={d.gia} className="px-0.5">
                    {d.dinhDang(d.gia)}
                  </GiaChop>
                </span>
                <span className={`text-right tabular-nums ${d.phanTram != null ? mauTangGiam(d.phanTram) : "text-chu-phu"}`}>
                  {d.phanTram != null ? phanTram(d.phanTram) : "—"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
