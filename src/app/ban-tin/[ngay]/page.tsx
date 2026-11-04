import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BanTinNoiDung } from "@/components/BanTinNoiDung";
import { ngayDayDu, type KetQuaBanTin } from "@/lib/cuoi-phien";
import duLieu from "@/data/ban-tin.json";

const { ds } = duLieu as unknown as KetQuaBanTin;

// Mọi bản tin đều nằm sẵn trong kho nên dựng trước hết, người xem không tốn lượt chạy máy chủ
export const generateStaticParams = () => ds.map((b) => ({ ngay: b.ngay }));

export async function generateMetadata({ params }: PageProps<"/ban-tin/[ngay]">): Promise<Metadata> {
  const { ngay } = await params;
  const b = ds.find((x) => x.ngay === ngay);
  if (!b) return { title: "Bản tin cuối phiên" };
  return { title: `Bản tin phiên ${ngayDayDu(ngay)}`, description: b.tieuDe };
}

export default async function TrangBanTinNgay({ params }: PageProps<"/ban-tin/[ngay]">) {
  const { ngay } = await params;
  const b = ds.find((x) => x.ngay === ngay);
  if (!b) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-12">
      <Link href="/ban-tin" className="text-[12px] text-chu-phu hover:text-nhan">
        ← Bản tin mới nhất
      </Link>
      <h1 className="mt-2 text-3xl leading-tight font-bold tracking-[-0.03em]">Bản tin cuối phiên</h1>
      <BanTinNoiDung b={b} cacNgay={ds.map((x) => x.ngay)} />
    </div>
  );
}
