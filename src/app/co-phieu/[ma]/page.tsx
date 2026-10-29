import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BieuDoNen } from "@/components/BieuDoNen";
import { KhoiMo, LuoiMo } from "@/components/KhungCho";
import { TomTat } from "@/components/TomTatMa";
import { giaNghin, khoiLuong, trieuDong, tyDong, vonHoa } from "@/lib/dinh-dang";
import { layBangGia, layNen, layNganh, layTin } from "@/lib/mofi";

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} — Tổng quan cổ phiếu` };
}

// params chỉ có khi có request, nên phần nội dung được stream sau khung trang
export default function TrangCoPhieu({ params }: PageProps<"/co-phieu/[ma]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 lg:grid-cols-[1fr_300px]">
          <KhoiMo className="h-[470px]" />
          <KhoiMo className="h-[470px]" />
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

  const [nen, nganh, tinTuc] = await Promise.all([
    layNen(ma),
    layNganh().catch(() => null),
    layTin().catch(() => null),
  ]);
  const tinMa = (tinTuc?.tin ?? []).filter((t) => t.ma === ma).slice(0, 8);
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

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="border border-vien p-4 rounded-2xl overflow-hidden">
          <BieuDoNen nen={nen} />
        </div>

        <div className="border border-vien rounded-2xl overflow-hidden">
          <h2 className="flex items-center gap-2 border-b border-vien px-4 py-2.5 font-semibold">
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

      <Suspense fallback={<LuoiMo so={4} />}>
        <TomTat ma={cp.ma} nen={nen} vonHoa={cp.vonHoa} peNganh={peNganh} tenNganh={tenNganh ?? null} />
      </Suspense>

      {tinMa.length > 0 && (
        <section className="mt-8">
          <p className="nhan-muc">Tin doanh nghiệp</p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Công bố gần đây của {cp.ma}</h2>
          <ul className="mt-4 border border-vien rounded-2xl overflow-hidden">
            {tinMa.map((t, i) => (
              <li key={i} className="flex gap-3 border-b border-vien px-3 py-2.5 last:border-b-0">
                <span className="w-20 shrink-0 text-chu-phu tabular-nums">{t.ngay.split("-").reverse().join("/")}</span>
                <div className="min-w-0 flex-1">
                  <p className={t.mucDo === "cao" ? "font-semibold" : ""}>{t.tieuDe}</p>
                  <span className="mt-1 inline-block border border-vien px-1.5 text-[11px] text-chu-phu rounded-md">{t.loai}</span>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/tin-tuc" className="mt-2 inline-block font-medium text-nhan hover:underline">
            Tất cả tin doanh nghiệp →
          </Link>
        </section>
      )}

      <p className="mt-6 text-[11px] text-chu-phu">Giá theo nghìn đồng, đã điều chỉnh chia tách và cổ tức.</p>
    </div>
  );
}
