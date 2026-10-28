"use client";

import { ColorType, createChart, LineSeries, type Time } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useGiaoDien } from "@/lib/giao-dien";

export type Duong = { ten: string; diem: { time: number | string; value: number }[] };

// Màu các đường lấy từ biến CSS để theo giao diện sáng/tối
// Đỏ để cuối cùng: đỏ dễ bị hiểu là "giảm giá"
const MAU = ["--chu", "--nhan", "--dung", "--chu-phu", "--giam"];
const mau = (ten: string) => getComputedStyle(document.documentElement).getPropertyValue(ten).trim();

// Biểu đồ một hoặc nhiều đường giá, kèm chú thích tên đường
export function BieuDoDuong({
  duong,
  dinhDang,
  cao = 320,
}: {
  duong: Duong[];
  dinhDang: (gia: number) => string;
  cao?: number;
}) {
  const khung = useRef<HTMLDivElement>(null);
  // Đổi sáng/tối thì vẽ lại biểu đồ với màu mới
  const giaoDien = useGiaoDien();

  useEffect(() => {
    if (!khung.current) return;
    const chart = createChart(khung.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: mau("--chu-phu"),
        fontFamily: "inherit",
      },
      grid: { vertLines: { visible: false }, horzLines: { color: mau("--vien") } },
      rightPriceScale: { borderColor: mau("--vien") },
      timeScale: { borderColor: mau("--vien") },
      localization: { locale: "vi-VN", priceFormatter: dinhDang },
    });
    duong.forEach((d, i) => {
      const series = chart.addSeries(LineSeries, {
        color: mau(MAU[i % MAU.length]),
        lineWidth: 2,
        priceLineVisible: false,
      });
      series.setData(d.diem.map((p) => ({ time: p.time as Time, value: p.value })));
    });
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [duong, dinhDang, giaoDien]);

  return (
    <div>
      {duong.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
          {duong.map((d, i) => (
            <span key={d.ten} className="flex items-center gap-2 text-chu-phu">
              <span className="inline-block h-0.5 w-4" style={{ background: `var(${MAU[i % MAU.length]})` }} />
              {d.ten}
            </span>
          ))}
        </div>
      )}
      <div ref={khung} style={{ height: cao }} className="w-full" />
    </div>
  );
}
