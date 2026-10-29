import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KhoiMo } from "@/components/KhungCho";
import { NhanPhien } from "@/components/NhanPhien";
import { NutTheoDoi } from "@/components/NutTheoDoi";
import { TabMa, TabMaCho } from "@/components/TabMa";
import { TimMa } from "@/components/TimMa";
import { giaNghin, mauGia, phanTram, thayDoi } from "@/lib/dinh-dang";
import { layBangGia, layNganh } from "@/lib/mofi";

// Khung chung cho mọi tab của một mã: tên, giá, nút theo dõi và thanh tab.
// Đổi tab chỉ tải lại phần nội dung bên dưới, phần đầu giữ nguyên.
export default function KhungMa({ children, params }: LayoutProps<"/co-phieu/[ma]">) {
  return (
    <>
      <Suspense fallback={<DauTrangCho />}>
        <DauTrang params={params} />
      </Suspense>
      <Suspense fallback={<TabMaCho />}>
        <TabMa />
      </Suspense>
      {children}
    </>
  );
}

function DauTrangCho() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <KhoiMo className="h-3 w-20" />
      <div className="mt-4 flex justify-between pb-5">
        <div>
          <KhoiMo className="h-3 w-28" />
          <KhoiMo className="mt-3 h-8 w-24" />
          <KhoiMo className="mt-2 h-3 w-56" />
        </div>
        <KhoiMo className="h-10 w-28" />
      </div>
    </div>
  );
}

async function DauTrang({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const [bangGia, nganh] = await Promise.all([layBangGia(), layNganh().catch(() => null)]);
  const cp = bangGia.coPhieu.find((c) => c.ma === ma);
  if (!cp) notFound();
  // Ngành theo phân loại của Mofi (đầy đủ hơn nhãn ngành của Sở)
  const khoaNganh = nganh?.maNganh[ma];
  const tenNganh = khoaNganh ? nganh?.ten[khoaNganh] : cp.nganh;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/bang-gia" className="text-chu-phu hover:text-chu">
          ← Bảng giá
        </Link>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Link
            href={`/bieu-do?loai=ck&ma=${cp.ma}`}
            className="flex h-9 shrink-0 items-center bg-nhan px-3 font-semibold text-white hover:brightness-110"
          >
            Biểu đồ kỹ thuật
          </Link>
          <TimMa className="min-w-0 flex-1 sm:w-80" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 pb-5">
        <div>
          <p className="nhan-muc">
            {cp.san} ·{" "}
            {khoaNganh ? (
              <Link href={`/nganh/${khoaNganh}`} className="hover:underline">
                {tenNganh}
              </Link>
            ) : (
              (tenNganh ?? "Cổ phiếu")
            )}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">{cp.ma}</h1>
          <p className="mt-1 text-[15px] text-chu-phu">{cp.ten}</p>
        </div>
        <div className="flex items-end gap-5">
          <NutTheoDoi ma={cp.ma} />
          <div className="text-right">
            <div className={`text-3xl font-bold tabular-nums ${mauGia(cp)}`}>{giaNghin(cp.gia)}</div>
            <div className={`tabular-nums ${mauGia(cp)}`}>
              {thayDoi(cp.thayDoi / 1000)} ({phanTram(cp.phanTram)})
            </div>
            <div className="mt-1 text-[12px]">
              <NhanPhien phien={bangGia.phien} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
