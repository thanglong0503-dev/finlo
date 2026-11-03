"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, ColorType, createChart, createSeriesMarkers, LineStyle, type Time } from "lightweight-charts";
import { useGiaoDien } from "@/lib/giao-dien";

const GOI_Y = ["VCB", "FPT", "HPG", "MWG", "VNM"];

// Ô tra nhanh "mã này bắt đáy được chưa"
export function TraMaBatDay({ maHienTai }: { maHienTai?: string }) {
  const router = useRouter();
  const [ma, datMa] = useState(maHienTai ?? "");
  const di = (m: string) => {
    const x = m.trim().toUpperCase();
    if (/^[A-Z0-9]{3,10}$/.test(x)) router.push(`/bat-day/${x}`);
  };
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          di(ma);
        }}
        className="flex gap-2"
      >
        <input
          value={ma}
          onChange={(e) => datMa(e.target.value.toUpperCase())}
          placeholder="Nhập mã, ví dụ VCB"
          aria-label="Mã cổ phiếu"
          maxLength={10}
          className="h-11 w-full max-w-xs rounded-full border border-vien bg-nen px-5 font-semibold uppercase placeholder:font-normal placeholder:normal-case focus:border-nhan focus:outline-none"
        />
        <button type="submit" className="h-11 shrink-0 rounded-full bg-chu px-6 font-semibold text-nen hover:bg-nhan hover:text-white">
          Xem
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {GOI_Y.filter((m) => m !== maHienTai).map((m) => (
          <button key={m} type="button" onClick={() => di(m)} className="rounded-full border border-vien px-3 py-0.5 text-[12px] text-chu-phu hover:text-chu">
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

export type NenVe = { time: number; open: number; high: number; low: number; close: number };
export type MocVe = { time: number; loai: "mua" | "ban"; nhan: string };
export type VachVe = { gia: number; ten: string; mau: "--giam" | "--tang" | "--dung" | "--chu-phu" };

const mau = (ten: string) => getComputedStyle(document.documentElement).getPropertyValue(ten).trim();

// Biểu đồ nến có điểm mua, bán giả định và các mức giá; giá đã đổi sang nghìn đồng
export function BieuDoBatDay({ nen, moc, vach }: { nen: NenVe[]; moc: MocVe[]; vach: VachVe[] }) {
  const khung = useRef<HTMLDivElement>(null);
  const giaoDien = useGiaoDien();

  useEffect(() => {
    if (!khung.current) return;
    const chart = createChart(khung.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: mau("--chu-phu"), fontFamily: "inherit" },
      grid: { vertLines: { visible: false }, horzLines: { color: mau("--vien") } },
      rightPriceScale: { borderColor: mau("--vien") },
      timeScale: { borderColor: mau("--vien") },
      localization: { locale: "vi-VN" },
    });
    const tang = mau("--tang");
    const giam = mau("--giam");
    const s = chart.addSeries(CandlestickSeries, { upColor: tang, downColor: giam, wickUpColor: tang, wickDownColor: giam, borderVisible: false, priceLineVisible: false });
    s.setData(nen.map((x) => ({ ...x, time: x.time as Time })));
    createSeriesMarkers(
      s,
      moc.map((m) => ({
        time: m.time as Time,
        position: m.loai === "mua" ? ("belowBar" as const) : ("aboveBar" as const),
        shape: m.loai === "mua" ? ("arrowUp" as const) : ("arrowDown" as const),
        color: m.loai === "mua" ? tang : giam,
        text: m.nhan,
      })),
    );
    for (const v of vach) s.createPriceLine({ price: v.gia, color: mau(v.mau), lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: v.ten });
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [nen, moc, vach, giaoDien]);

  return <div ref={khung} style={{ height: 420 }} className="w-full" />;
}
