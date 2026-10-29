import { connection } from "next/server";
import { taoDongLoc } from "@/lib/bo-loc";
import { layBangGia, layNganh, layTaiChinhToanThiTruong } from "@/lib/mofi";

// Dữ liệu bộ lọc (giá trong phiên + chỉ số tài chính) để trang bộ lọc làm mới mỗi phút
export async function GET() {
  await connection();
  try {
    const [bangGia, tc, nganh] = await Promise.all([layBangGia(), layTaiChinhToanThiTruong(), layNganh()]);
    return Response.json(
      { phien: bangGia.phien, dong: taoDongLoc(bangGia.coPhieu, tc, nganh) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
    );
  } catch {
    return Response.json({ loi: "Không lấy được dữ liệu" }, { status: 502 });
  }
}
