import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { LuoiMo } from "@/components/KhungCho";
import { KyThuat } from "@/components/KyThuat";
import { KyThuatSau } from "@/components/KyThuatSau";
import { phanTichKyThuat } from "@/lib/ky-thuat";
import { bayGio } from "@/lib/ky-thuat-them";
import { kyThuatSau } from "@/lib/ky-thuat-sau";
import { layNen, layNenChiSo } from "@/lib/mofi";

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]/ky-thuat">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} — Phân tích kỹ thuật` };
}

export default function TrangKyThuat({ params }: PageProps<"/co-phieu/[ma]/ky-thuat">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <Suspense fallback={<LuoiMo so={3} cot="md:grid-cols-3" />}>
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  await connection();
  const ma = (await params).ma.toUpperCase();
  const [nen, vni] = await Promise.all([layNen(ma).catch(() => []), layNenChiSo("VNINDEX").catch(() => null)]);
  if (nen.length < 30) return <p className="text-chu-phu">{ma} chưa đủ lịch sử giá để phân tích kỹ thuật.</p>;
  return (
    <>
      <KyThuat ma={ma} kt={phanTichKyThuat(nen, bayGio())} />
      {nen.length >= 130 && <KyThuatSau kq={kyThuatSau(nen, vni?.nen ?? [])} />}
    </>
  );
}
