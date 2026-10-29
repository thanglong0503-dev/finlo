import Link from "next/link";
import { mauKetLuan } from "@/components/KyThuat";
import { soNguyen, tyDong } from "@/lib/dinh-dang";
import { phanTichKyThuat } from "@/lib/ky-thuat";
import { layHoSoDoanhNghiep, layNoiBo, layTaiChinhToanThiTruong, type Nen } from "@/lib/mofi";

const so2 = (x: number) => x.toLocaleString("vi-VN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

// Bốn thẻ tóm tắt ở tab Tổng quan, mỗi thẻ dẫn sang tab chi tiết tương ứng
export async function TomTat({
  ma,
  nen,
  vonHoa,
  peNganh,
  tenNganh,
}: {
  ma: string;
  nen: Nen[];
  vonHoa: number | null;
  peNganh: number | null;
  tenNganh: string | null;
}) {
  const [tc, noiBo, hoSo] = await Promise.all([
    layTaiChinhToanThiTruong().catch(() => null),
    layNoiBo(ma),
    layHoSoDoanhNghiep(ma),
  ]);
  const kt = nen.length >= 30 ? phanTichKyThuat(nen) : null;

  const lnst = tc?.[ma]?.lnst ?? null;
  const pe = vonHoa != null && lnst != null && lnst > 0 ? vonHoa / (lnst * 1e6) : null;

  // Nội bộ 12 tháng tính đến lần cập nhật dữ liệu: chỉ tính giao dịch đã thực hiện xong
  const moc = noiBo ? new Date(Date.parse(noiBo.capNhat) - 365 * 864e5).toISOString().slice(0, 10) : "";
  const gd = (noiBo?.dong ?? []).filter((d) => d.daXong && d.ngay >= moc);
  const rongCp = gd.reduce((s, d) => s + (d.mua ? d.soCp : -d.soCp), 0);

  const kd = hoSo?.kinhDoanh ?? [];
  const lnNam = (i: number) => kd[kd.length - 1 - i]?.chiTieu.find((c) => c.khoa === "sauThue")?.gt ?? null;
  const lnMoi = lnNam(0);
  const lnTruoc = lnNam(1);
  const tangLn = lnMoi != null && lnTruoc != null && lnTruoc > 0 ? (lnMoi / lnTruoc - 1) * 100 : null;

  const the = [
    {
      href: `/co-phieu/${ma}/ky-thuat`,
      nhan: "Phân tích kỹ thuật",
      chinh: kt ? kt.tong.ketLuan : "—",
      mau: kt ? mauKetLuan(kt.tong.ketLuan) : "",
      phu: kt ? `${kt.tong.mua} mua · ${kt.tong.ban} bán · ${kt.tong.trung} trung tính` : "Chưa đủ dữ liệu",
    },
    {
      href: `/co-phieu/${ma}/so-sanh`,
      nhan: "So sánh ngành",
      chinh: pe != null ? `P/E ${so2(pe)}` : "P/E —",
      mau: pe != null && peNganh != null ? (pe < peNganh ? "text-tang" : "text-giam") : "",
      phu: peNganh != null ? `Trung vị ${tenNganh ?? "ngành"}: ${so2(peNganh)}` : "Chưa có P/E ngành",
    },
    {
      href: `/co-phieu/${ma}/noi-bo`,
      nhan: "Giao dịch nội bộ 12 tháng",
      chinh: gd.length === 0 ? "Không có" : `${rongCp >= 0 ? "Mua ròng" : "Bán ròng"} ${soNguyen(Math.abs(rongCp))} cp`,
      mau: gd.length === 0 ? "" : rongCp >= 0 ? "text-tang" : "text-giam",
      phu: `${gd.length} giao dịch đã thực hiện`,
    },
    {
      href: `/co-phieu/${ma}/ho-so`,
      nhan: `Lợi nhuận năm ${kd[kd.length - 1]?.nam ?? ""}`,
      chinh: lnMoi != null ? tyDong(lnMoi) : "—",
      mau: tangLn == null ? "" : tangLn >= 0 ? "text-tang" : "text-giam",
      phu:
        tangLn != null
          ? `${tangLn >= 0 ? "+" : "−"}${so2(Math.abs(tangLn))}% so với năm trước`
          : "Xem hồ sơ doanh nghiệp",
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-1 gap-px border border-vien bg-vien sm:grid-cols-2 lg:grid-cols-4">
      {the.map((t) => (
        <Link key={t.href} href={t.href} className="group bg-nen p-4 hover:bg-nhan-nhat">
          <p className="flex items-center justify-between text-chu-phu">
            {t.nhan}
            <span className="text-nhan opacity-0 transition-opacity group-hover:opacity-100">→</span>
          </p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${t.mau}`}>{t.chinh}</p>
          <p className="mt-0.5 text-[12px] text-chu-phu tabular-nums">{t.phu}</p>
        </Link>
      ))}
    </div>
  );
}
