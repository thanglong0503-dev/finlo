import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import duLieu from "@/data/quet-tin-hieu.json";
import { giaNghin, mauTangGiam, phanTram, tyDong } from "@/lib/dinh-dang";
import { LOAI, type KetQuaQuetTinHieu, type LoaiTinHieu } from "@/lib/quet-tin-hieu";

export const metadata: Metadata = {
  title: "Quét tín hiệu kỹ thuật",
  description:
    "Cổ phiếu quá mua, quá bán, giao cắt MA, vượt MA200, đỉnh đáy 52 tuần, khối lượng đột biến và mẫu hình nến trên toàn thị trường.",
};

export default function TrangQuetTinHieu({ searchParams }: PageProps<"/quet-tin-hieu">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-12">
      <p className="nhan-muc">Phân tích kỹ thuật</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">Quét tín hiệu toàn thị trường</h1>
      <p className="mt-2 max-w-3xl text-chu-phu">
        Mỗi ngày sau phiên Finlo quét nến ngày của các mã thanh khoản trên 2 tỷ đồng/phiên và lọc ra những mã vừa có tín hiệu kỹ
        thuật. Đây là kết quả máy tính theo quy tắc cố định, không phải khuyến nghị đầu tư.
      </p>
      <Suspense
        fallback={
          <div className="mt-6">
            <LuoiMo so={8} />
            <BangMo dong={10} />
          </div>
        }
      >
        <NoiDung searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const MAU_HUONG = { tang: "text-tang", giam: "text-giam", trung: "text-dung" } as const;
const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

async function NoiDung({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const loai = LOAI.find((l) => l.k === sp.loai)?.k ?? null;
  const kq = duLieu as unknown as KetQuaQuetTinHieu;

  const dem = (k: LoaiTinHieu) => kq.ds.filter((d) => d.chiTiet[k]).length;
  const coTin = kq.ds.filter((d) => Object.keys(d.chiTiet).length > 0);
  const ds = loai ? kq.ds.filter((d) => d.chiTiet[loai]) : coTin;
  const chon = LOAI.find((l) => l.k === loai);

  return (
    <>
      <p className="mt-4 text-[12px] text-chu-phu">
        Dữ liệu đến phiên {ngayVN(kq.ngay)} · {kq.soMa} mã được quét · {coTin.length} mã có tín hiệu
      </p>

      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vien bg-vien sm:grid-cols-3 lg:grid-cols-5">
        <Link href="/quet-tin-hieu" className={`p-3 ${loai == null ? "bg-nhan-nhat" : "bg-nen hover:bg-nen-phu"}`}>
          <p className="text-[12px] text-chu-phu">Tất cả</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">{coTin.length}</p>
        </Link>
        {LOAI.map((l) => (
          <Link
            key={l.k}
            href={`/quet-tin-hieu?loai=${l.k}`}
            className={`p-3 ${loai === l.k ? "bg-nhan-nhat" : "bg-nen hover:bg-nen-phu"}`}
          >
            <p className={`text-[12px] font-medium ${MAU_HUONG[l.huong]}`}>{l.ten}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">{dem(l.k)}</p>
          </Link>
        ))}
        {/* 14 ô: thêm 1 ô trống cho tròn hàng ở lưới 3 và 5 cột */}
        <div className="hidden bg-nen sm:block" />
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-vien">
        <h2 className="border-b border-vien px-4 py-2.5 font-semibold">
          {chon ? chon.ten : "Mọi mã có tín hiệu"}
          <span className="ml-2 text-[12px] font-normal text-chu-phu">
            {chon ? chon.moTa : "xếp theo giá trị giao dịch bình quân 20 phiên"}
          </span>
        </h2>
        {ds.length === 0 ? (
          <p className="px-4 py-6 text-chu-phu">Phiên này không có mã nào cho tín hiệu này.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-vien text-left text-[12px] text-chu-phu">
                  <th className="px-4 py-2 font-medium">Mã</th>
                  <th className="px-3 py-2 text-right font-medium">Giá</th>
                  <th className="px-3 py-2 text-right font-medium">%</th>
                  <th className="px-3 py-2 text-right font-medium">RSI 14</th>
                  <th className="px-3 py-2 text-right font-medium">GTGD TB 20</th>
                  <th className="px-4 py-2 font-medium">Tín hiệu</th>
                </tr>
              </thead>
              <tbody>
                {ds.map((d) => (
                  <tr key={d.ma} className="border-b border-vien last:border-b-0 hover:bg-nen-phu">
                    <td className="px-4 py-2">
                      <Link href={`/co-phieu/${d.ma}/ky-thuat`} className="font-semibold hover:text-nhan">
                        {d.ma}
                      </Link>
                      <span className="ml-2 text-[11px] text-chu-phu">{d.san}</span>
                      <span className="block max-w-[220px] truncate text-[11px] text-chu-phu">{d.ten}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{giaNghin(d.gia)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${mauTangGiam(d.phanTram)}`}>{phanTram(d.phanTram)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {d.rsi == null ? "—" : d.rsi.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{tyDong(d.giaTriTb20)}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {LOAI.filter((l) => d.chiTiet[l.k]).map((l) => (
                          <span
                            key={l.k}
                            title={d.chiTiet[l.k]}
                            className={`rounded border px-1.5 py-0.5 text-[11px] ${
                              l.k === loai ? "border-nhan" : "border-vien"
                            } ${MAU_HUONG[l.huong]}`}
                          >
                            {l.ten}
                            {l.k === loai && <span className="ml-1 text-chu-phu">· {d.chiTiet[l.k]}</span>}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
