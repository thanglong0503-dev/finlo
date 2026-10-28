import { connection } from "next/server";
import { layBangGia } from "@/lib/mofi";

// Danh sách mã gọn (mã, tên, sàn) cho ô tra cứu; nhẹ hơn nhiều so với /api/bang-gia
export async function GET() {
  await connection();
  try {
    const { coPhieu } = await layBangGia();
    return Response.json(
      coPhieu.map((cp) => ({ ma: cp.ma, ten: cp.ten, san: cp.san })),
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return Response.json({ loi: "Không lấy được dữ liệu" }, { status: 502 });
  }
}
