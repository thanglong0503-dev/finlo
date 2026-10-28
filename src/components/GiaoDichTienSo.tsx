"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useCallback, useEffect, useRef, useState } from "react";
import { GiaChop } from "@/components/GiaChop";
import {
  capGiaoDich,
  dinhDangGia,
  gon,
  REST,
  soLe,
  TrangThaiKetNoi,
  useLuongBinance,
} from "@/lib/binance";
import { useGiaoDien } from "@/lib/giao-dien";

const KHUNG = [
  { ma: "1m", nhan: "1 phút" },
  { ma: "15m", nhan: "15 phút" },
  { ma: "1h", nhan: "1 giờ" },
  { ma: "4h", nhan: "4 giờ" },
  { ma: "1d", nhan: "1 ngày" },
];

const SO_BUOC = 12; // số bước giá mỗi bên sổ lệnh
const SO_LENH_KHOP = 30;

type Ticker = { c: string; P: string; p: string; h: string; l: string; o: string; v: string; q: string };
type Depth = { bids: [string, string][]; asks: [string, string][] };
type AggTrade = { p: string; q: string; T: number; m: boolean };
type KlineTin = { k: { t: number; o: string; h: string; l: string; c: string; v: string } };

const mau = (ten: string) => getComputedStyle(document.documentElement).getPropertyValue(ten).trim();

export function GiaoDichTienSo({ ma, tyGia }: { ma: string; tyGia: number | null }) {
  const cap = capGiaoDich(ma);
  const tenLuong = cap.toLowerCase();
  const [khung, setKhung] = useState("15m");
  const [coCap, setCoCap] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"so-lenh" | "khop">("so-lenh");
  const giaoDien = useGiaoDien();

  // Tin realtime ghi vào ref (không vẽ lại mỗi tin); mỗi 300ms chụp vào state để vẽ một lần,
  // và chỉ khi có tin mới từ lần chụp trước
  const ticker = useRef<Ticker | null>(null);
  const soLenh = useRef<Depth | null>(null);
  const khop = useRef<AggTrade[]>([]);
  const coMoi = useRef(false);
  const [anh, setAnh] = useState<{ ticker: Ticker | null; soLenh: Depth | null; khop: AggTrade[] }>({
    ticker: null,
    soLenh: null,
    khop: [],
  });
  useEffect(() => {
    const id = setInterval(() => {
      if (!coMoi.current) return;
      coMoi.current = false;
      setAnh({ ticker: ticker.current, soLenh: soLenh.current, khop: khop.current });
    }, 300);
    return () => clearInterval(id);
  }, []);

  const khungBieuDo = useRef<HTMLDivElement>(null);
  const nenSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const klSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const bieuDo = useRef<IChartApi | null>(null);

  // Tạo biểu đồ và tải lịch sử nến qua REST mỗi khi đổi khung thời gian / giao diện
  useEffect(() => {
    if (!khungBieuDo.current) return;
    const tang = mau("--tang");
    const giam = mau("--giam");
    const chart = createChart(khungBieuDo.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: mau("--chu-phu"), fontFamily: "inherit" },
      grid: { vertLines: { color: mau("--vien") }, horzLines: { color: mau("--vien") } },
      rightPriceScale: { borderColor: mau("--vien") },
      timeScale: { borderColor: mau("--vien"), timeVisible: true },
      localization: { locale: "vi-VN" },
    });
    const nen = chart.addSeries(CandlestickSeries, {
      upColor: tang,
      downColor: giam,
      borderVisible: false,
      wickUpColor: tang,
      wickDownColor: giam,
    });
    const kl = chart.addSeries(HistogramSeries, { priceScaleId: "kl", priceFormat: { type: "volume" } });
    chart.priceScale("kl").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    bieuDo.current = chart;
    nenSeries.current = nen;
    klSeries.current = kl;

    let huy = false;
    // Cặp đã huỷ niêm yết (ví dụ XMR) vẫn còn lịch sử nến cũ, nên kiểm tra trạng thái giao dịch trước
    fetch(`${REST}/exchangeInfo?symbol=${cap}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((info: { symbols?: { status: string }[] }) =>
        info.symbols?.[0]?.status === "TRADING" ? null : Promise.reject("ngung-giao-dich"),
      )
      .then(() => fetch(`${REST}/klines?symbol=${cap}&interval=${khung}&limit=500`))
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((rows: [number, string, string, string, string, string][]) => {
        if (huy) return;
        setCoCap(true);
        const le = soLe(Number(rows[rows.length - 1]?.[4] ?? 1));
        nen.applyOptions({ priceFormat: { type: "price", precision: le, minMove: 1 / 10 ** le } });
        nen.setData(
          rows.map((r) => ({ time: (r[0] / 1000) as UTCTimestamp, open: +r[1], high: +r[2], low: +r[3], close: +r[4] })),
        );
        kl.setData(
          rows.map((r) => ({
            time: (r[0] / 1000) as UTCTimestamp,
            value: +r[5],
            color: (+r[4] >= +r[1] ? tang : giam) + "66",
          })),
        );
      })
      .catch(() => {
        // Binance không có cặp này (ví dụ đồng không niêm yết trên Binance)
        if (!huy) setCoCap(false);
      });

    return () => {
      huy = true;
      chart.remove();
      bieuDo.current = nenSeries.current = klSeries.current = null;
    };
  }, [cap, khung, giaoDien]);

  const nhanTin = useCallback(
    (luong: string, duLieu: unknown) => {
      if (luong.endsWith("@ticker")) {
        ticker.current = duLieu as Ticker;
        coMoi.current = true;
      } else if (luong.includes("@depth")) {
        soLenh.current = duLieu as Depth;
        coMoi.current = true;
      } else if (luong.endsWith("@aggTrade")) {
        khop.current = [duLieu as AggTrade, ...khop.current].slice(0, SO_LENH_KHOP);
        coMoi.current = true;
      } else if (luong.includes("@kline_")) {
        // Nến cập nhật thẳng vào biểu đồ (thư viện tự gom lần vẽ)
        const { k } = duLieu as KlineTin;
        const t = (k.t / 1000) as UTCTimestamp;
        nenSeries.current?.update({ time: t, open: +k.o, high: +k.h, low: +k.l, close: +k.c });
        klSeries.current?.update({
          time: t,
          value: +k.v,
          color: (+k.c >= +k.o ? mau("--tang") : mau("--giam")) + "66",
        });
      }
    },
    [],
  );

  // Chỉ mở kết nối khi đã xác nhận cặp đang giao dịch
  const trangThai = useLuongBinance(
    coCap !== true
      ? []
      : [`${tenLuong}@ticker`, `${tenLuong}@depth20@100ms`, `${tenLuong}@aggTrade`, `${tenLuong}@kline_${khung}`],
    nhanTin,
  );

  if (coCap === false) {
    return (
      <div className="mt-6 border border-dashed border-vien p-8 text-center text-chu-phu">
        {ma} hiện không có cặp {cap} đang giao dịch trên Binance nên chưa có dữ liệu realtime. Giá tham khảo
        vẫn xem được trong bảng Tài sản số.
      </div>
    );
  }

  const t = anh.ticker;
  const gia = t ? Number(t.c) : null;
  const phanTram = t ? Number(t.P) : 0;
  const mauPT = phanTram > 0 ? "text-tang" : phanTram < 0 ? "text-giam" : "";
  const le = gia ? soLe(gia) : 2;

  const ban = (anh.soLenh?.asks ?? []).slice(0, SO_BUOC);
  const mua = (anh.soLenh?.bids ?? []).slice(0, SO_BUOC);
  // Thanh nền theo khối lượng cộng dồn
  const congDon = (ds: [string, string][]) => {
    let s = 0;
    return ds.map(([p, q]) => {
      s += Number(q);
      return { gia: Number(p), kl: Number(q), tong: s };
    });
  };
  const banCd = congDon(ban);
  const muaCd = congDon(mua);
  const lonNhat = Math.max(banCd[banCd.length - 1]?.tong ?? 0, muaCd[muaCd.length - 1]?.tong ?? 0, 1e-12);
  const chenh = ban[0] && mua[0] ? Number(ban[0][0]) - Number(mua[0][0]) : null;
  const giaKhopCuoi = anh.khop[0];

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
        <div className="border border-vien p-3">
          <div className="mb-3 flex w-fit border border-vien">
            {KHUNG.map((k) => (
              <button
                key={k.ma}
                onClick={() => setKhung(k.ma)}
                className={`h-8 px-3 font-medium ${khung === k.ma ? "bg-nhan text-white" : "text-chu-phu hover:text-chu"}`}
              >
                {k.nhan}
              </button>
            ))}
          </div>
          <div ref={khungBieuDo} className="h-[460px] w-full" />
        </div>

        <div className="border border-vien">
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

          <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] font-bold tracking-wider text-chu-phu uppercase">
            <span>Giá (USDT)</span>
            <span className="text-right">{tab === "so-lenh" ? `KL (${ma})` : `KL (${ma})`}</span>
            <span className="text-right">{tab === "so-lenh" ? "Tổng" : "Giờ"}</span>
          </div>

          {tab === "so-lenh" ? (
            <div className="tabular-nums">
              {[...banCd].reverse().map((d) => (
                <DongSoLenh key={`b${d.gia}`} d={d} lonNhat={lonNhat} le={le} ben="ban" />
              ))}
              <div className="flex items-center justify-between border-y border-vien px-3 py-2">
                {giaKhopCuoi ? (
                  <span className={`text-lg font-bold ${giaKhopCuoi.m ? "text-giam" : "text-tang"}`}>
                    {dinhDangGia(Number(giaKhopCuoi.p), le)}
                  </span>
                ) : (
                  <span className="text-chu-phu">—</span>
                )}
                {chenh != null && (
                  <span className="text-[11px] text-chu-phu">chênh {dinhDangGia(chenh, le)}</span>
                )}
              </div>
              {muaCd.map((d) => (
                <DongSoLenh key={`m${d.gia}`} d={d} lonNhat={lonNhat} le={le} ben="mua" />
              ))}
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto tabular-nums">
              {anh.khop.map((k, i) => (
                <div key={`${k.T}-${i}`} className="grid grid-cols-3 px-3 py-[3px]">
                  {/* m = true: bên mua là bên chủ động đặt sẵn, tức lệnh bán chủ động -> đỏ */}
                  <span className={k.m ? "text-giam" : "text-tang"}>{dinhDangGia(Number(k.p), le)}</span>
                  <span className="text-right">{Number(k.q).toLocaleString("vi-VN", { maximumFractionDigits: 5 })}</span>
                  <span className="text-right text-chu-phu">
                    {new Date(k.T).toLocaleTimeString("vi-VN", { hour12: false })}
                  </span>
                </div>
              ))}
              {anh.khop.length === 0 &&<p className="p-4 text-center text-chu-phu">Đang chờ lệnh khớp…</p>}
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-chu-phu">
        Dữ liệu realtime từ Binance (cặp {cap}), chỉ để tham khảo, Finlo không nhận lệnh giao dịch. Kết nối tự tạm dừng
        khi bạn chuyển sang tab khác để tiết kiệm dữ liệu.
      </p>
    </div>
  );
}

function DongSoLenh({
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
  const mauBen = ben === "mua" ? "var(--tang)" : "var(--giam)";
  return (
    <div
      className="grid grid-cols-3 px-3 py-[3px]"
      style={{
        background: `linear-gradient(to left, color-mix(in srgb, ${mauBen} 14%, transparent) ${
          (d.tong / lonNhat) * 100
        }%, transparent 0)`,
      }}
    >
      <span className={ben === "mua" ? "text-tang" : "text-giam"}>{dinhDangGia(d.gia, le)}</span>
      <span className="text-right">{d.kl.toLocaleString("vi-VN", { maximumFractionDigits: 5 })}</span>
      <span className="text-right text-chu-phu">{d.tong.toLocaleString("vi-VN", { maximumFractionDigits: 4 })}</span>
    </div>
  );
}
