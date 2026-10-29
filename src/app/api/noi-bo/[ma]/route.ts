import { connection } from "next/server";
import { layNoiBo } from "@/lib/mofi";

// Giao dịch nội bộ đã thực hiện của một mã, gọn cho dấu trên biểu đồ
export async function GET(_: Request, { params }: RouteContext<"/api/noi-bo/[ma]">) {
  await connection();
  const ma = (await params).ma.toUpperCase();
  const nb = await layNoiBo(ma);
  return Response.json(
    (nb?.dong ?? []).filter((d) => d.daXong).map((d) => ({ ngay: d.ngay, mua: d.mua, soCp: d.soCp, toChuc: d.toChuc })),
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
