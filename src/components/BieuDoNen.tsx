"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { useGiaoDien } from "@/lib/giao-dien";
import type { Nen } from "@/lib/mofi";

const KHOANG = [
  { nhan: "3T", ngay: 90 },
  { nhan: "6T", ngay: 180 },
  { nhan: "1N", ngay: 365 },
  { nhan: "5N", ngay: 365 * 5 },
  { nhan: "Tất cả", ngay: 0 },
];

// Đọc màu từ biến CSS để biểu đồ theo đúng giao diện sáng/tối
const mau = (ten: string) => getComputedStyle(document.documentElement).getPropertyValue(ten).trim();

export function BieuDoNen({ nen }: { nen: Nen[] }) {
  const khung = useRef<HTMLDivElement>(null);
  const bieuDo = useRef<IChartApi | null>(null);
  const [khoang, setKhoang] = useState(365);
  // Đổi sáng/tối thì vẽ lại biểu đồ với màu mới
  const giaoDien = useGiaoDien();

  useEffect(() => {
    if (!khung.current) return;
    const tang = mau("--tang");
    const giam = mau("--giam");

    const chart = createChart(khung.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: mau("--chu-phu"),
        fontFamily: "inherit",
      },
      grid: { vertLines: { color: mau("--vien") }, horzLines: { color: mau("--vien") } },
      rightPriceScale: { borderColor: mau("--vien") },
      timeScale: { borderColor: mau("--vien") },
      localization: {
        locale: "vi-VN",
        priceFormatter: (p: number) => (p / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
    });

    const nenSeries = chart.addSeries(CandlestickSeries, {
      upColor: tang,
      downColor: giam,
      borderVisible: false,
      wickUpColor: tang,
      wickDownColor: giam,
    });
    nenSeries.setData(nen.map((n) => ({ ...n, time: n.time as UTCTimestamp })));

    // Khối lượng nằm ở 20% dưới cùng của biểu đồ
    // Ẩn nhãn khối lượng cuối trên trục để không đè lên nhãn giá (nhất là màn hình hẹp)
    const klSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "kl",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("kl").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    klSeries.setData(
      nen.map((n) => ({
        time: n.time as UTCTimestamp,
        value: n.volume,
        color: (n.close >= n.open ? tang : giam) + "66",
      })),
    );

    bieuDo.current = chart;
    return () => {
      chart.remove();
      bieuDo.current = null;
    };
  }, [nen, giaoDien]);

  useEffect(() => {
    const chart = bieuDo.current;
    if (!chart || nen.length === 0) return;
    if (khoang === 0) {
      chart.timeScale().fitContent();
      return;
    }
    const cuoi = nen[nen.length - 1].time;
    chart.timeScale().setVisibleRange({
      from: (cuoi - khoang * 86400) as UTCTimestamp,
      to: cuoi as UTCTimestamp,
    });
  }, [khoang, nen, giaoDien]);

  return (
    <div>
      <div className="mb-3 flex w-fit gap-1 rounded-full bg-nen-noi p-1">
        {KHOANG.map((k) => (
          <button
            key={k.nhan}
            onClick={() => setKhoang(k.ngay)}
            className={`h-7 rounded-full px-3 font-medium ${khoang === k.ngay ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
          >
            {k.nhan}
          </button>
        ))}
      </div>
      <div ref={khung} className="h-[420px] w-full" />
    </div>
  );
}
