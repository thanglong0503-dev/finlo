import type { Metadata } from "next";
import { BangGiaClient } from "@/components/BangGiaClient";
import { layBangGia } from "@/lib/mofi";

export const metadata: Metadata = { title: "Bảng giá cổ phiếu" };

export default async function TrangBangGia() {
  const duLieu = await layBangGia();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Bảng giá cổ phiếu</h1>
      <BangGiaClient duLieuDau={duLieu} />
    </div>
  );
}
