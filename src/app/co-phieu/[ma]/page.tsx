import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BieuDoNen } from "@/components/BieuDoNen";
import { BangMo, KhoiMo } from "@/components/KhungCho";
import { NutTheoDoi } from "@/components/NutTheoDoi";
import { TimMa } from "@/components/TimMa";
import {
  giaNghin,
  khoiLuong,
  mauGia,
  phanTram,
  soNguyen,
  thayDoi,
  trieuDong,
  tyDong,
  vonHoa,
} from "@/lib/dinh-dang";
import { NhanPhien } from "@/components/NhanPhien";
import { TaiChinh } from "@/components/TaiChinh";
import { layBangGia, layBaoCao, layHoSo, layNen, layNganh } from "@/lib/mofi";

// Báo cáo tài chính tải riêng để biểu đồ giá hiện ra trước; mã không có báo cáo thì ẩn phần này
async function PhanTaiChinh({
  ma,
  gia,
  soCoPhieu,
  peNganh,
}: {
  ma: string;
  gia: number;
  soCoPhieu: number | null;
  peNganh: number | null;
}) {
  const bc = await layBaoCao(ma);
  if (!bc || bc.quy.length === 0) return null;
  return <TaiChinh bc={bc} gia={gia} soCoPhieu={soCoPhieu} peNganh={peNganh} />;
}

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} — Giá cổ phiếu` };
}

// params chỉ có khi có request, nên phần nội dung được stream sau khung trang
export default function TrangCoPhieu({ params }: PageProps<"/co-phieu/[ma]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8">
          <KhoiMo className="h-3 w-20" />
          <div className="mt-6 flex justify-between border-b border-vien pb-5">
            <div>
              <KhoiMo className="h-3 w-28" />
              <KhoiMo className="mt-3 h-8 w-24" />
              <KhoiMo className="mt-2 h-3 w-56" />
            </div>
            <KhoiMo className="h-10 w-28" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
            <KhoiMo className="h-[470px]" />
            <KhoiMo className="h-[470px]" />
          </div>
        </div>
      }
    >
      <NoiDung params={params} />
    </Suspense>
  );
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const bangGia = await layBangGia();
  const cp = bangGia.coPhieu.find((c) => c.ma === ma);
  if (!cp) notFound();

  const [nen, hoSo, nganh] = await Promise.all([layNen(ma), layHoSo(ma), layNganh().catch(() => null)]);
  // Ngành theo phân loại của Mofi (đầy đủ hơn nhãn ngành của Sở), kèm P/E trung vị ngành để so sánh
  const khoaNganh = nganh?.maNganh[ma];
  const tenNganh = khoaNganh ? nganh?.ten[khoaNganh] : cp.nganh;
  const peNganh = khoaNganh ? (nganh?.pe[khoaNganh] ?? null) : null;
  const n = nen.length;
  // Đỉnh/đáy 52 tuần (khoảng 250 phiên)
  const namQua = nen.slice(Math.max(0, n - 250));
  const dinh = Math.max(...namQua.map((x) => x.high));
  const day = Math.min(...namQua.map((x) => x.low));
  const homNay = nen[n - 1];
  const truoc = nen[n - 2];
  const klTb20 = nen.slice(-20).reduce((s, x) => s + x.volume, 0) / Math.min(20, n);

  const nnRong = cp.nnMua != null && cp.nnBan != null ? cp.nnMua - cp.nnBan : null;
  const giaoDich: { nhan: string; giaTri: string; mau?: string }[] = [
    ...(cp.tran != null ? [{ nhan: "Trần", giaTri: giaNghin(cp.tran), mau: "text-tran" }] : []),
    { nhan: "Tham chiếu", giaTri: giaNghin(cp.thamChieu ?? truoc?.close ?? cp.gia), mau: "text-dung" },
    ...(cp.giaSan != null ? [{ nhan: "Sàn", giaTri: giaNghin(cp.giaSan), mau: "text-san-gia" }] : []),
    { nhan: "Mở cửa", giaTri: giaNghin(homNay.open) },
    { nhan: "Cao nhất", giaTri: giaNghin(homNay.high) },
    { nhan: "Thấp nhất", giaTri: giaNghin(homNay.low) },
    { nhan: "Khối lượng", giaTri: khoiLuong(cp.khoiLuong) },
    { nhan: "KL TB 20 phiên", giaTri: khoiLuong(klTb20) },
    { nhan: "Giá trị GD", giaTri: tyDong(cp.giaTri) },
    ...(nnRong != null
      ? [
          {
            nhan: "Nước ngoài ròng",
            giaTri: nnRong === 0 ? "0" : `${nnRong > 0 ? "+" : "−"}${trieuDong(Math.abs(nnRong))}`,
            mau: nnRong > 0 ? "text-tang" : nnRong < 0 ? "text-giam" : "",
          },
        ]
      : []),
    { nhan: "Vốn hoá", giaTri: vonHoa(cp.vonHoa) },
    { nhan: "Đỉnh 52 tuần", giaTri: giaNghin(dinh) },
    { nhan: "Đáy 52 tuần", giaTri: giaNghin(day) },
  ];

  const doanhNghiep = hoSo
    ? [
        { nhan: "Sàn", giaTri: cp.san },
        { nhan: "Ngành", giaTri: tenNganh ?? "—" },
        { nhan: "Vốn điều lệ", giaTri: hoSo.vonDieuLe ? tyDong(hoSo.vonDieuLe) : "—" },
        { nhan: "CP lưu hành", giaTri: hoSo.soCoPhieu ? soNguyen(hoSo.soCoPhieu) : "—" },
        {
          nhan: "Ngày GD đầu tiên",
          giaTri: hoSo.ngayGiaoDichDau ? new Date(hoSo.ngayGiaoDichDau).toLocaleDateString("vi-VN") : "—",
        },
        { nhan: "Lãnh đạo", giaTri: hoSo.lanhDao ?? "—" },
      ].filter((ct) => ct.giaTri !== "—")
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
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

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-vien pb-5">
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="border border-vien p-4">
          <BieuDoNen nen={nen} />
        </div>

        <div className="border border-vien">
          <h2 className="flex items-center gap-2 border-b border-vien px-4 py-2.5 font-semibold">
            <span className="h-3.5 w-1 bg-nhan" />
            Giao dịch
          </h2>
          <dl>
            {giaoDich.map((ct) => (
              <div key={ct.nhan} className="flex justify-between border-b border-vien px-4 py-2 last:border-b-0">
                <dt className="text-chu-phu">{ct.nhan}</dt>
                <dd className={`font-medium tabular-nums ${ct.mau ?? ""}`}>{ct.giaTri}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <Suspense fallback={<BangMo dong={8} />}>
        <PhanTaiChinh ma={cp.ma} gia={cp.gia} soCoPhieu={hoSo?.soCoPhieu ?? null} peNganh={peNganh} />
      </Suspense>

      {hoSo && (
        <section className="mt-8">
          <p className="nhan-muc">Hồ sơ doanh nghiệp</p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">{cp.ten}</h2>
          <dl className="mt-4 grid border-t border-l border-vien sm:grid-cols-2 lg:grid-cols-3">
            {doanhNghiep.map((ct) => (
              <div key={ct.nhan} className="border-r border-b border-vien p-4">
                <dt className="text-chu-phu">{ct.nhan}</dt>
                <dd className="mt-1 font-semibold tabular-nums">{ct.giaTri}</dd>
              </div>
            ))}
          </dl>
          {(hoSo.diaChi || hoSo.website) && (
            <p className="mt-3 text-chu-phu">
              {hoSo.diaChi}
              {hoSo.website && (
                <>
                  {" · "}
                  <a
                    href={hoSo.website.startsWith("http") ? hoSo.website : `https://${hoSo.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-nhan hover:underline"
                  >
                    {hoSo.website}
                  </a>
                </>
              )}
            </p>
          )}
        </section>
      )}

      <p className="mt-6 text-[11px] text-chu-phu">Giá theo nghìn đồng, đã điều chỉnh chia tách và cổ tức.</p>
    </div>
  );
}
