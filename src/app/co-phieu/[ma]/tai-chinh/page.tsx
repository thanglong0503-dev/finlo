import type { Metadata } from "next";
import { Suspense } from "react";
import { BangMo } from "@/components/KhungCho";
import { TaiChinh } from "@/components/TaiChinh";
import { layBangGia, layBaoCao, layHoSo, layNganh } from "@/lib/mofi";

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]/tai-chinh">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} — Số liệu tài chính` };
}

export default function TrangTaiChinh({ params }: PageProps<"/co-phieu/[ma]/tai-chinh">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-2 pb-10">
      <Suspense fallback={<BangMo dong={10} />}>
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const [bangGia, bc, hoSo, nganh] = await Promise.all([
    layBangGia(),
    layBaoCao(ma),
    layHoSo(ma),
    layNganh().catch(() => null),
  ]);
  const cp = bangGia.coPhieu.find((c) => c.ma === ma);
  if (!cp || !bc || bc.quy.length === 0)
    return <p className="mt-6 text-chu-phu">{ma} chưa có báo cáo tài chính trong dữ liệu.</p>;
  const khoa = nganh?.maNganh[ma];
  return (
    <TaiChinh bc={bc} gia={cp.gia} soCoPhieu={hoSo?.soCoPhieu ?? null} peNganh={khoa ? (nganh?.pe[khoa] ?? null) : null} />
  );
}
