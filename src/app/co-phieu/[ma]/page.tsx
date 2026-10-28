import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BieuDoNen } from "@/components/BieuDoNen";
import { giaNghin, khoiLuong, mauTangGiam, phanTram, thayDoi, tyDong } from "@/lib/dinh-dang";
import { layBangGia, layNen } from "@/lib/mofi";

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} — Giá cổ phiếu` };
}

// params chỉ có khi có request, nên phần nội dung được stream sau khung trang
export default function TrangCoPhieu({ params }: PageProps<"/co-phieu/[ma]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 text-chu-phu">Đang tải…</div>}>
      <NoiDung params={params} />
    </Suspense>
  );
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const bangGia = await layBangGia();
  const cp = bangGia.coPhieu.find((c) => c.ma === ma);
  if (!cp) notFound();

  const nen = await layNen(ma);
  const n = nen.length;
  // Đỉnh/đáy 52 tuần (khoảng 250 phiên)
  const namQua = nen.slice(Math.max(0, n - 250));
  const dinh = Math.max(...namQua.map((x) => x.high));
  const day = Math.min(...namQua.map((x) => x.low));
  const homNay = nen[n - 1];

  const chiTiet = [
    { nhan: "Mở cửa", giaTri: giaNghin(homNay.open) },
    { nhan: "Cao nhất", giaTri: giaNghin(homNay.high) },
    { nhan: "Thấp nhất", giaTri: giaNghin(homNay.low) },
    { nhan: "Khối lượng", giaTri: khoiLuong(cp.khoiLuong) },
    { nhan: "Giá trị GD", giaTri: tyDong(cp.giaTri) },
    { nhan: "Đỉnh 52 tuần", giaTri: giaNghin(dinh) },
    { nhan: "Đáy 52 tuần", giaTri: giaNghin(day) },
    { nhan: "Ngành", giaTri: cp.nganh ?? "—" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/bang-gia" className="text-sm text-chu-phu hover:text-chu">
        ← Bảng giá
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold">{cp.ma}</h1>
            <span className="rounded-full border border-vien px-2 py-0.5 text-xs text-chu-phu">{cp.san}</span>
          </div>
          <p className="mt-1 text-chu-phu">{cp.ten}</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold tabular-nums ${mauTangGiam(cp.phanTram)}`}>{giaNghin(cp.gia)}</div>
          <div className={`tabular-nums ${mauTangGiam(cp.phanTram)}`}>
            {thayDoi(cp.thayDoi / 1000)} ({phanTram(cp.phanTram)})
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-vien p-4">
        <BieuDoNen nen={nen} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vien bg-vien sm:grid-cols-4">
        {chiTiet.map((ct) => (
          <div key={ct.nhan} className="bg-nen p-4">
            <dt className="text-xs text-chu-phu">{ct.nhan}</dt>
            <dd className="mt-1 truncate font-semibold tabular-nums">{ct.giaTri}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs text-chu-phu">Giá theo nghìn đồng, đã điều chỉnh chia tách và cổ tức.</p>
    </div>
  );
}
