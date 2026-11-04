import { connection } from "next/server";
import { layNganh } from "@/lib/mofi";

// Mã thuộc ngành nào, cho Danh mục cá nhân. Phân loại rất ít đổi nên lưu đệm một ngày.
export async function GET() {
  await connection();
  try {
    const { ten, maNganh } = await layNganh();
    return Response.json({ ten, maNganh }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return Response.json({ loi: "Không lấy được dữ liệu" }, { status: 502 });
  }
}
