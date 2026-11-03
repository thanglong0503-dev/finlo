import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BangDieuKhien, KhungChoTongQuan } from "@/components/thi-truong/TongQuan";

export const metadata: Metadata = {
  title: "Thị trường hôm nay",
  description:
    "Tổng quan thị trường chứng khoán Việt Nam: chỉ số, bản đồ nhiệt, độ rộng, thanh khoản, khối ngoại, phái sinh, chỉ số thế giới, hàng hoá và sự kiện sắp tới.",
};

const LOI_TAT = [
  ["/bang-gia", "Bảng giá"],
  ["/nganh", "Ngành"],
  ["/quet-tin-hieu", "Quét tín hiệu"],
  ["/khuyen-nghi", "Khuyến nghị CTCK"],
  ["/lich-su-kien", "Lịch sự kiện"],
  ["/kim-loai-quy", "Kim loại quý"],
  ["/tai-san-so", "Tài sản số"],
] as const;

export default function TrangThiTruong() {
  return (
    <div className="pt-6 pb-16">
      <div className="mx-auto mb-5 flex max-w-7xl flex-wrap items-end justify-between gap-3 px-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.03em]">Thị trường hôm nay</h1>
          <p className="mt-1 text-chu-phu">Số liệu phiên cập nhật mỗi phút trong giờ giao dịch.</p>
        </div>
        <nav className="flex flex-wrap gap-1.5">
          {LOI_TAT.map(([href, ten]) => (
            <Link key={href} href={href} className="rounded-full border border-vien px-3 py-1 text-[12px] font-medium text-chu-phu hover:text-chu">
              {ten}
            </Link>
          ))}
        </nav>
      </div>
      <Suspense fallback={<KhungChoTongQuan />}>
        <BangDieuKhien />
      </Suspense>
    </div>
  );
}
