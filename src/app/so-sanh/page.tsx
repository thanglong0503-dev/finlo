import type { Metadata } from "next";
import { Suspense } from "react";
import { KhoiMo } from "@/components/KhungCho";
import { SoSanhNhieuMa } from "@/components/SoSanhNhieuMa";

export const metadata: Metadata = {
  title: "So sánh nhiều mã",
  description: "Chồng tối đa 5 cổ phiếu và chỉ số trên một biểu đồ theo % thay đổi, kèm mức sụt và độ biến động.",
};

export default function TrangSoSanh({ searchParams }: PageProps<"/so-sanh">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Chứng khoán</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">So sánh nhiều mã</h1>
      <p className="mt-2 text-chu-phu">Mã nào chạy tốt hơn trong cùng khoảng thời gian, so với cả thị trường.</p>
      <div className="mt-6">
        <Suspense fallback={<KhoiMo className="h-[560px] rounded-2xl" />}>
          <NoiDung searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function NoiDung({ searchParams }: { searchParams: PageProps<"/so-sanh">["searchParams"] }) {
  const tham = (await searchParams).ma;
  const chuoi = Array.isArray(tham) ? tham[0] : tham;
  const ds = (chuoi ?? "FPT,VCB,HPG,VNINDEX")
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter((x) => /^[A-Z0-9]{2,10}$/.test(x))
    .slice(0, 5);
  return <SoSanhNhieuMa dsDau={ds.length ? ds : ["FPT", "VNINDEX"]} />;
}
