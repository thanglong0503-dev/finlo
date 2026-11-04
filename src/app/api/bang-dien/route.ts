import { connection } from "next/server";
import { layBangDienVn30 } from "@/lib/bang-dien-may-chu";

// Đường dự phòng của bảng điện VN30: chỉ dùng khi trình duyệt không lấy thẳng được file từ Mofi
export async function GET() {
  await connection();
  const kq = await layBangDienVn30().catch(() => null);
  if (!kq) return Response.json({ loi: "Không lấy được dữ liệu" }, { status: 502 });
  return Response.json(kq, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
