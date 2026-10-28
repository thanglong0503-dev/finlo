import { layBangGia } from "@/lib/mofi";

// Trình duyệt gọi route này mỗi phút để làm mới bảng giá.
export async function GET() {
  try {
    return Response.json(await layBangGia(), {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({ loi: "Không lấy được dữ liệu" }, { status: 502 });
  }
}
