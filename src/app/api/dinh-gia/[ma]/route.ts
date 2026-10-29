import { connection } from "next/server";
import { layBaoCao, layHoSo, layNganh } from "@/lib/mofi";
import { mocDinhGia } from "@/lib/tai-chinh";

// Dữ liệu cho chỉ báo FL Giá trị: mốc EPS/BVPS theo quý (theo ngày công bố) và P/E trung vị ngành
export async function GET(_: Request, { params }: RouteContext<"/api/dinh-gia/[ma]">) {
  await connection();
  const ma = (await params).ma.toUpperCase();
  const [bc, hoSo, nganh] = await Promise.all([layBaoCao(ma), layHoSo(ma), layNganh().catch(() => null)]);
  if (!bc || !hoSo?.soCoPhieu) return Response.json({ loi: "Không có báo cáo tài chính cho mã này" }, { status: 404 });
  const khoa = nganh?.maNganh[ma];
  return Response.json(
    {
      loai: bc.loai,
      moc: mocDinhGia(bc, hoSo.soCoPhieu),
      peNganh: khoa ? (nganh?.pe[khoa] ?? null) : null,
      tenNganh: khoa ? (nganh?.ten[khoa] ?? null) : null,
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
