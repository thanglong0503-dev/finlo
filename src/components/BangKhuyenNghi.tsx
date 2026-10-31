import Link from "next/link";
import { giaNghin } from "@/lib/dinh-dang";
import { TEN_NHOM, TEN_TRANG_THAI, linkGoc, nhomCua, type BaoCaoKN, type Nhom, type TrangThai } from "@/lib/khuyen-nghi";

// Bảng báo cáo khuyến nghị của CTCK kèm kết quả chấm theo giá (dùng ở trang Khuyến nghị và tab Phân tích của mã)

export const so = (x: number | null, le = 1) =>
  x == null || !Number.isFinite(x) ? "—" : x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le });
export const ptDau = (x: number | null) => (x == null ? "—" : `${x > 0 ? "+" : x < 0 ? "−" : ""}${so(Math.abs(x))}%`);
export const mau = (x: number | null) => (x == null ? "" : x > 0 ? "text-tang" : x < 0 ? "text-giam" : "");
const ngayVN = (s: string) => s.split("-").reverse().join("/");

export const MAU_NHOM: Record<Nhom, string> = { mua: "bg-tang/15 text-tang", giu: "bg-nen-noi text-chu-phu", ban: "bg-giam/15 text-giam" };
const MAU_TT: Record<TrangThai, string> = { dat: "text-tang", "cat-lo": "text-giam", "het-han": "text-chu", dang: "text-chu-phu" };

export function BangBaoCao({ ds, giaNay, anMa }: { ds: BaoCaoKN[]; giaNay: Map<string, number>; anMa?: boolean }) {
  if (!ds.length) return <p className="mt-4 text-chu-phu">Không có báo cáo phù hợp.</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-vien">
      <table className="w-full min-w-[820px] text-[13px] tabular-nums">
        <thead className="text-chu-phu">
          <tr className="border-b border-vien">
            <th className="px-3 py-2 text-left font-medium">Ngày</th>
            {!anMa && <th className="px-3 py-2 text-left font-medium">Mã</th>}
            <th className="px-3 py-2 text-left font-medium">CTCK</th>
            <th className="px-3 py-2 text-left font-medium">Khuyến nghị</th>
            <th className="px-3 py-2 text-right font-medium">Giá mục tiêu</th>
            <th className="px-3 py-2 text-right font-medium">Upside</th>
            <th className="px-3 py-2 text-left font-medium">Kết quả</th>
            <th className="px-3 py-2 text-right font-medium">Lãi lỗ</th>
            <th className="px-3 py-2 text-right font-medium">Vượt VN-Index</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {ds.map((b) => {
            const n = nhomCua(b);
            const gia = giaNay.get(b.ma);
            return (
              <tr key={b.id} className="border-b border-vien last:border-0 hover:bg-nen-phu" title={b.tieuDe}>
                <td className="px-3 py-2 whitespace-nowrap text-chu-phu">{ngayVN(b.ngay)}</td>
                {!anMa && (
                  <td className="px-3 py-2 font-semibold">
                    <Link href={`/co-phieu/${b.ma}/phan-tich#khuyen-nghi`} className="hover:text-nhan">
                      {b.ma}
                    </Link>
                  </td>
                )}
                <td className="px-3 py-2">{b.ctck}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {n ? (
                    <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${MAU_NHOM[n]}`} title={b.khuyenNghi ? undefined : "Suy theo giá mục tiêu"}>
                      {b.khuyenNghi ? b.khuyenNghi.charAt(0) + b.khuyenNghi.slice(1).toLowerCase() : `${TEN_NHOM[n]}*`}
                    </span>
                  ) : (
                    <span className="text-chu-phu">Cập nhật</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {b.gia ? giaNghin(b.gia) : "—"}
                  {b.giaPH && b.kq?.trangThai !== "dang" ? (
                    <span className="block text-[11px] text-chu-phu">giá lúc đó {giaNghin(b.giaPH)}</span>
                  ) : null}
                  {b.gia && gia && b.kq?.trangThai === "dang" ? (
                    <span className="block text-[11px] text-chu-phu">còn {ptDau((b.gia / gia - 1) * 100)}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right text-chu-phu">{ptDau(b.kq?.upside ?? b.upside)}</td>
                <td className={`px-3 py-2 whitespace-nowrap ${b.kq ? MAU_TT[b.kq.trangThai] : "text-chu-phu"}`}>
                  {b.kq ? (
                    <>
                      {TEN_TRANG_THAI[b.kq.trangThai]}
                      <span className="block text-[11px] text-chu-phu">
                        {b.kq.trangThai === "dang" ? `${b.kq.soNgay} ngày` : `${ngayVN(b.kq.ngayKet)} · ${b.kq.soNgay} ngày`}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`px-3 py-2 text-right ${mau(b.kq?.loiNhuan ?? null)}`}>{ptDau(b.kq?.loiNhuan ?? null)}</td>
                <td className={`px-3 py-2 text-right ${mau(b.kq?.vuotChiSo ?? null)}`}>{ptDau(b.kq?.vuotChiSo ?? null)}</td>
                <td className="px-3 py-2 text-right">
                  <a href={linkGoc(b)} target="_blank" rel="noopener noreferrer" className="text-[12px] text-nhan hover:underline">
                    Bài gốc ↗
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
