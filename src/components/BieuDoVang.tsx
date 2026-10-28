"use client";

import { BieuDoDuong, type Duong } from "@/components/BieuDoDuong";

// Trục giá vàng theo triệu đồng/lượng: 142700000 -> "142,7"
const trieu = (gia: number) => (gia / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 });

export function BieuDoVang({ duong }: { duong: Duong[] }) {
  return <BieuDoDuong duong={duong} dinhDang={trieu} cao={340} />;
}
