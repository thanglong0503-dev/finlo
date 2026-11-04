import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BangDienVn30 } from "@/components/BangDienVn30";
import { BangMo } from "@/components/KhungCho";
import { layBangDienVn30 } from "@/lib/bang-dien-may-chu";

export const metadata: Metadata = {
  title: "Bảng giá VN30",
  description: "Bảng điện rổ VN30: 3 bước giá mua bán, khớp lệnh, trần sàn tham chiếu và giao dịch nước ngoài, cập nhật mỗi phút trong phiên.",
};

export default function TrangBangGiaVn30() {
  return (
    <div className="px-3 pt-5 pb-8 sm:px-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <p className="nhan-muc">Chứng khoán</p>
          <h1 className="mt-1 text-[26px] leading-tight font-bold tracking-[-0.03em]">Bảng giá VN30</h1>
        </div>
        <Link href="/bang-gia" className="text-chu-phu hover:text-nhan">
          Xem toàn bộ mã →
        </Link>
      </div>
      <Suspense fallback={<BangMo dong={14} />}>
        <DuLieu />
      </Suspense>
    </div>
  );
}

async function DuLieu() {
  await connection();
  const dau = await layBangDienVn30().catch(() => null);
  if (!dau) return <p className="mt-6 text-chu-phu">Chưa lấy được dữ liệu bảng giá, vui lòng thử lại sau.</p>;
  return <BangDienVn30 dau={dau} />;
}
