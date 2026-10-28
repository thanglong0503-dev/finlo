"use client";

import { BieuDoDuong, type Duong } from "@/components/BieuDoDuong";

// Biểu đồ đường cho chuỗi số vĩ mô/định giá; định dạng trục theo đơn vị
// (bọc riêng vì không truyền được hàm định dạng từ server component sang client)
export function BieuDoSo({ duong, donVi, cao = 300 }: { duong: Duong[]; donVi: "%" | "lan" | "diem"; cao?: number }) {
  const dinhDang = (x: number) => {
    const so = x.toLocaleString("vi-VN", { maximumFractionDigits: donVi === "diem" ? 0 : 2 });
    return donVi === "%" ? `${so}%` : donVi === "lan" ? `${so}x` : so;
  };
  return <BieuDoDuong duong={duong} dinhDang={dinhDang} cao={cao} />;
}
