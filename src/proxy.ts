import { NextResponse, type NextRequest } from "next/server";

// Bảo vệ /api: chỉ trả dữ liệu cho chính các trang Finlo (và MCP nội bộ có khoá), kèm giới hạn tần suất theo IP.
// Không chặn tuyệt đối được người cố tình giả mạo, nhưng chặn được việc cào dữ liệu hàng loạt dễ dàng và giữ hạn mức Vercel.

const TEN_MIEN = new Set(["www.finlo.id.vn", "finlo.id.vn"]);
const laTenMienFinlo = (host: string) =>
  TEN_MIEN.has(host) || host.endsWith(".vercel.app") || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);

const hostCua = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

// Đếm trong bộ nhớ của từng máy chủ: gần đúng nhưng đủ chặn script gọi dồn dập; Vercel Firewall là lớp chặn chính xác hơn
const CUA_SO = 60_000;
const TOI_DA = 120;
const dem = new Map<string, { tu: number; so: number }>();

function vuotGioiHan(ip: string, luc: number) {
  const x = dem.get(ip);
  if (!x || luc - x.tu > CUA_SO) {
    if (dem.size > 5000) dem.clear();
    dem.set(ip, { tu: luc, so: 1 });
    return false;
  }
  x.so += 1;
  return x.so > TOI_DA;
}

const tuChoi = (thongBao: string, ma: number) =>
  NextResponse.json({ loi: thongBao }, { status: ma, headers: { "Cache-Control": "no-store" } });

export function proxy(req: NextRequest) {
  // MCP nội bộ của chủ Finlo: mã khoá đặt trong biến môi trường FINLO_KHOA_API trên Vercel
  const khoa = process.env.FINLO_KHOA_API;
  if (khoa && req.headers.get("x-finlo-khoa") === khoa) return NextResponse.next();

  // Trình duyệt tự gắn Sec-Fetch-Site (trang web không sửa được); thêm Origin/Referer cho trình duyệt cũ
  const cungTrang = req.headers.get("sec-fetch-site") === "same-origin";
  const nguon = hostCua(req.headers.get("origin")) ?? hostCua(req.headers.get("referer"));
  if (!cungTrang && !(nguon && laTenMienFinlo(nguon)))
    return tuChoi("Dữ liệu chỉ dùng trên www.finlo.id.vn. Muốn hợp tác dữ liệu, xem www.finlo.id.vn/doi-tac", 403);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "khong-ro";
  if (vuotGioiHan(ip, Date.now())) return tuChoi("Bạn đang tải quá nhanh, vui lòng thử lại sau một phút.", 429);

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
