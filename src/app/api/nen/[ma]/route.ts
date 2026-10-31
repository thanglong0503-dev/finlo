import { connection } from "next/server";
import { layNen } from "@/lib/mofi";
import { layNenKhac, laPhaiSinh } from "@/lib/ro-ma";

// Nến ngày của một mã cổ phiếu, ETF, chứng quyền hoặc hợp đồng tương lai cho biểu đồ tương tác (giá theo đồng)
export async function GET(_: Request, { params }: RouteContext<"/api/nen/[ma]">) {
  await connection();
  const ma = (await params).ma.toUpperCase();
  try {
    // Cổ phiếu từ Mofi; hợp đồng tương lai, ETF, chứng quyền lấy nguồn khác
    const nen = laPhaiSinh(ma) ? await layNenKhac(ma) : await layNen(ma).catch(() => layNenKhac(ma));
    if (!nen?.length) throw new Error();
    return Response.json(nen, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({ loi: "Không có dữ liệu nến cho mã này" }, { status: 404 });
  }
}
