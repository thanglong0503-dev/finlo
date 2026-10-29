import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { KhoiMo } from "@/components/KhungCho";
import { LichSuKien } from "@/components/LichSuKien";
import { layTin } from "@/lib/mofi";
import { suKienDoanhNghiep, suKienLich } from "@/lib/su-kien";

export const metadata: Metadata = {
  title: "Lịch sự kiện",
  description: "Nghỉ lễ, đáo hạn phái sinh, hạn báo cáo tài chính, cơ cấu ETF, cổ tức và đại hội cổ đông.",
};

export default function TrangLichSuKien() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Thị trường</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Lịch sự kiện</h1>
      <p className="mt-2 text-chu-phu">Những ngày cần để ý: nghỉ giao dịch, đáo hạn phái sinh, hạn báo cáo, cổ tức, đại hội cổ đông.</p>
      <div className="mt-6">
        <Suspense fallback={<KhoiMo className="h-[600px] rounded-2xl" />}>
          <NoiDung />
        </Suspense>
      </div>
    </div>
  );
}

async function NoiDung() {
  await connection();
  const tin = await layTin().catch(() => null);
  // Lịch cố định: từ đầu năm ngoái đến hết năm sau (đủ để lật tháng qua lại)
  const nam = new Date(Date.parse(tin?.capNhat ?? "2026-01-01")).getUTCFullYear();
  const suKien = [...suKienLich(`${nam - 1}-01-01`, `${nam + 1}-12-31`), ...suKienDoanhNghiep(tin?.tin ?? [])].sort(
    (a, b) => a.ngay.localeCompare(b.ngay) || a.loai.localeCompare(b.loai),
  );
  return <LichSuKien suKien={suKien} />;
}
