"use client";

import { BieuDoDuong, type Duong } from "@/components/BieuDoDuong";
import { giaUsd } from "@/lib/dinh-dang";

// Bọc lại để truyền hàm định dạng (không truyền hàm từ server component sang client được)
export function BieuDoTienSo({ duong }: { duong: Duong[] }) {
  return <BieuDoDuong duong={duong} dinhDang={giaUsd} cao={180} />;
}
