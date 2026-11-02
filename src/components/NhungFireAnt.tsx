"use client";

import { useEffect, useId, useState } from "react";
import { useGiaoDien } from "@/lib/giao-dien";

// Nhúng widget chính thức của FireAnt (fireant.vn/widgets/builder) bằng iframe, giữ nguyên logo "Powered by FireAnt".
// Dùng cho dữ liệu Finlo chưa có nguồn: sổ lệnh, khớp lệnh, basis phái sinh trong phiên, cộng đồng.
// Widget gửi postMessage {source: "fireant-widget", type: "resize", id, height} để khung tự co giãn.

const GOC = "https://fireant.vn";

export function NhungFireAnt({
  widget,
  tieuDe,
  thamSo = {},
  cao = 300,
  tuCoGian = true,
}: {
  widget: string;
  tieuDe: string;
  thamSo?: Record<string, string | number>;
  cao?: number;
  tuCoGian?: boolean;
}) {
  const giaoDien = useGiaoDien();
  const id = `finlo${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [chieuCao, datChieuCao] = useState(cao);

  useEffect(() => {
    if (!tuCoGian) return;
    const nghe = (e: MessageEvent) => {
      if (e.origin !== GOC) return;
      const d = e.data as { source?: string; type?: string; id?: string; height?: number };
      if (d?.source === "fireant-widget" && d.type === "resize" && d.id === id && typeof d.height === "number")
        datChieuCao(Math.max(80, Math.min(1600, Math.ceil(d.height))));
    };
    window.addEventListener("message", nghe);
    return () => window.removeEventListener("message", nghe);
  }, [id, tuCoGian]);

  const qs = new URLSearchParams({
    widget,
    theme: giaoDien === "sang" ? "light" : "dark",
    ...Object.fromEntries(Object.entries(thamSo).map(([k, v]) => [k, String(v)])),
    _id: id,
  });

  return (
    <iframe
      key={giaoDien}
      src={`${GOC}/embed?${qs}`}
      title={`${tieuDe} - FireAnt`}
      loading="lazy"
      scrolling="no"
      className="block w-full border-0"
      style={{ height: chieuCao }}
    />
  );
}

// Khung viền bo góc; widget đã có tiêu đề và dòng "Powered by FireAnt" riêng
export function KhungFireAnt({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-2xl border border-vien ${className}`}>{children}</div>;
}
