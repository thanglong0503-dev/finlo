import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GiaoDichTienSo } from "@/components/GiaoDichTienSo";
import { KhoiMo } from "@/components/KhungCho";
import { usdGon } from "@/lib/dinh-dang";
import { layBangTienSo, layBangVang } from "@/lib/mofi";

export async function generateMetadata({ params }: PageProps<"/tai-san-so/[ma]">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()}/USDT — Giá realtime` };
}

export default function TrangTienSo({ params }: PageProps<"/tai-san-so/[ma]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link href="/tai-san-so" className="text-chu-phu hover:text-chu">
        ← Tài sản số
      </Link>
      <Suspense
        fallback={
          <>
            <KhoiMo className="mt-4 h-20" />
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
              <KhoiMo className="h-[520px]" />
              <KhoiMo className="h-[520px]" />
            </div>
          </>
        }
      >
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  // Thông tin phụ (hạng, vốn hoá, tỷ giá) lỗi thì vẫn hiện phần realtime
  const [bang, vang] = await Promise.all([
    layBangTienSo(100).catch(() => null),
    layBangVang().catch(() => null),
  ]);
  const thongTin = bang?.ds.find((x) => x.ma === ma);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="nhan-muc">Tài sản số</p>
        <h1 className="text-2xl font-bold tracking-[-0.03em]">
          {thongTin?.ten ?? ma} <span className="text-chu-phu">({ma})</span>
        </h1>
        {thongTin && (
          <p className="text-chu-phu">
            Hạng #{thongTin.hang} · vốn hoá ${usdGon(thongTin.vonHoa)} · thị phần{" "}
            {thongTin.thiPhan.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%
          </p>
        )}
      </div>
      <GiaoDichTienSo ma={ma} tyGia={vang?.theGioi.tyGia ?? null} />
    </>
  );
}
