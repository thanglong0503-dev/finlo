import { connection } from "next/server";
import { layDanhSachKhac } from "@/lib/ro-ma";

// Rổ chỉ số, ngành, ETF, chứng quyền, hợp đồng tương lai cho bộ lọc danh sách mã
export async function GET() {
  await connection();
  const ds = await layDanhSachKhac();
  return Response.json(ds, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
