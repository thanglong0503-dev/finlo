import type { Metadata } from "next";
import { DanhMucClient } from "@/components/DanhMucClient";

export const metadata: Metadata = {
  title: "Danh mục cá nhân",
  description: "Nhập mã, khối lượng và giá vốn để theo dõi lãi lỗ, tỷ trọng theo ngành. Dữ liệu chỉ lưu trên máy của bạn.",
};

export default function TrangDanhMuc() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-12">
      <p className="nhan-muc">Chứng khoán</p>
      <h1 className="mt-2 text-3xl leading-tight font-bold tracking-[-0.03em]">Danh mục cá nhân</h1>
      <p className="mt-2 max-w-3xl text-chu-phu">Theo dõi lãi lỗ theo giá mới nhất, không cần tài khoản. Giá tự cập nhật mỗi phút trong giờ giao dịch.</p>
      <DanhMucClient />
    </div>
  );
}
