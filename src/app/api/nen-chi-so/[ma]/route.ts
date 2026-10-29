import { connection } from "next/server";
import { layNenChiSo } from "@/lib/mofi";

// Giá đóng cửa theo ngày của một chỉ số (VNINDEX, VN30, HNX, HNX30, UPCOM) cho trang so sánh
export async function GET(_: Request, { params }: RouteContext<"/api/nen-chi-so/[ma]">) {
  await connection();
  const cs = await layNenChiSo((await params).ma.toUpperCase());
  if (!cs) return Response.json({ loi: "Không có chỉ số này" }, { status: 404 });
  return Response.json(
    cs.nen.map((x) => [x.time, x.close / 1000]),
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } },
  );
}
