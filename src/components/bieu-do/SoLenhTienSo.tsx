"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { capGiaoDich, dinhDangGia, useLuongBinance, type TrangThai } from "@/lib/binance";

export type Ticker = { c: string; P: string; p: string; h: string; l: string; o: string; v: string; q: string };
type Depth = { bids: [string, string][]; asks: [string, string][] };
export type AggTrade = { p: string; q: string; T: number; m: boolean };

const SO_LENH_KHOP = 30;

// Giá 24h, sổ lệnh và lệnh khớp realtime của một cặp USDT trên Binance.
// Tin đến liên tục được ghi vào ref, cứ 300ms chụp vào state một lần (và chỉ khi có tin mới).
export function useThiTruongTienSo(ma: string, batDau = true) {
  const ten = capGiaoDich(ma).toLowerCase();
  const ticker = useRef<Ticker | null>(null);
  const soLenh = useRef<Depth | null>(null);
  const khop = useRef<AggTrade[]>([]);
  const coMoi = useRef(false);
  const [anh, setAnh] = useState<{ ticker: Ticker | null; soLenh: Depth | null; khop: AggTrade[] }>({
    ticker: null,
    soLenh: null,
    khop: [],
  });

  // Đổi mã thì bỏ dữ liệu của mã cũ (điều chỉnh state ngay khi vẽ)
  const [maTruoc, setMaTruoc] = useState(ma);
  if (maTruoc !== ma) {
    setMaTruoc(ma);
    setAnh({ ticker: null, soLenh: null, khop: [] });
  }

  useEffect(() => {
    ticker.current = null;
    soLenh.current = null;
    khop.current = [];
    const id = setInterval(() => {
      if (!coMoi.current) return;
      coMoi.current = false;
      setAnh({ ticker: ticker.current, soLenh: soLenh.current, khop: khop.current });
    }, 300);
    return () => clearInterval(id);
  }, [ma]);

  const nhanTin = useCallback((luong: string, duLieu: unknown) => {
    if (luong.endsWith("@ticker")) ticker.current = duLieu as Ticker;
    else if (luong.includes("@depth")) soLenh.current = duLieu as Depth;
    else if (luong.endsWith("@aggTrade")) khop.current = [duLieu as AggTrade, ...khop.current].slice(0, SO_LENH_KHOP);
    coMoi.current = true;
  }, []);

  const trangThai: TrangThai = useLuongBinance(
    batDau ? [`${ten}@ticker`, `${ten}@depth20@100ms`, `${ten}@aggTrade`] : [],
    nhanTin,
  );
  return { trangThai, ...anh };
}

// Sổ lệnh (bước giá mua/bán có thanh cộng dồn) và tab lệnh khớp
export function BangSoLenh({
  ma,
  soLenh,
  khop,
  le,
  soBuoc = 12,
}: {
  ma: string;
  soLenh: Depth | null;
  khop: AggTrade[];
  le: number;
  soBuoc?: number;
}) {
  const [tab, setTab] = useState<"so-lenh" | "khop">("so-lenh");

  const congDon = (ds: [string, string][]) => {
    let s = 0;
    return ds.slice(0, soBuoc).map(([p, q]) => {
      s += Number(q);
      return { gia: Number(p), kl: Number(q), tong: s };
    });
  };
  const ban = congDon(soLenh?.asks ?? []);
  const mua = congDon(soLenh?.bids ?? []);
  const lonNhat = Math.max(ban[ban.length - 1]?.tong ?? 0, mua[mua.length - 1]?.tong ?? 0, 1e-12);
  const chenh = ban[0] && mua[0] ? ban[0].gia - mua[0].gia : null;
  const cuoi = khop[0];

  return (
    <div>
      <div className="flex border-b border-vien">
        {[
          { ma: "so-lenh" as const, nhan: "Sổ lệnh" },
          { ma: "khop" as const, nhan: "Khớp lệnh" },
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
      <div className="grid grid-cols-3 px-3 py-1.5 text-[12px] font-medium text-chu-phu">
        <span>Giá (USDT)</span>
        <span className="text-right">KL ({ma})</span>
        <span className="text-right">{tab === "so-lenh" ? "Tổng" : "Giờ"}</span>
      </div>

      {tab === "so-lenh" ? (
        <div className="tabular-nums">
          {[...ban].reverse().map((d) => (
            <Dong key={`b${d.gia}`} d={d} lonNhat={lonNhat} le={le} ben="ban" />
          ))}
          <div className="flex items-center justify-between border-y border-vien px-3 py-2">
            {cuoi ? (
              <span className={`text-lg font-bold ${cuoi.m ? "text-giam" : "text-tang"}`}>
                {dinhDangGia(Number(cuoi.p), le)}
              </span>
            ) : (
              <span className="text-chu-phu">—</span>
            )}
            {chenh != null && <span className="text-[11px] text-chu-phu">chênh {dinhDangGia(chenh, le)}</span>}
          </div>
          {mua.map((d) => (
            <Dong key={`m${d.gia}`} d={d} lonNhat={lonNhat} le={le} ben="mua" />
          ))}
        </div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto tabular-nums">
          {khop.map((k, i) => (
            <div key={`${k.T}-${i}`} className="grid grid-cols-3 px-3 py-[3px]">
              {/* m = true: bên mua đặt sẵn, tức lệnh bán chủ động khớp vào -> đỏ */}
              <span className={k.m ? "text-giam" : "text-tang"}>{dinhDangGia(Number(k.p), le)}</span>
              <span className="text-right">{Number(k.q).toLocaleString("vi-VN", { maximumFractionDigits: 5 })}</span>
              <span className="text-right text-chu-phu">{new Date(k.T).toLocaleTimeString("vi-VN", { hour12: false })}</span>
            </div>
          ))}
          {khop.length === 0 && <p className="p-4 text-center text-chu-phu">Đang chờ lệnh khớp…</p>}
        </div>
      )}
    </div>
  );
}

function Dong({
  d,
  lonNhat,
  le,
  ben,
}: {
  d: { gia: number; kl: number; tong: number };
  lonNhat: number;
  le: number;
  ben: "mua" | "ban";
}) {
  const mau = ben === "mua" ? "var(--tang)" : "var(--giam)";
  return (
    <div
      className="grid grid-cols-3 px-3 py-[3px]"
      style={{
        background: `linear-gradient(to left, color-mix(in srgb, ${mau} 14%, transparent) ${(d.tong / lonNhat) * 100}%, transparent 0)`,
      }}
    >
      <span className={ben === "mua" ? "text-tang" : "text-giam"}>{dinhDangGia(d.gia, le)}</span>
      <span className="text-right">{d.kl.toLocaleString("vi-VN", { maximumFractionDigits: 5 })}</span>
      <span className="text-right text-chu-phu">{d.tong.toLocaleString("vi-VN", { maximumFractionDigits: 4 })}</span>
    </div>
  );
}
