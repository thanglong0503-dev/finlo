import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BaoChiClient } from "@/components/BaoChiClient";
import { BangMo } from "@/components/KhungCho";
import { layBaoChi } from "@/lib/bao-chi";
import { layBangGia } from "@/lib/mofi";

export const metadata: Metadata = {
  title: "Tin báo chí tài chính",
  description: "Tin thị trường, doanh nghiệp và bài phân tích từ CafeF, Vietstock, VnEconomy, tự gắn mã cổ phiếu liên quan.",
};

export default function TrangBaoChi() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="nhan-muc">Thị trường</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Tin báo chí</h1>
      <p className="mt-2 text-chu-phu">
        Tổng hợp tiêu đề từ CafeF, Vietstock, VnEconomy, cập nhật 15 phút một lần. Bấm vào tin để đọc trên báo gốc.
      </p>
      <div className="mt-6">
        <Suspense fallback={<BangMo dong={10} />}>
          <NoiDung />
        </Suspense>
      </div>
    </div>
  );
}

async function NoiDung() {
  await connection();
  const bg = await layBangGia();
  const tin = await layBaoChi(bg.coPhieu.map((c) => c.ma));
  if (tin.length === 0) return <p className="text-chu-phu">Chưa tải được tin từ các báo. Thử lại sau ít phút.</p>;
  return <BaoChiClient tin={tin} />;
}
