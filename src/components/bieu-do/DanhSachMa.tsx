"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Nguon } from "@/components/bieu-do/BieuDoTuongTac";
import { GiaChop } from "@/components/GiaChop";
import { LogoMa } from "@/components/LogoMa";
import { NutTheoDoi } from "@/components/NutTheoDoi";
import { dinhDangGia, useLuongBinance } from "@/lib/binance";
import { giaNghin, mauTangGiam, phanTram } from "@/lib/dinh-dang";
import type { CoPhieu, TienSoTop } from "@/lib/mofi";
import type { DanhSachKhac } from "@/lib/ro-ma";
import { useTheoDoi } from "@/lib/theo-doi";

const SO_DONG = 80;

// Bộ lọc chứng khoán kiểu Mofi: sàn hoặc rổ chỉ số, ngành, và các nhóm ETF / phái sinh / chứng quyền
const SAN_RO = ["HOSE", "HNX", "UPCOM", "VN30", "VN100", "HNX30", "VNDIAMOND", "VNFINLEAD", "VNFINSELECT"];
type Nhom = "cp" | "etf" | "phaiSinh" | "chungQuyen";
const NHOM: { ma: Exclude<Nhom, "cp">; nhan: string }[] = [
  { ma: "etf", nhan: "ETF" },
  { ma: "phaiSinh", nhan: "Phái sinh" },
  { ma: "chungQuyen", nhan: "Chứng quyền" },
];

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
  logo,
}: {
  nguon: Nguon;
  ma: string;
  coPhieu: CoPhieu[] | null;
  tienSo: TienSoTop[] | null;
  khiChon: (nguon: Nguon, ma: string) => void;
  logo: Record<string, string>;
}) {
  const [tab, setTab] = useState<Nguon>(nguon);
  const [tuKhoa, setTuKhoa] = useState("");
  const [chiTheoDoi, setChiTheoDoi] = useState(false);
  const theoDoi = useTheoDoi();
  const [sanRo, setSanRo] = useState("");
  const [nganh, setNganh] = useState("");
  const [nhom, setNhom] = useState<Nhom>("cp");
  const [khac, setKhac] = useState<DanhSachKhac | null>(null);
  const daTai = useRef(false);
  // Danh sách rổ, ngành, ETF… chỉ tải khi mở tab chứng khoán; giá ETF, chứng quyền làm mới mỗi phút
  useEffect(() => {
    if (tab !== "ck") return;
    let huy = false;
    const tai = () =>
      fetch("/api/danh-sach-khac")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: DanhSachKhac | null) => {
          if (!huy && d) setKhac(d);
        })
        .catch(() => {});
    if (!daTai.current) {
      daTai.current = true;
      tai();
    }
    const id = setInterval(tai, 60_000);
    return () => {
      huy = true;
      clearInterval(id);
    };
  }, [tab]);
  const dsNganh = useMemo(
    () => (khac ? Object.entries(khac.nganh.ten).sort((a, b) => a[1].localeCompare(b[1], "vi")) : []),
    [khac],
  );

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
      if (nhom !== "cp") {
        if (!khac) return null;
        return loc(khac[nhom]).map((x) => ({ ...x, dinhDang: giaNghin }));
      }
      if (!coPhieu) return null;
      const ro = sanRo && khac?.ro[sanRo] ? new Set(khac.ro[sanRo]) : null;
      const theoBo = coPhieu.filter(
        (c) =>
          (!sanRo || (ro ? ro.has(c.ma) : c.san === sanRo)) &&
          (!nganh || khac?.nganh.maNganh[c.ma] === nganh),
      );
      // Mặc định sắp theo giá trị giao dịch (mã sôi động lên đầu); đang lọc thì hiện đủ
      return loc(theoBo)
        .slice(0, sanRo || nganh || tk ? undefined : SO_DONG)
        .map((c) => ({ ma: c.ma, ten: c.ten, gia: c.gia, phanTram: c.phanTram, dinhDang: giaNghin }));
    }
    if (!tienSo) return null;
    return loc(tienSo).map((x) => {
      const s = giaSong[x.ma];
      return { ma: x.ma, ten: x.ten, gia: s?.gia ?? x.gia, phanTram: s?.phanTram ?? null, dinhDang: (g: number) => dinhDangGia(g) };
    });
  }, [tab, coPhieu, tienSo, tuKhoa, chiTheoDoi, theoDoi, giaSong, nhom, khac, sanRo, nganh]);

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
          className="h-8 min-w-0 flex-1 border border-vien bg-nen px-4 outline-none focus:border-nhan rounded-full"
        />
        <button
          onClick={() => setChiTheoDoi((x) => !x)}
          title="Chỉ hiện mã đang theo dõi"
          className={`h-8 rounded-full border px-3 text-[12px] font-medium ${
            chiTheoDoi ? "border-nhan bg-nhan text-white" : "border-vien text-chu-phu hover:text-chu"
          }`}
        >
          Theo dõi
        </button>
      </div>
      {tab === "ck" && (
        <div className="flex flex-wrap items-center gap-1 border-b border-vien p-2 text-[12px]">
          <select
            value={sanRo}
            onChange={(e) => {
              setSanRo(e.target.value);
              setNhom("cp");
            }}
            aria-label="Sàn hoặc rổ chỉ số"
            className={`h-7 max-w-[7.5rem] rounded-full border bg-nen px-2 outline-none ${sanRo && nhom === "cp" ? "border-nhan text-nhan" : "border-vien"}`}
          >
            <option value="">Sàn / Rổ</option>
            {SAN_RO.filter((x) => x === "HOSE" || x === "HNX" || x === "UPCOM" || khac?.ro[x]).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select
            value={nganh}
            onChange={(e) => {
              setNganh(e.target.value);
              setNhom("cp");
            }}
            aria-label="Ngành"
            className={`h-7 max-w-[7.5rem] rounded-full border bg-nen px-2 outline-none ${nganh && nhom === "cp" ? "border-nhan text-nhan" : "border-vien"}`}
          >
            <option value="">Ngành</option>
            {dsNganh.map(([k, ten]) => (
              <option key={k} value={k}>
                {ten}
              </option>
            ))}
          </select>
          {NHOM.map((n) => (
            <button
              key={n.ma}
              onClick={() => setNhom((x) => (x === n.ma ? "cp" : n.ma))}
              className={`h-7 rounded-full border px-2.5 font-medium ${
                nhom === n.ma ? "border-nhan bg-nhan text-white" : "border-vien text-chu-phu hover:text-chu"
              }`}
            >
              {n.nhan}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[24px_22px_1fr_auto_64px] gap-x-1 px-2 py-1.5 text-[12px] font-medium text-chu-phu">
        <span />
        <span />
        <span className="pl-1">Mã</span>
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
                className={`grid cursor-pointer grid-cols-[24px_22px_1fr_auto_64px] items-center gap-x-1 border-b border-vien px-2 py-1.5 ${
                  dangChon ? "bg-nhan-nhat shadow-[inset_2px_0_0_0_var(--nhan)]" : "hover:bg-nen-phu"
                }`}
                onClick={() => khiChon(tab, d.ma)}
              >
                <span onClick={(e) => e.stopPropagation()}>
                  <NutTheoDoi ma={d.ma} gon />
                </span>
                {tab === "ck" && nhom === "cp" ? <LogoMa ma={d.ma} url={logo[d.ma]} co={20} /> : <span />}
                <span className="min-w-0 pl-1">
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
