import { connection } from "next/server";
import { layBangTienSo } from "@/lib/mofi";

// Top tiền số theo vốn hoá cho danh sách chọn mã trên trang biểu đồ
export async function GET() {
  await connection();
  try {
    const bang = await layBangTienSo(30);
    return Response.json(bang.ds, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({ loi: "Không lấy được dữ liệu" }, { status: 502 });
  }
}
