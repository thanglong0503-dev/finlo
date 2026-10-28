import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { mauTangGiam, phanTram, tyDong, vonHoa } from "@/lib/dinh-dang";
import { layBangGia, layNganh } from "@/lib/mofi";
import { mauNhiet, tongHopNganh } from "@/lib/nganh";

export const metadata: Metadata = { title: "Ngành" };

export default function TrangNganh() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Ngành</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Diễn biến theo ngành</h1>
      <p className="mt-1 text-chu-phu">
        Mỗi ô là một ngành, màu theo % thay đổi bình quân theo vốn hoá. Bấm vào ngành để xem các mã.
      </p>
      <Suspense
        fallback={
          <>
            <LuoiMo so={12} />
            <BangMo dong={12} />
          </>
        }
      >
        <NoiDung />
      </Suspense>
    </div>
  );
}

async function NoiDung() {
  await connection();
  const [bangGia, nganh] = await Promise.all([layBangGia(), layNganh()]);
  const ds = tongHopNganh(bangGia.coPhieu, nganh);

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-px border border-vien bg-vien sm:grid-cols-4 lg:grid-cols-6">
        {ds.map((n) => (
          <Link
            key={n.khoa}
            href={`/nganh/${n.khoa}`}
            style={{ background: mauNhiet(n.phanTram) }}
            className="flex min-h-[84px] flex-col justify-between p-3 hover:outline-2 hover:-outline-offset-2 hover:outline-nhan"
          >
            <span className="line-clamp-2 font-semibold">{n.ten}</span>
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold tabular-nums">{phanTram(n.phanTram)}</span>
              <span className="text-[11px] opacity-70">{n.soMa} mã</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto border border-vien border-t-2 border-t-nhan">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-vien text-[10px] font-bold tracking-wider text-chu-phu uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Ngành</th>
              <th className="px-3 py-2 text-right">+/- %</th>
              <th className="px-3 py-2 text-right">Tăng / Giảm</th>
              <th className="px-3 py-2 text-right">P/E ngành</th>
              <th className="px-3 py-2 text-right">Giá trị GD</th>
              <th className="px-3 py-2 text-right">Vốn hoá</th>
              <th className="px-3 py-2 text-left">Mã lớn nhất</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((n) => (
              <tr key={n.khoa} className="border-t border-vien hover:bg-nhan-nhat">
                <td className="px-3 py-2">
                  <Link href={`/nganh/${n.khoa}`} className="font-semibold hover:underline">
                    {n.ten}
                  </Link>
                  <span className="ml-2 text-[11px] text-chu-phu">{n.soMa} mã</span>
                </td>
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${mauTangGiam(n.phanTram)}`}>
                  {phanTram(n.phanTram)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span className="text-tang">{n.soTang}</span>
                  <span className="text-chu-phu"> / </span>
                  <span className="text-giam">{n.soGiam}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {n.pe != null ? n.pe.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{tyDong(n.giaTri)}</td>
                <td className="px-3 py-2 text-right text-chu-phu tabular-nums">{vonHoa(n.vonHoa)}</td>
                <td className="px-3 py-2">
                  {n.coPhieu.slice(0, 3).map((cp) => (
                    <Link key={cp.ma} href={`/co-phieu/${cp.ma}`} className="mr-2 font-medium hover:underline">
                      {cp.ma}
                    </Link>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-chu-phu">
        Phân ngành và P/E trung vị ngành theo Mofi (bỏ mã lỗ và P/E trên 200 lần).
      </p>
    </>
  );
}
