import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BangGiaClient } from "@/components/BangGiaClient";
import { layBangGia } from "@/lib/mofi";

export const metadata: Metadata = { title: "Bảng giá cổ phiếu" };

export default function TrangBangGia() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Chứng khoán</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Bảng giá cổ phiếu</h1>
      <Suspense fallback={<p className="mt-4 text-chu-phu">Đang tải bảng giá…</p>}>
        <DuLieuBangGia />
      </Suspense>
    </div>
  );
}

async function DuLieuBangGia() {
  // Tải lúc có người truy cập (đã cache ~1 phút), không tải lúc build
  await connection();
  return <BangGiaClient duLieuDau={await layBangGia()} />;
}
