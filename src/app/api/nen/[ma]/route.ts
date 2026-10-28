import { connection } from "next/server";
import { layNen } from "@/lib/mofi";

// Nến ngày của một mã cổ phiếu cho biểu đồ tương tác (giá theo đồng)
export async function GET(_: Request, { params }: RouteContext<"/api/nen/[ma]">) {
  await connection();
  const { ma } = await params;
  try {
    const nen = await layNen(ma.toUpperCase());
    return Response.json(nen, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({ loi: "Không có dữ liệu nến cho mã này" }, { status: 404 });
  }
}
