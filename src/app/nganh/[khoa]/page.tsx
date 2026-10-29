import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { NutTheoDoi } from "@/components/NutTheoDoi";
import { giaNghin, mauTangGiam, phanTram, tyDong, vonHoa } from "@/lib/dinh-dang";
import { layBangGia, layNganh } from "@/lib/mofi";
import { tongHopNganh } from "@/lib/nganh";

export async function generateMetadata({ params }: PageProps<"/nganh/[khoa]">): Promise<Metadata> {
  const { khoa } = await params;
  const nganh = await layNganh();
  return { title: nganh.ten[khoa] ? `Ngành ${nganh.ten[khoa]}` : "Ngành" };
}

export default function TrangMotNganh({ params }: PageProps<"/nganh/[khoa]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/nganh" className="text-chu-phu hover:text-chu">
        ← Tất cả ngành
      </Link>
      <Suspense
        fallback={
          <>
            <LuoiMo so={5} cot="md:grid-cols-5" />
            <BangMo dong={12} />
          </>
        }
      >
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

async function NoiDung({ params }: { params: Promise<{ khoa: string }> }) {
  const { khoa } = await params;
  const [bangGia, nganh] = await Promise.all([layBangGia(), layNganh()]);
  const n = tongHopNganh(bangGia.coPhieu, nganh).find((x) => x.khoa === khoa);
  if (!n) notFound();

  const the = [
    { nhan: "Thay đổi bình quân", giaTri: phanTram(n.phanTram), mau: n.phanTram },
    { nhan: "Số mã", giaTri: String(n.soMa) },
    { nhan: "Tăng / Giảm", giaTri: `${n.soTang} / ${n.soGiam}` },
    { nhan: "P/E trung vị ngành", giaTri: n.pe != null ? n.pe.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) : "—" },
    { nhan: "Tổng vốn hoá", giaTri: vonHoa(n.vonHoa) },
  ];

  return (
    <>
      <p className="nhan-muc mt-4">Ngành</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">{n.ten}</h1>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vien bg-vien md:grid-cols-5">
        {the.map((t) => (
          <div key={t.nhan} className="bg-nen p-4">
            <p className="text-chu-phu">{t.nhan}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${t.mau != null ? mauTangGiam(t.mau) : ""}`}>
              {t.giaTri}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto border border-vien rounded-2xl">
        <table className="w-full">
          <thead className="border-b border-vien text-[12px] font-medium text-chu-phu">
            <tr>
              <th className="w-8 py-2 pl-2" aria-label="Theo dõi" />
              <th className="px-3 py-2 text-left">Mã</th>
              <th className="px-3 py-2 text-right">Giá</th>
              <th className="px-3 py-2 text-right">+/- %</th>
              <th className="hidden px-3 py-2 text-right sm:table-cell">Giá trị GD</th>
              <th className="px-3 py-2 text-right">Vốn hoá</th>
              <th className="hidden px-3 py-2 text-right sm:table-cell">Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            {n.coPhieu.map((cp) => (
              <tr key={cp.ma} className="border-t border-vien hover:bg-nhan-nhat">
                <td className="py-2 pl-2">
                  <NutTheoDoi ma={cp.ma} gon />
                </td>
                <td className="max-w-[14rem] px-3 py-2 sm:max-w-sm">
                  <Link href={`/co-phieu/${cp.ma}`} className="block">
                    <span className="font-semibold">{cp.ma}</span>
                    <span className="ml-2 text-[11px] text-chu-phu">{cp.san}</span>
                    <div className="truncate text-[11px] text-chu-phu">{cp.ten}</div>
                  </Link>
                </td>
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${mauTangGiam(cp.phanTram)}`}>
                  {giaNghin(cp.gia)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${mauTangGiam(cp.phanTram)}`}>
                  {phanTram(cp.phanTram)}
                </td>
                <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{tyDong(cp.giaTri)}</td>
                <td className="px-3 py-2 text-right text-chu-phu tabular-nums">{vonHoa(cp.vonHoa)}</td>
                <td className="hidden px-3 py-2 text-right text-chu-phu tabular-nums sm:table-cell">
                  {cp.vonHoa && n.vonHoa
                    ? `${((cp.vonHoa / n.vonHoa) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
