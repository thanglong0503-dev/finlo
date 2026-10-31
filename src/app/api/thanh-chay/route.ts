import { connection } from "next/server";
import { layBangGia, layBangVang, layChiSo } from "@/lib/mofi";

export type MucChay = { nhan: string; gia: string; phanTram: number | null; href: string };

// Dải giá chạy ngang dưới header: chỉ số, vàng và các cổ phiếu giao dịch sôi động nhất.
// Tiền số trình duyệt lấy thẳng từ Binance (giá từng giây).
export async function GET() {
  await connection();
  const [chiSo, bangGia, vang] = await Promise.all([
    layChiSo().catch(() => []),
    layBangGia().catch(() => null),
    layBangVang().catch(() => null),
  ]);
  const so = (x: number, le = 2) => x.toLocaleString("vi-VN", { minimumFractionDigits: le, maximumFractionDigits: le });
  const ds: MucChay[] = chiSo.map((c) => ({
    nhan: c.ma === "VNINDEX" ? "VN-Index" : c.ma,
    gia: so(c.diem),
    phanTram: c.phanTram,
    href: c.ma === "VNINDEX" ? "/chi-so" : `/chi-so/${c.ma}`,
  }));
  if (vang?.theGioi.usdOz)
    ds.push({ nhan: "Vàng thế giới", gia: `$${so(vang.theGioi.usdOz, 1)}`, phanTram: null, href: "/kim-loai-quy" });
  const soiDong = [...(bangGia?.coPhieu ?? [])].sort((a, b) => b.giaTri - a.giaTri).slice(0, 14);
  for (const cp of soiDong) ds.push({ nhan: cp.ma, gia: so(cp.gia / 1000), phanTram: cp.phanTram, href: `/co-phieu/${cp.ma}` });

  return Response.json(ds, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
