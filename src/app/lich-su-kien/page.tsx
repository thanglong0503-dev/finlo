import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { KhoiMo } from "@/components/KhungCho";
import { LichSuKien } from "@/components/LichSuKien";
import { layTin } from "@/lib/mofi";
import { suKienDoanhNghiep, suKienLich } from "@/lib/su-kien";
import { tinhHalving } from "@/lib/su-kien-the-gioi";
import { layKhoiBitcoin } from "@/lib/tien-so";

export const metadata: Metadata = {
  title: "Lịch sự kiện",
  description:
    "Nghỉ lễ, đáo hạn phái sinh, hạn báo cáo tài chính, cổ tức, đại hội cổ đông; lịch họp FED, CPI Mỹ, đáo hạn quyền chọn BTC/ETH và halving Bitcoin.",
};

export default function TrangLichSuKien({ searchParams }: PageProps<"/lich-su-kien">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Thị trường</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Lịch sự kiện</h1>
      <p className="mt-2 text-chu-phu">
        Những ngày cần để ý: nghỉ giao dịch, đáo hạn phái sinh, hạn báo cáo, cổ tức, đại hội cổ đông; họp FED, lạm phát Mỹ, đáo hạn quyền
        chọn và halving Bitcoin.
      </p>
      <div className="mt-6">
        <Suspense fallback={<KhoiMo className="h-[600px] rounded-2xl" />}>
          <NoiDung searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function NoiDung({ searchParams }: { searchParams: PageProps<"/lich-su-kien">["searchParams"] }) {
  await connection();
  const nhom = (await searchParams).nhom;
  const [tin, khoi] = await Promise.all([layTin().catch(() => null), layKhoiBitcoin()]);
  const halving = khoi ? tinhHalving(khoi.khoi, khoi.luc) : null;
  // Lịch cố định: từ đầu năm ngoái đến hết năm sau (đủ để lật tháng qua lại)
  const nam = new Date(Date.parse(tin?.capNhat ?? "2026-01-01")).getUTCFullYear();
  const suKien = [...suKienLich(`${nam - 1}-01-01`, `${nam + 1}-12-31`), ...suKienDoanhNghiep(tin?.tin ?? [])].sort(
    (a, b) => a.ngay.localeCompare(b.ngay) || a.loai.localeCompare(b.loai),
  );
  if (halving)
    suKien.push({
      ngay: new Date(Date.parse(halving.ngayUocTinh) + 7 * 3600e3).toISOString().slice(0, 10),
      loai: "halving",
      tieuDe: `Halving Bitcoin lần ${halving.lan} (khối ${halving.khoiHalving.toLocaleString("vi-VN")})`,
      duKien: true,
      ghiChu: `Phần thưởng mỗi khối giảm còn ${halving.phanThuong.toLocaleString("vi-VN", { maximumFractionDigits: 8 })} BTC; ngày ước tính theo 10 phút/khối.`,
    });
  return <LichSuKien suKien={suKien} halving={halving} nhomDau={nhom === "quoc-te" || nhom === "vn" ? nhom : "tat-ca"} />;
}
